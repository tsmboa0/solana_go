// ============================================================
// Board Base — Solvestor (SWS)
// ============================================================
// The board's base plane with a dark, textured surface.
// ============================================================

import { useUIStore } from '@/stores/useUIStore';
import { MATERIALS } from '@/config/theme';

export function Board() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    return (
        <group>
            {/* Main board surface */}
            <mesh
                receiveShadow
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
            >
                <planeGeometry args={[7, 7]} />
                <meshStandardMaterial
                    color={isDark ? MATERIALS.board.color : '#e8e8f0'}
                    roughness={MATERIALS.board.roughness}
                    metalness={MATERIALS.board.metalness}
                />
            </mesh>

            {/* Subtle center area — slightly different shade */}
            <mesh
                receiveShadow
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
            >
                <planeGeometry args={[4.2, 4.2]} />
                <meshStandardMaterial
                    color={isDark ? '#0f0f1f' : '#f0f0f5'}
                    roughness={0.9}
                    metalness={0.05}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Board edge glow ring */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.001, 0]}
            >
                <ringGeometry args={[3.3, 3.35, 64]} />
                <meshBasicMaterial
                    color="#9945FF"
                    transparent
                    opacity={isDark ? 0.15 : 0.05}
                />
            </mesh>
        </group>
    );
}
