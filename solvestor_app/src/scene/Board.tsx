// ============================================================
// Board Base — Solvestor (SWS)
// ============================================================
// The board's base plane with a dark, textured surface.
// ============================================================

import { useUIStore } from '@/stores/useUIStore';
import { MATERIALS } from '@/config/theme';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import boardImage from '@/assets/solvestor-board.webp';

export function Board() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const centerTexture = useTexture(boardImage);
    // Explicitly decode the raw image pixels as standard RGB so Three.js 
    // doesn't incorrectly interpret them as a linear math color space.
    centerTexture.colorSpace = THREE.SRGBColorSpace;

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
                    color={isDark ? MATERIALS.board.colorDark : MATERIALS.board.colorLight}
                    roughness={MATERIALS.board.roughness}
                    metalness={MATERIALS.board.metalness}
                />
            </mesh>

            {/* Center Area Texture */}
            <mesh
                receiveShadow
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
            >
                {/* 4.95 perfectly fills the 9-tile gap between the 0.8 depth property border */}
                <planeGeometry args={[4.95, 4.95]} />
                {/* Standard material reacts to scene lighting and receives shadows. 
                    The color prop acts as a multiplier/dimmer on the image texture. */}
                <meshStandardMaterial
                    map={centerTexture}
                    color={isDark ? MATERIALS.boardCenter.tintDark : MATERIALS.boardCenter.tintLight}
                    roughness={MATERIALS.boardCenter.roughness}
                    metalness={MATERIALS.boardCenter.metalness}
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
