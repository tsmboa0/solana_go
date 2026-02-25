// ============================================================
// Dice Scene — Solvestor (SWS)
// ============================================================
// Rapier-powered 3D dice with realistic rigid-body physics.
// Dice are thrown from board center toward the active player's
// token. CuboidColliders give proper edge/corner tumbling.
// Result is biased by initial rotation so the correct face
// tends to land up.
// ============================================================

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
    RigidBody,
    CuboidCollider,
    type RapierRigidBody,
} from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { TILE_LAYOUTS } from '@/utils/boardLayout';
import {
    DICE_SIZE,
    DICE_GAP,
    DICE_DOT_RADIUS,
    DICE_THROW_HEIGHT,
    DICE_REST_HEIGHT,
    DICE_TILE_MARGIN,
    DICE_RESTITUTION,
    DICE_FRICTION,
    DICE_IMPULSE_STRENGTH,
    DICE_UPWARD_IMPULSE_BASE,
    DICE_UPWARD_IMPULSE_VAR,
    DICE_LATERAL_IMPULSE,
    DICE_TORQUE_STRENGTH,
} from '@/config/game';
import { MATERIALS } from '@/config/theme';
import { soundManager } from '@/utils/SoundManager';

// ─── Dot layout positions for each face value ──────────────
const DOT_PATTERNS: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-0.25, -0.25], [0.25, 0.25]],
    3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
    4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
    5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
    6: [
        [-0.25, -0.3], [0.25, -0.3],
        [-0.25, 0], [0.25, 0],
        [-0.25, 0.3], [0.25, 0.3],
    ],
};

// Standard dice face configs: opposite faces sum to 7
const FACE_CONFIGS: {
    value: number;
    position: [number, number, number];
    rotation: [number, number, number];
}[] = [
        { value: 1, position: [0, 0, 0.501], rotation: [0, 0, 0] },
        { value: 6, position: [0, 0, -0.501], rotation: [0, Math.PI, 0] },
        { value: 2, position: [0.501, 0, 0], rotation: [0, Math.PI / 2, 0] },
        { value: 5, position: [-0.501, 0, 0], rotation: [0, -Math.PI / 2, 0] },
        { value: 3, position: [0, 0.501, 0], rotation: [-Math.PI / 2, 0, 0] },
        { value: 4, position: [0, -0.501, 0], rotation: [Math.PI / 2, 0, 0] },
    ];

// Quaternion that places a given value on TOP (+Y)
const VALUE_TO_QUATERNION: Record<number, THREE.Quaternion> = {
    1: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    2: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
    3: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    4: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)),
    5: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2)),
    6: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
};

// Face-normal directions in die-local space → value mapping
const FACE_NORMALS: { axis: THREE.Vector3; value: number }[] = [
    { axis: new THREE.Vector3(0, 0, 1), value: 1 },
    { axis: new THREE.Vector3(0, 0, -1), value: 6 },
    { axis: new THREE.Vector3(1, 0, 0), value: 2 },
    { axis: new THREE.Vector3(-1, 0, 0), value: 5 },
    { axis: new THREE.Vector3(0, 1, 0), value: 3 },
    { axis: new THREE.Vector3(0, -1, 0), value: 4 },
];

const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Physics environment constants
const DICE_BOUNDARY = 2.8;
const FLOOR_HALF = 4;
const WALL_HEIGHT = 3.0;
const WALL_THICK = 0.1;

// ─── Dot face component ────────────────────────────────────
function DotFace({ value, position, rotation }: {
    value: number;
    position: [number, number, number];
    rotation: [number, number, number];
}) {
    const dots = DOT_PATTERNS[value] || [];
    const half = DICE_SIZE;

    return (
        <group
            position={[
                position[0] * half,
                position[1] * half,
                position[2] * half,
            ]}
            rotation={rotation}
        >
            {dots.map((dot, i) => (
                <mesh key={i} position={[dot[0] * half * 0.8, dot[1] * half * 0.8, 0.001]}>
                    <circleGeometry args={[DICE_DOT_RADIUS, 16]} />
                    <meshBasicMaterial color={MATERIALS.dice.dotColor} />
                </mesh>
            ))}
        </group>
    );
}

// ─── Compute throw direction toward active player's tile ───
function computeThrowTarget(playerTileIndex: number): {
    direction: THREE.Vector3;
    landingDistance: number;
} {
    const layout = TILE_LAYOUTS[playerTileIndex];
    if (!layout) {
        return {
            direction: new THREE.Vector3(1, 0, 1).normalize(),
            landingDistance: 2.0,
        };
    }

    const tileX = layout.position[0];
    const tileZ = layout.position[2];
    const dir = new THREE.Vector3(tileX, 0, tileZ);
    const tileDist = dir.length();

    if (tileDist < 0.1) {
        return { direction: new THREE.Vector3(1, 0, 0), landingDistance: 1.5 };
    }

    dir.normalize();
    const landingDistance = Math.max(tileDist - DICE_TILE_MARGIN, 1.0);
    return { direction: dir, landingDistance };
}

