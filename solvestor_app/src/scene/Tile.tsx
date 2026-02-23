// ============================================================
// Tile Component — Solvestor (SWS)
// ============================================================
// Individual 3D tile with subtle hover highlight, color band,
// label text, and ownership indicator.
// ============================================================

import { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { TileDefinition, TileLayout } from '@/types/game';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { TILE_WIDTH, TILE_DEPTH, TILE_HEIGHT, CORNER_TILE_SIZE } from '@/config/game';
import { MATERIALS, COLORS } from '@/config/theme';
import { lerp } from '@/utils/easing';

interface TileProps {
    tile: TileDefinition;
    layout: TileLayout;
}

export function Tile({ tile, layout }: TileProps) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const openBottomSheet = useUIStore((s) => s.openBottomSheet);
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const players = useGameStore((s) => s.players);
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const owner = ownedTiles[tile.id];
    const ownerPlayer = owner
        ? players.find((p) => p.id === owner)
        : null;

    // Tile dimensions
    const width = layout.isCorner ? CORNER_TILE_SIZE : TILE_WIDTH;
    const depth = layout.isCorner ? CORNER_TILE_SIZE : TILE_DEPTH;

    // Content Z-flip: 1 keeps header at -Z edge, -1 mirrors to +Z edge
    const flip = layout.contentFlip;

    // Animate hover: gentle elevation only (no color flood)
    useFrame(() => {
        if (meshRef.current) {
            const targetY = hovered
                ? TILE_HEIGHT / 2 + MATERIALS.tileHover.elevationOffset
                : TILE_HEIGHT / 2;
            meshRef.current.position.y = lerp(
                meshRef.current.position.y,
                targetY,
                0.12
            );
        }
        // Animate hover outline glow ring
        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.MeshBasicMaterial;
            const targetOpacity = hovered ? 0.6 : ownerPlayer ? 0.25 : 0;
            mat.opacity = lerp(mat.opacity, targetOpacity, 0.12);
        }
    });

    // Tile base color
    const tileColor = isDark ? '#1e1e38' : '#f8f8fa';

    // Label — truncate long names for non-corner tiles
    const labelText = useMemo(() => {
        if (layout.isCorner) return tile.name;
        return tile.name.length > 10
            ? tile.name.substring(0, 9) + '…'
            : tile.name;
    }, [tile.name, layout.isCorner]);

    return (
        <group
            position={[layout.position[0], 0, layout.position[2]]}
            rotation={[0, layout.rotation, 0]}
        >
            {/* Tile body — content is parented here so it moves with hover elevation */}
            <RoundedBox
                ref={meshRef}
                args={[width, TILE_HEIGHT, depth]}
                radius={0.02}
                smoothness={4}
                position={[0, TILE_HEIGHT / 2, 0]}
                castShadow
                receiveShadow
                onPointerEnter={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerLeave={() => {
                    setHovered(false);
                    document.body.style.cursor = 'default';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    openBottomSheet(tile.id);
                }}
            >
                <meshStandardMaterial
                    color={tileColor}
                    roughness={MATERIALS.tile.roughness}
                    metalness={MATERIALS.tile.metalness}
                    emissive="#000000"
                    emissiveIntensity={0}
                />

                {/* Color band — skip on corner tiles, flipped by contentFlip on regular tiles */}
                {!layout.isCorner && (
                    <mesh
                        position={[0, TILE_HEIGHT / 2 + 0.001, flip * (-depth / 2 + depth * 0.12)]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[width - 0.04, depth * 0.22]} />
                        <meshBasicMaterial color={tile.colorBand} />
                    </mesh>
                )}

                {/* Hover highlight border — subtle colored outline */}
                {hovered && (
                    <mesh
                        position={[0, TILE_HEIGHT / 2 + 0.002, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <planeGeometry args={[width + 0.02, depth + 0.02]} />
                        <meshBasicMaterial
                            color={tile.colorBand}
                            transparent
                            opacity={0.12}
                        />
                    </mesh>
                )}

                {/* Icon emoji — diagonal on corners, flipped on regular tiles */}
                <Text
                    position={[0, TILE_HEIGHT / 2 + 0.01, layout.isCorner ? -depth * 0.1 : flip * (-depth * 0.05)]}
                    rotation={[-Math.PI / 2, 0, layout.isCorner ? Math.PI / 4 : 0]}
                    fontSize={layout.isCorner ? 0.2 : 0.15}
                    anchorX="center"
                    anchorY="middle"
                >
                    {tile.icon}
                </Text>

                {/* Label text — diagonal on corners, flipped on regular tiles */}
                <Text
                    position={[0, TILE_HEIGHT / 2 + 0.01, layout.isCorner ? depth * 0.15 : flip * (depth * 0.2)]}
                    rotation={[-Math.PI / 2, 0, layout.isCorner ? Math.PI / 4 : 0]}
                    fontSize={layout.isCorner ? 0.09 : 0.06}
                    maxWidth={width - 0.08}
                    anchorX="center"
                    anchorY="middle"
                    color={isDark ? COLORS.textPrimary : COLORS.textDark}
                    textAlign="center"
                >
                    {labelText}
                </Text>

                {/* Price text (for buyable tiles) — flipped along with header */}
                {tile.price !== null && (
                    <Text
                        position={[0, TILE_HEIGHT / 2 + 0.01, flip * (depth * 0.33)]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.045}
                        anchorX="center"
                        anchorY="middle"
                        color={COLORS.textSecondary}
                    >
                        {`$${tile.price.toLocaleString()}`}
                    </Text>
                )}
            </RoundedBox>

            {/* Ownership / hover glow ring around the tile */}
            <mesh
                ref={glowRef}
                position={[0, 0.003, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <ringGeometry args={[
                    Math.max(width, depth) * 0.45,
                    Math.max(width, depth) * 0.52,
                    32
                ]} />
                <meshBasicMaterial
                    color={ownerPlayer ? ownerPlayer.color : (hovered ? tile.colorBand : '#ffffff')}
                    transparent
                    opacity={0}
                />
            </mesh>
        </group>
    );
}
