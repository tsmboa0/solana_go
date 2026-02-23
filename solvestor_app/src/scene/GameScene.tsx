// ============================================================
// Game Scene — Solvestor (SWS)
// ============================================================
// R3F Canvas wrapper: contains all 3D elements.
// Separate from UI overlays which render as standard React.
// ============================================================

import { Canvas } from '@react-three/fiber';
import { Board } from './Board';
import { TileGroup } from './TileGroup';
import { PlayerToken } from './PlayerToken';
import { DiceScene } from './DiceScene';
import { CameraController } from './CameraController';
import { LightingRig } from './LightingRig';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { CAMERA_START_POSITION } from '@/config/game';

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
                toneMappingExposure: 1.2,
            }}
        >
            <CameraController />
            <LightingRig />
            <Board />
            <TileGroup />
            {players.map((player, index) => (
                <PlayerToken key={player.id} player={player} index={index} />
            ))}
            <DiceScene />

            {/* Fog for depth atmosphere */}
            <fog
                attach="fog"
                args={[
                    theme === 'dark' ? '#0a0a0f' : '#f5f5f7',
                    8,
                    20,
                ]}
            />
        </Canvas>
    );
}
