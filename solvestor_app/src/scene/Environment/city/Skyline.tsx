import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useUIStore } from '@/stores/useUIStore';

export function Skyline() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // One Hero Tower to anchor the skyline
    const heroTower = useMemo(() => ({
        position: [-24, 0, -28],
        scale: [6.5, 24, 6.5],
        tint: '#14F195' // Solana green accent glow
    }), []);

    return (
        <group>
            <Tower tower={heroTower} isDark={isDark} />
        </group>
    );
}

function Tower({ tower, isDark }: { tower: any, isDark: boolean }) {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const windowTex = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        // Base dark glass
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, 256, 256);

        // Prominent glowing window lines
        ctx.fillStyle = '#ffffff';
        for (let x = 16; x < 256; x += 32) {
            for (let y = 8; y < 256; y += 12) {
                // More consistent lit windows for the hero tower
                if (Math.random() > 0.1) {
                    ctx.fillRect(x, y, 16, 6);
                }
            }
        }

        // Add a vertical branding stripe
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(120, 0, 16, 256);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        tex.repeat.set(tower.scale[0] * 0.8, tower.scale[1] * 0.5);
        return tex;
    }, [tower.scale]);

    useFrame((state) => {
        if (materialRef.current) {
            const timeOffset = tower.position[0];
            const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.2 + timeOffset) * 0.5;
            // Higher base intensity for the Hero Tower
            const targetIntensity = isDark ? (0.5 + pulse * 0.4) : (0.2 + pulse * 0.3);
            materialRef.current.emissiveIntensity = targetIntensity;
        }
    });

    return (
        <mesh position={[tower.position[0], tower.scale[1] / 2 - 0.05, tower.position[2]]} castShadow receiveShadow>
            <boxGeometry args={tower.scale} />
            <meshStandardMaterial
                ref={materialRef}
                color={isDark ? '#0a0f18' : '#e0e5f0'}
                emissive={tower.tint}
                emissiveMap={windowTex}
                emissiveIntensity={0.5}
                roughness={0.15}
                metalness={0.9}
            />
        </mesh>
    );
}
