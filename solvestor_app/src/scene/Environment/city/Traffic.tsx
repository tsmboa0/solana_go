import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ROAD_OFFSET } from '@/config/game';

const CAR_SPEED = 2; // units per second
const CAR_COLORS = ['#ff4444', '#4444ff', '#ffffff', '#ffff44'];

export function Traffic() {
    return (
        <group>
            {/* 4 simple cars along the ring road */}
            <Car index={0} offset={0} lane={1} />
            <Car index={1} offset={0.25} lane={-1} />
            <Car index={2} offset={0.5} lane={1} />
            <Car index={3} offset={0.75} lane={-1} />
        </group>
    );
}

function Car({ index, offset, lane }: { index: number; offset: number; lane: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const R = ROAD_OFFSET + lane * 0.4; // inner/outer lane based on lane center
    const pathLength = R * 8;
    const speed = lane > 0 ? CAR_SPEED : -CAR_SPEED * 1.2;

    useFrame((state) => {
        if (!meshRef.current) return;

        let t = (state.clock.elapsedTime * speed / pathLength + offset) % 1;
        if (t < 0) t += 1;

        const sideTime = (t * 4) % 4;
        const side = Math.floor(sideTime);
        const lerp = sideTime - side;

        let px = 0;
        let pz = 0;
        let rotY = 0;

        if (side === 0) {
            px = -R + lerp * 2 * R;
            pz = -R;
            rotY = -Math.PI / 2;
        } else if (side === 1) {
            px = R;
            pz = -R + lerp * 2 * R;
            rotY = 0;
        } else if (side === 2) {
            px = R - lerp * 2 * R;
            pz = R;
            rotY = Math.PI / 2;
        } else if (side === 3) {
            px = -R;
            pz = R - lerp * 2 * R;
            rotY = Math.PI;
        }

        if (speed < 0) {
            rotY += Math.PI;
        }

        meshRef.current.position.set(px, 0.1, pz);
        meshRef.current.rotation.y = rotY;
    });

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.2, 0.6]} />
            <meshStandardMaterial color={CAR_COLORS[index]} roughness={0.4} metalness={0.6} />
        </mesh>
    );
}
