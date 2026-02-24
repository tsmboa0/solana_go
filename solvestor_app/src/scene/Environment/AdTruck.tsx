import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '@/stores/useUIStore';
import { ROAD_OFFSET } from '@/config/game';

interface AdTruckProps {
    startAngle?: number; // Repurposed for start distance
    speed?: number;
    direction?: 1 | -1;
    adTextureUrl: string;
}

export function AdTruck({
    startAngle = 0,
    speed = 2.0,
    direction = 1,
    adTextureUrl,
}: AdTruckProps) {
    const groupRef = useRef<THREE.Group>(null);
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const texture = useTexture(adTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Scale texture to fit truck side
    texture.repeat.set(1, 1);

    useFrame((state) => {
        if (!groupRef.current) return;

        // Perimeter = 8 * R.
        const R = ROAD_OFFSET;
        const perimeter = 8 * R;

        let distance = startAngle + (state.clock.elapsedTime * speed * direction);
        // Normalize distance using modulo wrapper for negative numbers
        distance = ((distance % perimeter) + perimeter) % perimeter;

        let x = 0, z = 0, nextX = 0, nextZ = 0;

        // Determine current position
        if (distance <= 2 * R) {
            // Top edge: x from -R to R, z = -R
            x = -R + distance;
            z = -R;
        } else if (distance <= 4 * R) {
            // Right edge: x = R, z from -R to R
            x = R;
            z = -R + (distance - 2 * R);
        } else if (distance <= 6 * R) {
            // Bottom edge: x from R to -R, z = R
            x = R - (distance - 4 * R);
            z = R;
        } else {
            // Left edge: x = -R, z from R to -R
            x = -R;
            z = R - (distance - 6 * R);
        }

        // LookAt target (a bit ahead on the path)
        const forwardOffset = direction > 0 ? 0.1 : -0.1;
        const nextDistance = ((distance + forwardOffset % perimeter) + perimeter) % perimeter;

        if (nextDistance <= 2 * R) {
            nextX = -R + nextDistance;
            nextZ = -R;
        } else if (nextDistance <= 4 * R) {
            nextX = R;
            nextZ = -R + (nextDistance - 2 * R);
        } else if (nextDistance <= 6 * R) {
            nextX = R - (nextDistance - 4 * R);
            nextZ = R;
        } else {
            nextX = -R;
            nextZ = R - (nextDistance - 6 * R);
        }

        groupRef.current.position.set(x, 0.4, z);
        groupRef.current.lookAt(nextX, 0.4, nextZ);
    });

    return (
        <group ref={groupRef}>
            {/* Rotate -90 degrees so the modeled +X front aligns with the actual -Z forward vector used by lookAt */}
            <group rotation={[0, -Math.PI / 2, 0]}>
                {/* Truck Cabin */}
                <mesh position={[0.8, 0, 0]} castShadow>
                    <boxGeometry args={[0.6, 0.6, 0.6]} />
                    <meshStandardMaterial
                        color={isDark ? '#333344' : '#e0e0e0'}
                        metalness={0.6}
                        roughness={0.4}
                    />
                </mesh>

                {/* Truck Cargo/Container */}
                <group position={[-0.4, 0.2, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[1.8, 1, 0.8]} />
                        <meshStandardMaterial color={isDark ? '#22222a' : '#d5d5d5'} />
                    </mesh>

                    {/* Ad Texture on Left Side */}
                    <mesh position={[0, 0, 0.41]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[1.7, 0.9]} />
                        <meshBasicMaterial map={texture} toneMapped={false} />
                    </mesh>

                    {/* Ad Texture on Right Side */}
                    <mesh position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[1.7, 0.9]} />
                        <meshBasicMaterial map={texture} toneMapped={false} />
                    </mesh>
                </group>

                {/* Wheels */}
                {[
                    [-1, -0.3, 0.4], [-1, -0.3, -0.4],
                    [0, -0.3, 0.4], [0, -0.3, -0.4],
                    [0.9, -0.3, 0.4], [0.9, -0.3, -0.4]
                ].map((pos, i) => (
                    <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
                        <meshStandardMaterial color="#111" roughness={0.9} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}
