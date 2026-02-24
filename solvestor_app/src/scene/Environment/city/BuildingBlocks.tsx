import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BOARD_TOTAL_SIZE, ROAD_OFFSET } from '@/config/game';
import { useUIStore } from '@/stores/useUIStore';

export function BuildingBlocks() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const { whiteTransforms, glassTransforms, grayTransforms } = useMemo(() => {
        const white: THREE.Matrix4[] = [];
        const glass: THREE.Matrix4[] = [];
        const gray: THREE.Matrix4[] = [];

        const dummy = new THREE.Object3D();

        const roadWidth = (BOARD_TOTAL_SIZE || 6.35) * 0.4;
        const ringOuter = ROAD_OFFSET + roadWidth / 2;

        const blockSize = 2; // xy size
        const blockSpacing = 1.0; // gap
        const step = blockSize + blockSpacing;

        const maxDist = 36; // max distance from center

        const roadMargin = roadWidth / 2 + 0.8; // Give buildings some breathing room off the roads

        // simple seeded random for deterministic placement
        let seed = 998244353;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        const quadrants = [
            { dirX: 1, dirZ: 1 },
            { dirX: -1, dirZ: 1 },
            { dirX: 1, dirZ: -1 },
            { dirX: -1, dirZ: -1 }
        ];

        for (const quad of quadrants) {
            // align first building edge to the road margin + plaza edge
            const startX = roadMargin + blockSize / 2;
            const startZ = ringOuter + 1 + blockSize / 2;

            for (let xOff = startX; xOff <= maxDist; xOff += step) {
                for (let zOff = startZ; zOff <= maxDist; zOff += step) {

                    const x = xOff * quad.dirX;
                    const z = zOff * quad.dirZ;

                    // Make the city roughly circular outer bounds
                    const distSq = x * x + z * z;
                    if (distSq > maxDist * maxDist) continue;

                    // Add organic fade-out chance
                    if (distSq > (maxDist * 0.7) ** 2) {
                        if (random() > 0.4) continue;
                    }

                    const height = 3 + random() * 5; // Height 3-8
                    const scaleX = blockSize * (0.8 + 0.2 * random());
                    const scaleZ = blockSize * (0.8 + 0.2 * random());

                    // Do NOT randomly rotate buildings
                    dummy.position.set(x, height / 2 - 0.05, z);
                    dummy.scale.set(scaleX, height, scaleZ);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();

                    const matType = random();
                    if (matType < 0.40) {
                        white.push(dummy.matrix.clone());
                    } else if (matType < 0.75) {
                        glass.push(dummy.matrix.clone());
                    } else {
                        gray.push(dummy.matrix.clone());
                    }
                }
            }

            // Do the same for zOff along X axis but avoid doubling the corner
            for (let xOff = ringOuter + 1 + blockSize / 2; xOff <= maxDist; xOff += step) {
                for (let zOff = roadMargin + blockSize / 2; zOff < ringOuter + 1 + blockSize / 2; zOff += step) {
                    const x = xOff * quad.dirX;
                    const z = zOff * quad.dirZ;

                    const distSq = x * x + z * z;
                    if (distSq > maxDist * maxDist) continue;
                    if (distSq > (maxDist * 0.7) ** 2 && random() > 0.4) continue;

                    const height = 3 + random() * 5;
                    const scaleX = blockSize * (0.8 + 0.2 * random());
                    const scaleZ = blockSize * (0.8 + 0.2 * random());

                    dummy.position.set(x, height / 2 - 0.05, z);
                    dummy.scale.set(scaleX, height, scaleZ);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();

                    const matType = random();
                    if (matType < 0.40) {
                        white.push(dummy.matrix.clone());
                    } else if (matType < 0.75) {
                        glass.push(dummy.matrix.clone());
                    } else {
                        gray.push(dummy.matrix.clone());
                    }
                }
            }
        }

        return { whiteTransforms: white, glassTransforms: glass, grayTransforms: gray };
    }, []);

    const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#aaaaaa' : '#ffffff',
        roughness: 0.1,
        metalness: 0.2
    }), [isDark]);

    const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#3d5c75' : '#88bbff',
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.9
    }), [isDark]);

    const grayMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#555555' : '#e0e0e0',
        roughness: 0.7,
        metalness: 0.2
    }), [isDark]);

    return (
        <group>
            <InstancedBlocks transforms={whiteTransforms} material={whiteMat} />
            <InstancedBlocks transforms={glassTransforms} material={glassMat} />
            <InstancedBlocks transforms={grayTransforms} material={grayMat} />
        </group>
    );
}

function InstancedBlocks({ transforms, material }: { transforms: THREE.Matrix4[], material: THREE.Material }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (meshRef.current && transforms.length > 0) {
            transforms.forEach((mat, i) => {
                meshRef.current!.setMatrixAt(i, mat);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [transforms]);

    if (transforms.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <primitive object={material} attach="material" />
        </instancedMesh>
    );
}