// ─── Detect which face value is on top via quaternion ──────
function detectTopFace(rigidBody: RapierRigidBody): number {
    const rot = rigidBody.rotation();
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);

    let bestDot = -Infinity;
    let bestValue = 1;

    for (const { axis, value } of FACE_NORMALS) {
        const worldNormal = axis.clone().applyQuaternion(q);
        const dot = worldNormal.dot(WORLD_UP);
        if (dot > bestDot) {
            bestDot = dot;
            bestValue = value;
        }
    }

    return bestValue;
}

// ─── Check if a rigid body has settled ─────────────────────
function isBodySettled(rb: RapierRigidBody): boolean {
    const linvel = rb.linvel();
    const angvel = rb.angvel();
    const linSpeed = Math.sqrt(linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2);
    const angSpeed = Math.sqrt(angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2);
    return linSpeed < 0.08 && angSpeed < 0.15;
}

// ─── Predictive Early Swap: Is it going to land on this face?
function isCommittedToFace(rb: RapierRigidBody): boolean {
    // 1. Must be close to the floor to prevent mid-air swaps
    const pos = rb.translation();
    if (pos.y > DICE_REST_HEIGHT + 0.15) return false;

    // 2. Linear and Angular energy must be low enough that it cannot tip over a 45 degree edge
    const linvel = rb.linvel();
    const angvel = rb.angvel();
    const linSpeed = Math.sqrt(linvel.x ** 2 + linvel.y ** 2 + linvel.z ** 2);
    const angSpeed = Math.sqrt(angvel.x ** 2 + angvel.y ** 2 + angvel.z ** 2);

    if (linSpeed > 0.8 || angSpeed > 3.0) return false;

    // 3. The current top face must be tilted less than ~35 degrees (0.6 radians) from straight up.
    // If it is tilted 35 degrees, and angSpeed is < 3.0, it does not have enough energy to rotate 
    // the remaining 10 degrees to crest the 45-degree tipping point of the cube. It WILL fall back down.
    const rot = rb.rotation();
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    let bestDot = -Infinity;

    for (const { axis } of FACE_NORMALS) {
        const worldNormal = axis.clone().applyQuaternion(q);
        const dot = worldNormal.dot(WORLD_UP);
        if (dot > bestDot) {
            bestDot = dot;
        }
    }

    // dot product of 1.0 is perfectly flat. 0.81 is ~35 degrees.
    return bestDot > 0.81;
}

// ─── Single Die with RigidBody ─────────────────────────────
function PhysicsDie({ rbRef, visualRotation }: {
    rbRef: React.RefObject<RapierRigidBody | null>;
    visualRotation: THREE.Euler;
}) {
    const halfSize = DICE_SIZE / 2;

    return (
        <RigidBody
            ref={rbRef}
            type="dynamic"
            colliders={false}
            position={[0, DICE_THROW_HEIGHT, 0]}
            restitution={DICE_RESTITUTION}
            friction={DICE_FRICTION}
            mass={0.3}
            linearDamping={0.3}
            angularDamping={0.1}
        >
            <CuboidCollider args={[halfSize, halfSize, halfSize]} />

            <group rotation={visualRotation}>
                <RoundedBox
                    args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]}
                    radius={0.03}
                    smoothness={4}
                    castShadow
                >
                    <meshStandardMaterial
                        color={MATERIALS.dice.color}
                        roughness={MATERIALS.dice.roughness}
                        metalness={MATERIALS.dice.metalness}
                        emissive={MATERIALS.dice.color}
                        emissiveIntensity={MATERIALS.dice.emissiveIntensity}
                    />
                </RoundedBox>

                {FACE_CONFIGS.map((face) => (
                    <DotFace
                        key={face.value}
                        value={face.value}
                        position={face.position}
                        rotation={face.rotation}
                    />
                ))}
            </group>
        </RigidBody>
    );
}

// ─── Invisible Floor — always present ──────────────────────
function Floor() {
    return (
        <RigidBody type="fixed" position={[0, -0.01, 0]} colliders={false}>
            <CuboidCollider
                args={[FLOOR_HALF, 0.01, FLOOR_HALF]}
                restitution={0.2}
                friction={0.8}
            />
        </RigidBody>
    );
}

