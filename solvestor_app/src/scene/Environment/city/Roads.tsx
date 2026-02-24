import * as THREE from 'three';
import { useMemo } from 'react';
import { BOARD_TOTAL_SIZE, ROAD_OFFSET } from '@/config/game';

export function Roads() {
    // roadWidth proportional to board size
    const roadWidth = (BOARD_TOTAL_SIZE || 6.35) * 0.4;
    const roadColor = '#1a1a1a'; // Dark gray asphalt

    // ring road geometry
    const ringInner = ROAD_OFFSET - roadWidth / 2;
    const ringOuter = ROAD_OFFSET + roadWidth / 2;
    const ringCenter = ROAD_OFFSET; // Center distance

    const ringGeo = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-ringOuter, -ringOuter);
        shape.lineTo(ringOuter, -ringOuter);
        shape.lineTo(ringOuter, ringOuter);
        shape.lineTo(-ringOuter, ringOuter);
        shape.lineTo(-ringOuter, -ringOuter);

        const hole = new THREE.Path();
        hole.moveTo(-ringInner, -ringInner);
        hole.lineTo(ringInner, -ringInner);
        hole.lineTo(ringInner, ringInner);
        hole.lineTo(-ringInner, ringInner);
        hole.lineTo(-ringInner, -ringInner);
        shape.holes.push(hole);

        return new THREE.ShapeGeometry(shape);
    }, [ringInner, ringOuter]);

    const straightLength = 60; // outward extension length

    return (
        <group position={[0, -0.05, 0]}>
            {/* Main Ring Road */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo} receiveShadow>
                <meshStandardMaterial
                    color={roadColor}
                    roughness={0.8}
                    metalness={0.1}
                    polygonOffset={true}
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                />
            </mesh>

            {/* 4 Straight Roads extending outwards */}
            <group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -(ringOuter + straightLength / 2)]} receiveShadow>
                    <planeGeometry args={[roadWidth, straightLength]} />
                    <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} polygonOffset polygonOffsetFactor={-1} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ringOuter + straightLength / 2]} receiveShadow>
                    <planeGeometry args={[roadWidth, straightLength]} />
                    <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} polygonOffset polygonOffsetFactor={-1} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[ringOuter + straightLength / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[roadWidth, straightLength]} />
                    <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} polygonOffset polygonOffsetFactor={-1} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-(ringOuter + straightLength / 2), 0, 0]} receiveShadow>
                    <planeGeometry args={[roadWidth, straightLength]} />
                    <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} polygonOffset polygonOffsetFactor={-1} />
                </mesh>
            </group>

            {/* Lane Markings (White dashed lines) */}
            <LaneMarkings
                ringCenter={ringCenter}
                ringOuter={ringOuter}
                straightLength={straightLength}
            />
        </group>
    );
}

function LaneMarkings({ ringCenter, ringOuter, straightLength }: { ringCenter: number, ringOuter: number, straightLength: number }) {
    const dashMaterial = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(24, 0, 16, 128); // Dash: 16px wide, 128px long

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;

        return new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
    }, []);

    const sideLength = ringCenter * 2;

    const sideMat = dashMaterial.clone();
    if (sideMat.map) {
        sideMat.map = sideMat.map.clone();
        sideMat.map.repeat.set(1, sideLength / 2);
    }

    const straightMat = dashMaterial.clone();
    if (straightMat.map) {
        straightMat.map = straightMat.map.clone();
        straightMat.map.repeat.set(1, straightLength / 2);
    }

    return (
        <group>
            {/* Square Ring Markings */}
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0, -ringCenter]}>
                <planeGeometry args={[0.2, sideLength]} />
                <primitive object={sideMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0, ringCenter]}>
                <planeGeometry args={[0.2, sideLength]} />
                <primitive object={sideMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ringCenter, 0, 0]}>
                <planeGeometry args={[0.2, sideLength]} />
                <primitive object={sideMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ringCenter, 0, 0]}>
                <planeGeometry args={[0.2, sideLength]} />
                <primitive object={sideMat} attach="material" />
            </mesh>

            {/* Outward straight markings */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -(ringOuter + straightLength / 2)]}>
                <planeGeometry args={[0.2, straightLength]} />
                <primitive object={straightMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ringOuter + straightLength / 2]}>
                <planeGeometry args={[0.2, straightLength]} />
                <primitive object={straightMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-(ringOuter + straightLength / 2), 0, 0]}>
                <planeGeometry args={[0.2, straightLength]} />
                <primitive object={straightMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[ringOuter + straightLength / 2, 0, 0]}>
                <planeGeometry args={[0.2, straightLength]} />
                <primitive object={straightMat} attach="material" />
            </mesh>
        </group>
    );
}
