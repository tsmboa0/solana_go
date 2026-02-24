import { useUIStore } from '@/stores/useUIStore';
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
            <fog attach="fog" args={[fogColor, 20, 50]} />

            {/* Base Citymatic Lighting */}
            <ambientLight intensity={isDark ? 0.4 : 0.8} />
            <hemisphereLight
                skyColor={isDark ? '#222233' : '#ffffff'}
                groundColor={isDark ? '#050508' : '#aaaaaa'}
                intensity={isDark ? 0.3 : 0.5}
            />
            {/* Main Directional Sun */}
            <directionalLight
                position={[15, 25, 10]}
                intensity={isDark ? 1.0 : 1.5}
                color={isDark ? '#e0e0ff' : '#ffffff'}
                castShadow
                shadow-bias={-0.0001}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
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
