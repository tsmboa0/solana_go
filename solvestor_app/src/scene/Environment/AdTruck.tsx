import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '@/stores/useUIStore';
import { ROAD_OFFSET } from '@/config/game';
import { createAdTexture } from './textureUtils';

interface AdTruckProps {
    startAngle?: number; // Repurposed for start distance
    speed?: number;
    direction?: 1 | -1;
    adTextureUrl?: string; // Kept for backwards compatibility if needed, but we'll use procedural now
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

    // Either load external texture or generate one based on startAngle (for randomness)
    const externalTexture = adTextureUrl ? useTexture(adTextureUrl) : null;
    if (externalTexture) {
        externalTexture.colorSpace = THREE.SRGBColorSpace;
        externalTexture.wrapS = THREE.RepeatWrapping;
        externalTexture.wrapT = THREE.RepeatWrapping;
        externalTexture.repeat.set(1, 1);
    }

    const proceduralTexture = useMemo(() => {
        return createAdTexture(Math.floor(startAngle));
    }, [startAngle]);

    const activeTexture = externalTexture || proceduralTexture;

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

        groupRef.current.position.set(x, 0.45, z);
        groupRef.current.lookAt(nextX, 0.45, nextZ);
    });

    return (
        <group ref={groupRef}>
            {/* Rotate -90 degrees so the modeled +X front aligns with the actual -Z forward vector used by lookAt */}
            <group rotation={[0, -Math.PI / 2, 0]}>
                {/* Truck Cabin */}
                <mesh position={[0.8, 0, 0]} castShadow>
                    <boxGeometry args={[0.6, 0.6, 0.6]} />
                    <meshPhysicalMaterial
                        color={isDark ? '#2a2a35' : '#14F195'} // Bright Solana Green or Dark Blue-Grey
                        metalness={0.7}
                        roughness={0.2}
                        clearcoat={1.0}
                        clearcoatRoughness={0.1}
                    />
                </mesh>

                {/* Windshield */}
                <mesh position={[1.11, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[0.5, 0.3]} />
                    <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
                </mesh>

                {/* Headlights */}
                <mesh position={[1.11, -0.15, 0.2]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDark ? 5 : 1} />
                </mesh>
                <mesh position={[1.11, -0.15, -0.2]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[0.1, 0.1]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={isDark ? 5 : 1} />
                </mesh>

                {/* Taillights */}
                <mesh position={[-1.31, -0.15, 0.3]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.08, 0.08]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={isDark ? 2 : 0.5} />
                </mesh>
                <mesh position={[-1.31, -0.15, -0.3]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.08, 0.08]} />
                    <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={isDark ? 2 : 0.5} />
                </mesh>

                {/* Truck Cargo/Container */}
                <group position={[-0.4, 0.2, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[1.8, 1, 0.8]} />
                        <meshStandardMaterial color={isDark ? '#1a1a1a' : '#d5d5d5'} metalness={0.2} roughness={0.7} />
                    </mesh>

                    {/* Ad Texture on Left Side */}
                    <mesh position={[0, 0, 0.41]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[1.7, 0.9]} />
                        <meshStandardMaterial map={activeTexture} emissiveMap={activeTexture} emissiveIntensity={isDark ? 0.3 : 0} emissive="#ffffff" roughness={0.4} />
                    </mesh>

                    {/* Ad Texture on Right Side */}
                    <mesh position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[1.7, 0.9]} />
                        <meshStandardMaterial map={activeTexture} emissiveMap={activeTexture} emissiveIntensity={isDark ? 0.3 : 0} emissive="#ffffff" roughness={0.4} />
                    </mesh>

                    {/* Ad Texture on Back Side */}
                    <mesh position={[-0.91, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                        <planeGeometry args={[0.7, 0.9]} />
                        <meshStandardMaterial map={activeTexture} emissiveMap={activeTexture} emissiveIntensity={isDark ? 0.3 : 0} emissive="#ffffff" roughness={0.4} />
                    </mesh>
                </group>

                {/* Wheels */}
                {[
                    [-1, -0.3, 0.4], [-1, -0.3, -0.4],
                    [0, -0.3, 0.4], [0, -0.3, -0.4],
                    [0.9, -0.3, 0.4], [0.9, -0.3, -0.4]
                ].map((pos, i) => (
                    <group key={i} position={pos as [number, number, number]} rotation={[0, 0, 0]}>
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.12, 24]} />
                            <meshStandardMaterial color="#111" roughness={0.9} />
                        </mesh>
                        <mesh rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.08, 0.08, 0.13, 16]} />
                            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    );
}
