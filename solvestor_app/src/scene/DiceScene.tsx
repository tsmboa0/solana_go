// ============================================================
// Dice Scene — Solvestor (SWS)
// ============================================================
// 3D dice pair with tumble animation.
// Dice always roll to the CENTER of the board.
// ============================================================

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';

const DICE_SIZE = 0.22;
const DICE_GAP = 0.35;
const DICE_DROP_HEIGHT = 1.5;
const DICE_REST_HEIGHT = 0.15;

function Die({
    value,
    isRolling,
    offset,
}: {
    value: number;
    isRolling: boolean;
    offset: [number, number, number];
}) {
    const meshRef = useRef<THREE.Group>(null);
    const spinSpeed = useRef({ x: 0, y: 0, z: 0 });
    const posY = useRef(DICE_DROP_HEIGHT);
    const velY = useRef(0);

    useEffect(() => {
        if (isRolling) {
            // Start from above and give initial spin + drop
            posY.current = DICE_DROP_HEIGHT;
            velY.current = 0;
            spinSpeed.current = {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 15,
            };
        }
    }, [isRolling]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        if (isRolling) {
            // Spin
            meshRef.current.rotation.x += spinSpeed.current.x * delta;
            meshRef.current.rotation.y += spinSpeed.current.y * delta;
            meshRef.current.rotation.z += spinSpeed.current.z * delta;

            // Dampen spin
            spinSpeed.current.x *= 0.96;
            spinSpeed.current.y *= 0.96;
            spinSpeed.current.z *= 0.96;

            // Simple gravity + bounce physics
            velY.current -= 9.8 * delta;
            posY.current += velY.current * delta;

            // Bounce off the board surface
            if (posY.current <= DICE_REST_HEIGHT) {
                posY.current = DICE_REST_HEIGHT;
                velY.current = -velY.current * 0.35; // Bounce with energy loss
                if (Math.abs(velY.current) < 0.3) {
                    velY.current = 0;
                    posY.current = DICE_REST_HEIGHT;
                }
            }

            meshRef.current.position.y = posY.current;
        } else {
            // Settle to rest position with value showing
            meshRef.current.rotation.x += (0 - meshRef.current.rotation.x) * 0.08;
            meshRef.current.rotation.y += (0 - meshRef.current.rotation.y) * 0.08;
            meshRef.current.rotation.z += (0 - meshRef.current.rotation.z) * 0.08;
            meshRef.current.position.y += (DICE_REST_HEIGHT - meshRef.current.position.y) * 0.1;
        }
    });

    return (
        <group ref={meshRef} position={[offset[0], DICE_DROP_HEIGHT, offset[2]]}>
            <RoundedBox
                args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]}
                radius={0.025}
                smoothness={4}
                castShadow
            >
                <meshStandardMaterial
                    color="#fafafa"
                    roughness={0.25}
                    metalness={0.15}
                />
            </RoundedBox>

            {/* Show value as text on top face */}
            <Text
                position={[0, DICE_SIZE / 2 + 0.002, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.12}
                color="#1a1a2e"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
            >
                {value.toString()}
            </Text>
        </group>
    );
}

export function DiceScene() {
    const lastDiceResult = useGameStore((s) => s.lastDiceResult);
    const phase = useGameStore((s) => s.phase);
    const isDiceAnimating = useUIStore((s) => s.isDiceAnimating);

    const isRolling = phase === 'rolling' || isDiceAnimating;
    const die1 = lastDiceResult?.die1 ?? 1;
    const die2 = lastDiceResult?.die2 ?? 1;

    if (!lastDiceResult && !isRolling) return null;

    // Dice always roll to the CENTER of the board
    return (
        <group position={[0, 0, 0]}>
            <Die
                value={die1}
                isRolling={isRolling}
                offset={[-DICE_GAP / 2, 0, 0.05]}
            />
            <Die
                value={die2}
                isRolling={isRolling}
                offset={[DICE_GAP / 2, 0, -0.05]}
            />
        </group>
    );
}
