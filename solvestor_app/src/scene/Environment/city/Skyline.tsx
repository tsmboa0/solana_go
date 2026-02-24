import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useUIStore } from '@/stores/useUIStore';

export function Skyline() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // 3 Towers farther out
    const towers = useMemo(() => [
        { position: [-26, 0, -26], scale: [4.5, 18, 4.5], tint: '#0d9b9b' }, // Teal
        { position: [24, 0, -30], scale: [4.0, 15, 4.0], tint: '#663399' }, // Purple
        { position: [30, 0, 24], scale: [3.5, 13, 3.5], tint: '#0d9b9b' }, // Teal
    ], []);

    return (
        <group>
            {towers.map((tower, idx) => (
                <Tower key={idx} tower={tower} isDark={isDark} />
            ))}
        </group>
    );
}

function Tower({ tower, isDark }: { tower: any, isDark: boolean }) {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const windowTex = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        // Base dark window
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 128, 128);

        // Window lights
        ctx.fillStyle = '#ffffff';
        for (let x = 8; x < 128; x += 16) {
            for (let y = 8; y < 128; y += 16) {
                // Occasional dark window for realism
                if (Math.random() > 0.2) {
                    ctx.fillRect(x, y, 6, 8);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        // Repeat scale to match tower size visually
        tex.repeat.set(tower.scale[0] * 1.5, tower.scale[1]);
        return tex;
    }, [tower.scale]);

    useFrame((state) => {
        if (materialRef.current) {
            const timeOffset = tower.position[0];
            const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.5 + timeOffset) * 0.3;
            // Pulse logic based on theme
            const targetIntensity = isDark ? (0.3 + pulse * 0.5) : (0.1 + pulse * 0.3);
            materialRef.current.emissiveIntensity = targetIntensity;
        }
    });

    return (
        <mesh position={[tower.position[0], tower.scale[1] / 2 - 0.05, tower.position[2]]} castShadow receiveShadow>
            <boxGeometry args={tower.scale} />
            <meshStandardMaterial
                ref={materialRef}
                color={isDark ? '#1a1a2e' : '#eeeeee'}
                emissive={tower.tint}
                emissiveMap={windowTex}
                emissiveIntensity={0.3}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
}