// ─── Invisible Walls — always present ──────────────────────
function Walls() {
    const h = WALL_HEIGHT;
    const b = DICE_BOUNDARY;
    const t = WALL_THICK;

    return (
        <>
            <RigidBody type="fixed" position={[b, h / 2, 0]} colliders={false}>
                <CuboidCollider args={[t, h / 2, b]} restitution={0.2} friction={0.5} />
            </RigidBody>
            <RigidBody type="fixed" position={[-b, h / 2, 0]} colliders={false}>
                <CuboidCollider args={[t, h / 2, b]} restitution={0.2} friction={0.5} />
            </RigidBody>
            <RigidBody type="fixed" position={[0, h / 2, b]} colliders={false}>
                <CuboidCollider args={[b, h / 2, t]} restitution={0.2} friction={0.5} />
            </RigidBody>
            <RigidBody type="fixed" position={[0, h / 2, -b]} colliders={false}>
                <CuboidCollider args={[b, h / 2, t]} restitution={0.2} friction={0.5} />
            </RigidBody>
        </>
    );
}

// ─── Main Dice Scene ───────────────────────────────────────
export function DiceScene() {
    const lastDiceResult = useGameStore((s) => s.lastDiceResult);
    const phase = useGameStore((s) => s.phase);
    const isDiceAnimating = useUIStore((s) => s.isDiceAnimating);
    const setDiceSettled = useUIStore((s) => s.setDiceSettled);
    const players = useGameStore((s) => s.players);
    const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

    const isRolling = phase === 'rolling' || isDiceAnimating;
    const die1Val = lastDiceResult?.die1 ?? 1;
    const die2Val = lastDiceResult?.die2 ?? 1;

    const die1Ref = useRef<RapierRigidBody>(null);
    const die2Ref = useRef<RapierRigidBody>(null);

    // Throw state — managed via refs for frame-level control
    const needsThrow = useRef(false);
    const settledFrames = useRef(0);
    const isSettledRef = useRef(false);
    const wasRolling = useRef(false);
    const rollingSoundPlayedRef = useRef(false);

    // Active player tile for throw direction
    const activePlayer = players[currentPlayerIndex];
    const playerTileIndex = activePlayer?.position ?? 0;

    // Visual corrective rotation (The "Invisible Hand")
    const [d1VisualRot, setD1VisualRot] = useState<THREE.Euler>(new THREE.Euler(0, 0, 0));
    const [d2VisualRot, setD2VisualRot] = useState<THREE.Euler>(new THREE.Euler(0, 0, 0));

    // Refs to track if we've already done the early swap for this roll
    const d1SwappedRef = useRef(false);
    const d2SwappedRef = useRef(false);

    const throwTarget = useMemo(() => {
        return computeThrowTarget(playerTileIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRolling, playerTileIndex]);

    // Dice should be visible when rolling or showing a result
    const showDice = isRolling || !!lastDiceResult;

    // Mark for throw when rolling transitions from false → true
    useEffect(() => {
        if (isRolling && !wasRolling.current) {
            needsThrow.current = true;
            settledFrames.current = 0;
            isSettledRef.current = false;
            rollingSoundPlayedRef.current = false;
            setDiceSettled(false); // Reset settled signal for new roll

            // Reset visual overloads
            setD1VisualRot(new THREE.Euler(0, 0, 0));
            setD2VisualRot(new THREE.Euler(0, 0, 0));
            d1SwappedRef.current = false;
            d2SwappedRef.current = false;
        }
        wasRolling.current = isRolling;
    }, [isRolling, setDiceSettled]);

    // Main physics loop — handles both throwing and settling detection
    useFrame(() => {
        const d1 = die1Ref.current;
        const d2 = die2Ref.current;

        // ── Throw: poll until refs are available ──
        if (needsThrow.current && d1 && d2) {
            needsThrow.current = false;

            const { direction, landingDistance } = throwTarget;
            const perp = new THREE.Vector3(-direction.z, 0, direction.x);
            const impulseScale = Math.min(landingDistance / 2.5, 1.2);

            for (const [rb, val, lateralSign] of [
                [d1, die1Val, -1],
                [d2, die2Val, 1],
            ] as [RapierRigidBody, number, number][]) {
                // Wake up & reset
                rb.setEnabled(true);
                rb.wakeUp();
                rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
                rb.setAngvel({ x: 0, y: 0, z: 0 }, true);

                // Position: board center, offset laterally
                const lateralOffset = lateralSign * DICE_GAP / 2;
                rb.setTranslation({
                    x: perp.x * lateralOffset,
                    y: DICE_THROW_HEIGHT,
                    z: perp.z * lateralOffset,
                }, true);

                // Bias rotation so target face is roughly up
                const baseQ = VALUE_TO_QUATERNION[val] || VALUE_TO_QUATERNION[1];
                const randomTwist = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        (Math.random() - 0.5) * 0.5,
                        Math.random() * Math.PI * 2,
                        (Math.random() - 0.5) * 0.5,
                    )
                );
                const startQ = baseQ.clone().multiply(randomTwist);
                rb.setRotation({ x: startQ.x, y: startQ.y, z: startQ.z, w: startQ.w }, true);

                // Impulse toward player token
                const impulse = DICE_IMPULSE_STRENGTH * impulseScale;
                rb.applyImpulse({
                    x: direction.x * impulse + perp.x * lateralSign * DICE_LATERAL_IMPULSE,
                    y: DICE_UPWARD_IMPULSE_BASE + Math.random() * DICE_UPWARD_IMPULSE_VAR,
                    z: direction.z * impulse + perp.z * lateralSign * DICE_LATERAL_IMPULSE,
                }, true);

                // Torque for tumbling
                rb.applyTorqueImpulse({
                    x: (Math.random() - 0.5) * DICE_TORQUE_STRENGTH,
                    y: (Math.random() - 0.5) * DICE_TORQUE_STRENGTH * 0.5,
                    z: (Math.random() - 0.5) * DICE_TORQUE_STRENGTH,
                }, true);
            }
        }

        // ── Predictive Early Swap ──
        if (isRolling && d1 && d2) {
            // Check die 1
            if (!d1SwappedRef.current && isCommittedToFace(d1)) {
                d1SwappedRef.current = true;
                const physicalFace = detectTopFace(d1);
                const qF = VALUE_TO_QUATERNION[physicalFace].clone();
                const qT = VALUE_TO_QUATERNION[die1Val].clone();
                const diff = qF.invert().multiply(qT);
                setD1VisualRot(new THREE.Euler().setFromQuaternion(diff));
            }

            // Check die 2
            if (!d2SwappedRef.current && isCommittedToFace(d2)) {
                d2SwappedRef.current = true;
                const physicalFace = detectTopFace(d2);
                const qF = VALUE_TO_QUATERNION[physicalFace].clone();
                const qT = VALUE_TO_QUATERNION[die2Val].clone();
                const diff = qF.invert().multiply(qT);
                setD2VisualRot(new THREE.Euler().setFromQuaternion(diff));
            }

            // Play the rolling sound once roughly halfway through the throw.
            // When y falls below a certain height, it's about to land.
            // A good proxy for "middle of the motion" is when the die has
            // dropped to about 1.0 on the Y axis and the sound hasn't played.
            if (!rollingSoundPlayedRef.current) {
                const pos1 = d1.translation();
                const pos2 = d2.translation();
                if (pos1.y < 1.0 || pos2.y < 1.0) {
                    rollingSoundPlayedRef.current = true;
                    soundManager.play('rolling-dice');
                }
            }
        }

        // ── Settling detection ──
        if (isRolling && !isSettledRef.current && d1 && d2) {
            if (isBodySettled(d1) && isBodySettled(d2)) {
                settledFrames.current += 1;
                if (settledFrames.current > 30) {
                    isSettledRef.current = true;

                    // Fallback: If the early swap somehow missed (e.g. framerate drop), do it now
                    if (!d1SwappedRef.current) {
                        const physicalFace1 = detectTopFace(d1);
                        const diff1 = VALUE_TO_QUATERNION[physicalFace1].clone().invert().multiply(VALUE_TO_QUATERNION[die1Val].clone());
                        setD1VisualRot(new THREE.Euler().setFromQuaternion(diff1));
                    }
                    if (!d2SwappedRef.current) {
                        const physicalFace2 = detectTopFace(d2);
                        const diff2 = VALUE_TO_QUATERNION[physicalFace2].clone().invert().multiply(VALUE_TO_QUATERNION[die2Val].clone());
                        setD2VisualRot(new THREE.Euler().setFromQuaternion(diff2));
                    }

                    // Signal that we are ready
                    setDiceSettled(true);
                }
            } else {
                settledFrames.current = 0;
            }
        }
    });

    return (
        <>
            {/* Floor + Walls are ALWAYS rendered so they exist before dice spawn */}
            <Floor />
            <Walls />

            {/* Dice are conditionally mounted */}
            {showDice && (
                <>
                    <PhysicsDie rbRef={die1Ref} visualRotation={d1VisualRot} />
                    <PhysicsDie rbRef={die2Ref} visualRotation={d2VisualRot} />
                </>
            )}
        </>
    );
}
