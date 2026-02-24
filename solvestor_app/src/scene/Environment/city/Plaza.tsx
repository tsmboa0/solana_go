import * as THREE from 'three';
import { useMemo } from 'react';
import { useUIStore } from '@/stores/useUIStore';

export function Plaza() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const normalMap = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Base flat normal
        ctx.fillStyle = '#8080FF';
        ctx.fillRect(0, 0, 512, 512);

        // Subtle tile lines
        ctx.strokeStyle = '#7070FF';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(40, 40); // Tile across the plaza
        return tex;
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
            <planeGeometry args={[150, 150]} />
            <meshStandardMaterial
                color={isDark ? '#222222' : '#d0d0d0'}
                roughness={0.9}
                metalness={0.1}
                normalMap={normalMap}
                normalScale={new THREE.Vector2(0.3, 0.3)}
            />
        </mesh>
    );
}
