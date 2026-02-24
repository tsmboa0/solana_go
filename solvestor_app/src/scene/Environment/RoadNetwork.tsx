import { useUIStore } from '@/stores/useUIStore';
import { ROAD_OFFSET } from '@/config/game';
import * as THREE from 'three';
import { useMemo } from 'react';
import { createRoadTexture } from './textureUtils';

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

    // Procedural asphalt texture
    const roadTexture = useMemo(() => {
        const tex = createRoadTexture(isDark);
        // Map the texture repeatedly along the road
        tex.repeat.set(10, 10);
        return tex;
    }, [isDark]);

    // Compute custom UVs for the square torus so the texture flows along the path
    useMemo(() => {
        const pos = roadGeo.attributes.position;
        const uvs = new Float32Array(pos.count * 2);

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i); // Note: 2D shape X and Y, mapped to X and Z in 3D

            // Map the square coordinates to polar-like UVs 
            // This is a rough mapping so the road texture wraps around the square.
            // Using atan2 to get distance around the loop for U, and radius for V.
            let u = 0;
            let v = 0;

            // U = progression along the road

            // U = progression along the road
            // Since it's a square, we can approximate the distance along the perimeter.
            // Simple mapping for U:
            const maxRadius = Math.max(Math.abs(x), Math.abs(y));

            if (maxRadius === Math.abs(x)) {
                // Left or Right edge
                u = (y + ROAD_CENTER) / (ROAD_CENTER * 2);
                if (x < 0) u = 1 - u;
                v = (Math.abs(x) - INNER) / (OUTER - INNER);
            } else {
                // Top or Bottom edge
                u = (x + ROAD_CENTER) / (ROAD_CENTER * 2);
                if (y > 0) u = 1 - u;
                v = (Math.abs(y) - INNER) / (OUTER - INNER);
            }

            // Tile the U coordinate to make dash lines repeat nicely
            uvs[i * 2] = u * 40; // Repeat 40 times around the track
            uvs[i * 2 + 1] = v;
        }

        roadGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }, [roadGeo, INNER, OUTER, ROAD_CENTER]);


    return (
        <group position={[0, -0.05, 0]}>
            {/* The Asphalt / Road surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={roadGeo}>
                <meshStandardMaterial
                    map={roadTexture}
                    color={isDark ? '#aaaaaa' : '#ffffff'} // Base tint over texture
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>
        </group>
    );
}
