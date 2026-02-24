// ============================================================
// Game Scene — Solvestor (SWS)
// ============================================================
// R3F Canvas wrapper: contains all 3D elements.
// Separate from UI overlays which render as standard React.
// ============================================================

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Board } from './Board';
import { TileGroup } from './TileGroup';
import { PlayerToken } from './PlayerToken';
import { DiceScene } from './DiceScene';
import { CameraController } from './CameraController';
import { LightingRig } from './LightingRig';
import { Cityscape } from './Environment/Cityscape';
import { GridFloor } from './Environment/GridFloor';
import { RoadNetwork } from './Environment/RoadNetwork';
import { AdTruck } from './Environment/AdTruck';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { CAMERA_START_POSITION } from '@/config/game';
import boardImage from '@/assets/solvestor-board.webp';

export function GameScene() {
    const players = useGameStore((s) => s.players);
    const theme = useUIStore((s) => s.theme);

    return (
        <Canvas
            shadows
            camera={{
                position: CAMERA_START_POSITION,
                fov: 50,
                near: 0.1,
                far: 100,
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: theme === 'dark' ? '#0a0a0f' : '#f5f5f7',
            }}
            gl={{
                antialias: true,
                toneMapping: 3, // ACESFilmicToneMapping
                toneMappingExposure: 1.0, // Neutral exposure so it doesn't bleach the board texture
            }}
        >
            <CameraController />
            <LightingRig />

            {/* Environment */}
            <Cityscape />
            <GridFloor />
            <RoadNetwork />
            <Suspense fallback={null}>
                {/* 
                    Using the board image as a placeholder for the AdTruck texture. 
                    In a real scenario, you would pass a dedicated rectangular ad texture. 
                */}
                <AdTruck
                    startAngle={0}
                    speed={2.0}
                    direction={-1} // Drive clockwise
                    adTextureUrl={boardImage}
                />
                <AdTruck
                    startAngle={28} // Start on opposite side (perimeter is 56)
                    speed={2.2}
                    direction={-1} // Drive clockwise so they don't collide
                    adTextureUrl={boardImage}
                />
            </Suspense>

            <Board />
            <TileGroup />
            {players.map((player, index) => (
                <PlayerToken key={player.id} player={player} index={index} />
            ))}

            {/* Rapier physics world — only dice live here */}
            <Suspense>
                <Physics gravity={[0, -9.81, 0]}>
                    <DiceScene />
                </Physics>
            </Suspense>

            {/* Post-Processing Effects */}
            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.5}
                    luminanceSmoothing={0.9}
                    intensity={theme === 'dark' ? 1.2 : 0.4}
                    mipmapBlur
                />
            </EffectComposer>

            {/* Fog for depth atmosphere */}
            <fog
                attach="fog"
                args={[
                    theme === 'dark' ? '#0a0a0f' : '#f5f5f7',
                    20,
                    65, // Push fog further back so buildings are visible but fade out naturally
                ]}
            />
        </Canvas>
    );
}
