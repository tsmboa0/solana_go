import * as THREE from 'three';
import { useMemo } from 'react';
import { BOARD_TOTAL_SIZE, ROAD_OFFSET } from '@/config/game';
import { useUIStore } from '@/stores/useUIStore';

export function Roads() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // roadWidth proportional to board size
    const roadWidth = (BOARD_TOTAL_SIZE || 6.35) * 0.4;
    const roadColor = isDark ? '#111115' : '#1a1a1a'; // Dark gray asphalt
    const sidewalkColor = isDark ? '#222228' : '#e5e5e5';
    const sidewalkHeight = 0.05;

    const sidewalkWidth = 0.8;

    // ring road geometry
    const ringInner = ROAD_OFFSET - roadWidth / 2;
    const ringOuter = ROAD_OFFSET + roadWidth / 2;
    const ringCenter = ROAD_OFFSET; // Center distance

    const { ringGeo, innerSidewalkGeo, outerSidewalkGeo } = useMemo(() => {
        // Main Road
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

        // Inner Sidewalk
        const shapeIn = new THREE.Shape();
        shapeIn.moveTo(-ringInner, -ringInner);
        shapeIn.lineTo(ringInner, -ringInner);
        shapeIn.lineTo(ringInner, ringInner);
        shapeIn.lineTo(-ringInner, ringInner);
        shapeIn.lineTo(-ringInner, -ringInner);

        const holeIn = new THREE.Path();
        holeIn.moveTo(-(ringInner - sidewalkWidth), -(ringInner - sidewalkWidth));
        holeIn.lineTo((ringInner - sidewalkWidth), -(ringInner - sidewalkWidth));
        holeIn.lineTo((ringInner - sidewalkWidth), (ringInner - sidewalkWidth));
        holeIn.lineTo(-(ringInner - sidewalkWidth), (ringInner - sidewalkWidth));
        holeIn.lineTo(-(ringInner - sidewalkWidth), -(ringInner - sidewalkWidth));
        shapeIn.holes.push(holeIn);

        // Outer Sidewalk
        const shapeOut = new THREE.Shape();
        shapeOut.moveTo(-(ringOuter + sidewalkWidth), -(ringOuter + sidewalkWidth));
        shapeOut.lineTo((ringOuter + sidewalkWidth), -(ringOuter + sidewalkWidth));
        shapeOut.lineTo((ringOuter + sidewalkWidth), (ringOuter + sidewalkWidth));
        shapeOut.lineTo(-(ringOuter + sidewalkWidth), (ringOuter + sidewalkWidth));
        shapeOut.lineTo(-(ringOuter + sidewalkWidth), -(ringOuter + sidewalkWidth));

        const holeOut = new THREE.Path();
        holeOut.moveTo(-ringOuter, -ringOuter);
        holeOut.lineTo(ringOuter, -ringOuter);
        holeOut.lineTo(ringOuter, ringOuter);
        holeOut.lineTo(-ringOuter, ringOuter);
        holeOut.lineTo(-ringOuter, -ringOuter);
        shapeOut.holes.push(holeOut);

        return {
            ringGeo: new THREE.ShapeGeometry(shape),
            innerSidewalkGeo: new THREE.ShapeGeometry(shapeIn),
            outerSidewalkGeo: new THREE.ShapeGeometry(shapeOut)
        };
    }, [ringInner, ringOuter, sidewalkWidth]);

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

            {/* Sidewalks */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sidewalkHeight, 0]} geometry={innerSidewalkGeo} receiveShadow>
                <meshStandardMaterial color={sidewalkColor} roughness={0.9} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, sidewalkHeight, 0]} geometry={outerSidewalkGeo} receiveShadow>
                <meshStandardMaterial color={sidewalkColor} roughness={0.9} />
            </mesh>

            {/* 4 Straight Roads extending outwards */}
            <group>
                <StraightRoad pos={[0, 0, -(ringOuter + straightLength / 2)]} rot={[-Math.PI / 2, 0, 0]} length={straightLength} width={roadWidth} sidewalkWidth={sidewalkWidth} roadColor={roadColor} sidewalkColor={sidewalkColor} height={sidewalkHeight} />
                <StraightRoad pos={[0, 0, ringOuter + straightLength / 2]} rot={[-Math.PI / 2, 0, 0]} length={straightLength} width={roadWidth} sidewalkWidth={sidewalkWidth} roadColor={roadColor} sidewalkColor={sidewalkColor} height={sidewalkHeight} />
                <StraightRoad pos={[ringOuter + straightLength / 2, 0, 0]} rot={[-Math.PI / 2, 0, Math.PI / 2]} length={straightLength} width={roadWidth} sidewalkWidth={sidewalkWidth} roadColor={roadColor} sidewalkColor={sidewalkColor} height={sidewalkHeight} />
                <StraightRoad pos={[-(ringOuter + straightLength / 2), 0, 0]} rot={[-Math.PI / 2, 0, Math.PI / 2]} length={straightLength} width={roadWidth} sidewalkWidth={sidewalkWidth} roadColor={roadColor} sidewalkColor={sidewalkColor} height={sidewalkHeight} />
            </group>

            {/* Lane Markings (White dashed lines) */}
            <LaneMarkings
                ringCenter={ringCenter}
                ringOuter={ringOuter}
                straightLength={straightLength}
            />

            {/* Crosswalks at the 4 intersections */}
            <Crosswalks ringOuter={ringOuter} roadWidth={roadWidth} />
        </group>
    );
}

function StraightRoad({ pos, rot, length, width, sidewalkWidth, roadColor, sidewalkColor, height }: any) {
    return (
        <group position={pos} rotation={rot} receiveShadow>
            <mesh receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color={roadColor} roughness={0.8} metalness={0.1} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
            <mesh position={[width / 2 + sidewalkWidth / 2, 0, height]} receiveShadow>
                <planeGeometry args={[sidewalkWidth, length]} />
                <meshStandardMaterial color={sidewalkColor} roughness={0.9} />
            </mesh>
            <mesh position={[-(width / 2 + sidewalkWidth / 2), 0, height]} receiveShadow>
                <planeGeometry args={[sidewalkWidth, length]} />
                <meshStandardMaterial color={sidewalkColor} roughness={0.9} />
            </mesh>
        </group>
    );
}

function Crosswalks({ ringOuter, roadWidth }: { ringOuter: number, roadWidth: number }) {
    const crosswalkMat = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';

        for (let x = 0; x < 256; x += 32) {
            ctx.fillRect(x + 4, 0, 24, 64);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(roadWidth / 2, 1);

        return new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
    }, [roadWidth]);

    const cwWidth = roadWidth;
    const cwDepth = 1.2;
    const offset = ringOuter + cwDepth / 2;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -offset]}>
                <planeGeometry args={[cwWidth, cwDepth]} />
                <primitive object={crosswalkMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, offset]}>
                <planeGeometry args={[cwWidth, cwDepth]} />
                <primitive object={crosswalkMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-offset, 0.05, 0]}>
                <planeGeometry args={[cwWidth, cwDepth]} />
                <primitive object={crosswalkMat} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[offset, 0.05, 0]}>
                <planeGeometry args={[cwWidth, cwDepth]} />
                <primitive object={crosswalkMat} attach="material" />
            </mesh>
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
