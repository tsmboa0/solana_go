import { useUIStore } from '@/stores/useUIStore';
import { COLORS } from '@/config/theme';
import { ROAD_OFFSET } from '@/config/game';
import * as THREE from 'three';
import { useMemo } from 'react';

export function RoadNetwork() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // The road center distance is configured globally in config/game.ts
    const ROAD_CENTER = ROAD_OFFSET;
    const ROAD_WIDTH = 2;
    const INNER = ROAD_CENTER - ROAD_WIDTH / 2;
    const OUTER = ROAD_CENTER + ROAD_WIDTH / 2;

    const createSquareTorus = (inner: number, outer: number) => {
        const shape = new THREE.Shape();
        shape.moveTo(-outer, -outer);
        shape.lineTo(outer, -outer);
        shape.lineTo(outer, outer);
        shape.lineTo(-outer, outer);
        shape.lineTo(-outer, -outer);

        const hole = new THREE.Path();
        hole.moveTo(-inner, -inner);
        hole.lineTo(inner, -inner);
        hole.lineTo(inner, inner);
        hole.lineTo(-inner, inner);
        hole.lineTo(-inner, -inner);
        shape.holes.push(hole);

        return new THREE.ShapeGeometry(shape);
    };

    const roadGeo = useMemo(() => createSquareTorus(INNER, OUTER), [INNER, OUTER]);
    const innerLineGeo = useMemo(() => createSquareTorus(INNER + 0.05, INNER + 0.1), [INNER]);
    const outerLineGeo = useMemo(() => createSquareTorus(OUTER - 0.1, OUTER - 0.05), [OUTER]);

    return (
        <group position={[0, -0.05, 0]}>
            {/* The Asphalt / Road surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={roadGeo}>
                <meshStandardMaterial
                    color={isDark ? '#08080c' : '#d5d5df'}
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>

            {/* Glowing inner highway line */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={innerLineGeo}>
                <meshBasicMaterial
                    color={isDark ? COLORS.solanaPurple : COLORS.solanaGreen}
                    transparent
                    opacity={isDark ? 0.8 : 0.4}
                />
            </mesh>

            {/* Glowing outer highway line */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={outerLineGeo}>
                <meshBasicMaterial
                    color={isDark ? COLORS.solanaGreen : COLORS.solanaPurple}
                    transparent
                    opacity={isDark ? 0.8 : 0.4}
                />
            </mesh>
        </group>
    );
}
