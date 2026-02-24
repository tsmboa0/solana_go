import { useUIStore } from '@/stores/useUIStore';
import { COLORS } from '@/config/theme';
import * as THREE from 'three';

export function GridFloor() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const color = isDark ? COLORS.solanaPurple : COLORS.textSecondary;

    return (
        <group position={[0, -0.2, 0]}>
            <gridHelper
                args={[
                    100, // Size of the grid
                    100, // Number of divisions
                    color, // Center line color
                    color, // Grid grid color
                ]}
                position={[0, 0, 0]}
            >
                {/* Make the grid fade out so it doesn't abruptly end. 
                    Adding a custom material to override the default LineBasicMaterial */}
                <lineBasicMaterial
                    color={color}
                    transparent
                    opacity={isDark ? 0.3 : 0.15}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </gridHelper>
        </group>
    );
}
