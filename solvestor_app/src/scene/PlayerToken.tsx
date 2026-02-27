// ============================================================
// Player Token — Solvestor (SWS)
// ============================================================
// 3D metallic token that HOPS tile-to-tile (parabolic arc).
// Sits properly on tile surface. Offset when sharing a tile.
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Player } from '@/types/game';
import { useTokenMovement } from '@/hooks/useTokenMovement';
import { useGameStore } from '@/stores/useGameStore';
import { MATERIALS } from '@/config/theme';
import {
    TOKEN_RADIUS,
    TOKEN_HEIGHT,
    TOKEN_Y_OFFSET,
    TOKEN_SAME_TILE_OFFSET,
} from '@/config/game';

const HOP_HEIGHT = 0.35; // Peak height of each hop arc
const HOP_SPEED = 8; // Animation speed for hops (higher = faster snap)

interface PlayerTokenProps {
    player: Player;
    index: number;
}

export function PlayerToken({ player, index }: PlayerTokenProps) {
    const groupRef = useRef<THREE.Group>(null);
    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const localPlayerId = useGameStore((s) => s.players[s.localPlayerIndex]?.id);
    const isRemote = isBeginnerMode && player.id !== localPlayerId;
    const { currentPosition, isMoving, isTeleporting } = useTokenMovement(
        player.id,
        player.position,
        player.isActive,
        player.isCPU ?? false,
        isRemote,
    );

    // Track hop animation progress
    const hopProgress = useRef(1); // 0 → 1 for each hop
    const prevTargetX = useRef(currentPosition[0]);
    const prevTargetZ = useRef(currentPosition[2]);
    const hopStartX = useRef(currentPosition[0]);
    const hopStartZ = useRef(currentPosition[2]);

    const players = useGameStore((s) => s.players);

    // Calculate offset when multiple tokens on same tile
    const samePositionOffset = useMemo(() => {
        const sameTilePlayers = players.filter(
            (p) => p.position === player.position && p.id !== player.id
        );
        if (sameTilePlayers.length === 0) return [0, 0];
        return [
            (index % 2 === 0 ? 1 : -1) * TOKEN_SAME_TILE_OFFSET,
            (index < 2 ? 1 : -1) * TOKEN_SAME_TILE_OFFSET * 0.5,
        ];
    }, [player.position, players, index]);

    // Animate position with HOPPING
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const targetX = currentPosition[0] + samePositionOffset[0];
        const targetZ = currentPosition[2] + samePositionOffset[1];

        // Detect when target tile changes (new hop starts)
        if (targetX !== prevTargetX.current || targetZ !== prevTargetZ.current) {
            hopStartX.current = groupRef.current.position.x;
            hopStartZ.current = groupRef.current.position.z;
            hopProgress.current = 0;
            prevTargetX.current = targetX;
            prevTargetZ.current = targetZ;
        }

        if (hopProgress.current < 1) {
            // Advance hop progress (teleports are 2x faster, flat speed)
            const speed = isTeleporting ? 15 : HOP_SPEED;
            hopProgress.current = Math.min(hopProgress.current + delta * speed, 1);
            const t = hopProgress.current;

            // Ease in-out for smooth feel
            const eased = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;

            // Interpolate XZ position
            groupRef.current.position.x = hopStartX.current + (targetX - hopStartX.current) * eased;
            groupRef.current.position.z = hopStartZ.current + (targetZ - hopStartZ.current) * eased;

            if (isTeleporting) {
                // Flat glide for teleport
                groupRef.current.position.y = TOKEN_Y_OFFSET;
            } else {
                // Parabolic Y arc: peaks at t=0.5
                const arc = 4 * t * (1 - t); // 0 → 1 → 0 parabola
                groupRef.current.position.y = TOKEN_Y_OFFSET + arc * HOP_HEIGHT;
            }
        } else {
            // At rest on tile
            groupRef.current.position.x = targetX;
            groupRef.current.position.z = targetZ;
            groupRef.current.position.y = TOKEN_Y_OFFSET;

            // Gentle idle bob for active player
            if (player.isActive && !isMoving) {
                groupRef.current.position.y +=
                    Math.sin(Date.now() * 0.003) * 0.008;
            }
        }
    });

    return (
        <group
            ref={groupRef}
            position={[currentPosition[0], TOKEN_Y_OFFSET, currentPosition[2]]}
        >
            {/* Token body — metallic capsule shape */}
            <mesh castShadow>
                <capsuleGeometry args={[TOKEN_RADIUS, TOKEN_HEIGHT, 8, 16]} />
                <meshStandardMaterial
                    color={player.color}
                    roughness={MATERIALS.token.roughness}
                    metalness={MATERIALS.token.metalness}
                    emissive={player.color}
                    emissiveIntensity={
                        player.isActive
                            ? MATERIALS.token.emissiveIntensity * 2
                            : MATERIALS.token.emissiveIntensity
                    }
                />
            </mesh>

        </group>
    );
}
