import { useUIStore } from '@/stores/useUIStore';
import { Environment } from '@react-three/drei';
import { Plaza } from './city/Plaza';
import { Roads } from './city/Roads';
import { BuildingBlocks } from './city/BuildingBlocks';
import { Skyline } from './city/Skyline';
import { Traffic } from './city/Traffic';
import { StreetElements } from './city/StreetElements';
import { COLORS } from '@/config/theme';

export function Cityscape() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const fogColor = isDark ? COLORS.bgDark : COLORS.bgLight;

    return (
        <group>
            {/* Fog for distance depth */}
            <fog attach="fog" args={[fogColor, 40, 120]} />

            {/* Environment Reflections */}
            <Environment preset="city" environmentIntensity={isDark ? 0.05 : 0.1} />

            {/* Base Citymatic Lighting */}
            <ambientLight intensity={isDark ? 0.1 : 0.2} />
            <hemisphereLight
                args={[isDark ? '#222233' : '#ffffff', isDark ? '#050508' : '#aaaaaa', isDark ? 0.1 : 0.2]}
            />
            {/* Main Directional Sun */}
            <directionalLight
                position={[15, 25, 10]}
                intensity={isDark ? 0.1 : 0.2}
                color={isDark ? '#b0c0ff' : '#ffffff'}
                castShadow
                shadow-bias={-0.0001}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={1}
                shadow-camera-far={100}
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
            />

            <group position={[0, -0.05, 0]}>
                <Plaza />
                <Roads />
                <BuildingBlocks />
                <Skyline />
                <Traffic />
                <StreetElements />
            </group>
        </group>
    );
}
