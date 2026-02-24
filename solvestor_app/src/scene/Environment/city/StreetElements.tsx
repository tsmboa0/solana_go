import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ROAD_OFFSET, BOARD_TOTAL_SIZE } from '@/config/game';

export function StreetElements() {
    return (
        <group>
            {/* 4 Trees at inner plaza corners */}
            <Tree position={[-ROAD_OFFSET + 1.2, 0, -ROAD_OFFSET + 1.2]} />
            <Tree position={[ROAD_OFFSET - 1.2, 0, -ROAD_OFFSET + 1.2]} />
            <Tree position={[ROAD_OFFSET - 1.2, 0, ROAD_OFFSET - 1.2]} />
            <Tree position={[-ROAD_OFFSET + 1.2, 0, ROAD_OFFSET - 1.2]} />

            {/* Streetlights along roads */}
            <StreetLights />
        </group>
    );
}

function Tree({ position }: { position: [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            // Light wind sway using group rotation
            const sway = Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.05;
            groupRef.current.rotation.z = sway;
            groupRef.current.rotation.x = sway * 0.5;
        }
    });

    return (
        <group position={position}>
            <group ref={groupRef}>
                {/* Trunk */}
                <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.08, 0.12, 0.8]} />
                    <meshStandardMaterial color="#3d2a1d" roughness={0.9} />
                </mesh>
                {/* Leaves */}
                <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.2, 1.2, 1.2]} />
                    <meshStandardMaterial color="#2a6639" roughness={0.8} />
                </mesh>
            </group>
        </group>
    );
}

function StreetLights() {
    const { poleTransforms, headTransforms } = useMemo(() => {
        const positions: [number, number, number][] = [];
        const gap = 8;

        const roadWidth = (BOARD_TOTAL_SIZE || 6.35) * 0.4;
        const ringOuter = ROAD_OFFSET + roadWidth / 2;
        const R = ringOuter + 0.5;
        const maxDist = 32;

        // Straight roads lights
        for (let x = ringOuter + 2; x <= maxDist; x += gap) {
            positions.push([x, 0, roadWidth / 2 + 0.5]);
            positions.push([x, 0, -roadWidth / 2 - 0.5]);
            positions.push([-x, 0, roadWidth / 2 + 0.5]);
            positions.push([-x, 0, -roadWidth / 2 - 0.5]);
        }
        for (let z = ringOuter + 2; z <= maxDist; z += gap) {
            positions.push([roadWidth / 2 + 0.5, 0, z]);
            positions.push([-roadWidth / 2 - 0.5, 0, z]);
            positions.push([roadWidth / 2 + 0.5, 0, -z]);
            positions.push([-roadWidth / 2 - 0.5, 0, -z]);
        }

        // Ring road outer edge lights
        positions.push([-R, 0, -R], [R, 0, -R], [R, 0, R], [-R, 0, R]);
        positions.push([0, 0, -R], [0, 0, R], [-R, 0, 0], [R, 0, 0]);

        const dummy = new THREE.Object3D();
        const poles: THREE.Matrix4[] = [];
        const heads: THREE.Matrix4[] = [];

        positions.forEach(pos => {
            dummy.position.set(pos[0], 0.75, pos[2]);
            dummy.scale.set(1, 1, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            poles.push(dummy.matrix.clone());

            dummy.position.set(pos[0], 1.55, pos[2]);
            dummy.updateMatrix();
            heads.push(dummy.matrix.clone());
        });

        return { poleTransforms: poles, headTransforms: heads };
    }, []);

    const poleRef = useRef<THREE.InstancedMesh>(null);
    const headRef = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        if (poleRef.current && headRef.current) {
            poleTransforms.forEach((mat, i) => {
                poleRef.current!.setMatrixAt(i, mat);
                headRef.current!.setMatrixAt(i, headTransforms[i]);
            });
            poleRef.current.instanceMatrix.needsUpdate = true;
            headRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [poleTransforms, headTransforms]);

    return (
        <group>
            <instancedMesh ref={poleRef} args={[undefined, undefined, poleTransforms.length]} castShadow receiveShadow>
                <cylinderGeometry args={[0.04, 0.05, 1.5]} />
                <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
            </instancedMesh>

            <instancedMesh ref={headRef} args={[undefined, undefined, headTransforms.length]} castShadow receiveShadow>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffea" emissiveIntensity={0.8} />
            </instancedMesh>
        </group>
    );
}
