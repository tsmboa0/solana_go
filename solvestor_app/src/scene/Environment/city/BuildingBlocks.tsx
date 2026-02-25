import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BOARD_TOTAL_SIZE, ROAD_OFFSET } from '@/config/game';
import { useUIStore } from '@/stores/useUIStore';

export function BuildingBlocks() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const { transforms1, transforms2, transforms3, transforms4 } = useMemo(() => {
        const t1: THREE.Matrix4[] = [];
        const t2: THREE.Matrix4[] = [];
        const t3: THREE.Matrix4[] = [];
        const t4: THREE.Matrix4[] = [];
        const dummy = new THREE.Object3D();

        const roadWidth = (BOARD_TOTAL_SIZE || 6.35) * 0.4;
        const ringOuter = ROAD_OFFSET + roadWidth / 2;

        const blockSize = 2; // xy size
        const blockSpacing = 1.0; // gap
        const step = blockSize + blockSpacing;

        const maxDist = 36; // max distance from center
        const roadMargin = roadWidth / 2 + 0.8; // Give buildings some breathing room off the roads

        let seed = 12345;
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
            const startX = roadMargin + blockSize / 2;
            const startZ = ringOuter + 1 + blockSize / 2;

            for (let xOff = startX; xOff <= maxDist; xOff += step) {
                for (let zOff = startZ; zOff <= maxDist; zOff += step) {

                    const x = xOff * quad.dirX;
                    const z = zOff * quad.dirZ;

                    const distSq = x * x + z * z;
                    if (distSq > maxDist * maxDist) continue;

                    if (distSq > (maxDist * 0.7) ** 2) {
                        if (random() > 0.4) continue;
                    }

                    const r = random();
                    const isFar = distSq > (maxDist * 0.5) ** 2;
                    let height = 0;

                    if (r < 0.1 && isFar) {
                        height = 10 + random() * 6; // Tall (10-16)
                    } else if (r < 0.4) {
                        height = 2 + random() * 1;  // Short (2-3)
                    } else {
                        height = 4 + random() * 2;  // Medium (4-6)
                    }

                    const scaleX = blockSize * (0.8 + 0.2 * random());
                    const scaleZ = blockSize * (0.8 + 0.2 * random());

                    dummy.position.set(x, height / 2 - 0.05, z);
                    dummy.scale.set(scaleX, height, scaleZ);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();

                    const rType = random();
                    if (rType < 0.25) t1.push(dummy.matrix.clone());
                    else if (rType < 0.50) t2.push(dummy.matrix.clone());
                    else if (rType < 0.75) t3.push(dummy.matrix.clone());
                    else t4.push(dummy.matrix.clone());
                }
            }

            // X-axis alignment
            for (let xOff = ringOuter + 1 + blockSize / 2; xOff <= maxDist; xOff += step) {
                for (let zOff = roadMargin + blockSize / 2; zOff < ringOuter + 1 + blockSize / 2; zOff += step) {
                    const x = xOff * quad.dirX;
                    const z = zOff * quad.dirZ;

                    const distSq = x * x + z * z;
                    if (distSq > maxDist * maxDist) continue;
                    if (distSq > (maxDist * 0.7) ** 2 && random() > 0.4) continue;

                    const r = random();
                    const isFar = distSq > (maxDist * 0.5) ** 2;
                    let height = 0;

                    if (r < 0.1 && isFar) {
                        height = 10 + random() * 6; // Tall (10-16)
                    } else if (r < 0.4) {
                        height = 2 + random() * 1;  // Short (2-3)
                    } else {
                        height = 4 + random() * 2;  // Medium (4-6)
                    }

                    const scaleX = blockSize * (0.8 + 0.2 * random());
                    const scaleZ = blockSize * (0.8 + 0.2 * random());

                    dummy.position.set(x, height / 2 - 0.05, z);
                    dummy.scale.set(scaleX, height, scaleZ);
                    dummy.rotation.set(0, 0, 0);
                    dummy.updateMatrix();

                    const rType = random();
                    if (rType < 0.25) t1.push(dummy.matrix.clone());
                    else if (rType < 0.50) t2.push(dummy.matrix.clone());
                    else if (rType < 0.75) t3.push(dummy.matrix.clone());
                    else t4.push(dummy.matrix.clone());
                }
            }
        }

        return { transforms1: t1, transforms2: t2, transforms3: t3, transforms4: t4 };
    }, []);

    const emissiveMap = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);

        for (let x = 4; x < 256; x += 32) {
            for (let y = 4; y < 256; y += 16) {
                if (Math.random() > 0.3) {
                    // Subtle variation in window brightness
                    ctx.fillStyle = Math.random() > 0.8 ? '#77aadd' : '#223355';
                    ctx.fillRect(x, y, 24, 12);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 4);
        tex.needsUpdate = true;
        return tex;
    }, []);

    const mat1 = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#1a2233' : '#aaccff', // Blue
        roughness: 0.3, metalness: 0.1,
        emissive: '#224466', emissiveMap, emissiveIntensity: isDark ? 0.7 : 0.3
    }), [isDark, emissiveMap]);

    const mat2 = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#1a332a' : '#aaffcc', // Teal
        roughness: 0.3, metalness: 0.1,
        emissive: '#226644', emissiveMap, emissiveIntensity: isDark ? 0.7 : 0.3
    }), [isDark, emissiveMap]);

    const mat3 = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#2a2233' : '#ccaaff', // Purple/Steel
        roughness: 0.3, metalness: 0.1,
        emissive: '#442266', emissiveMap, emissiveIntensity: isDark ? 0.7 : 0.3
    }), [isDark, emissiveMap]);

    const mat4 = useMemo(() => new THREE.MeshStandardMaterial({
        color: isDark ? '#1a1a1a' : '#dddddd', // Gray
        roughness: 0.3, metalness: 0.1,
        emissive: '#333333', emissiveMap, emissiveIntensity: isDark ? 0.7 : 0.3
    }), [isDark, emissiveMap]);

    return (
        <group>
            <InstancedBlocks transforms={transforms1} material={mat1} />
            <InstancedBlocks transforms={transforms2} material={mat2} />
            <InstancedBlocks transforms={transforms3} material={mat3} />
            <InstancedBlocks transforms={transforms4} material={mat4} />
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
            <boxGeometry args={[1, 1, 1]}>
                {/* Adjusting UVs so they tile nicely for all faces */}
                {/* Default BoxGeometry has UVs 0-1 on each face, which is perfect for our tiled texture */}
            </boxGeometry>
            <primitive object={material} attach="material" />
        </instancedMesh>
    );
}
