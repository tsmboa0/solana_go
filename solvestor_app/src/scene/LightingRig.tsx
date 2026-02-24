// ============================================================
// Lighting Rig — Solvestor (SWS)
// ============================================================
// Ambient + directional + accent point light.
// Theme-aware intensity adjustments.
// ============================================================

import { useRef } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { LIGHTING } from '@/config/theme';
import * as THREE from 'three';

export function LightingRig() {
    const theme = useUIStore((s) => s.theme);
    const directionalRef = useRef<THREE.DirectionalLight>(null);
    const isDark = theme === 'dark';

    return (
        <>
            {/* Soft overall illumination */}
            <ambientLight
                intensity={isDark ? LIGHTING.ambient.intensityDark : LIGHTING.ambient.intensityLight}
                color={LIGHTING.ambient.color}
            />

            {/* Main directional light — casts shadows */}
            <directionalLight
                ref={directionalRef}
                intensity={isDark ? LIGHTING.directional.intensityDark : LIGHTING.directional.intensityLight}
                color={LIGHTING.directional.color}
                position={LIGHTING.directional.position}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={0.5}
                shadow-camera-far={50}
                shadow-camera-left={-8}
                shadow-camera-right={8}
                shadow-camera-top={8}
                shadow-camera-bottom={-8}
            />

            {/* Atmospheric accent glow beneath board */}
            <pointLight
                intensity={isDark ? LIGHTING.accent.intensityDark : LIGHTING.accent.intensityLight}
                color={LIGHTING.accent.color}
                position={LIGHTING.accent.position}
                distance={10}
                decay={2}
            />

            {/* Subtle fill light from below-right */}
            <pointLight
                intensity={0.15}
                color="#14F195"
                position={[4, -1, 4]}
                distance={8}
                decay={2}
            />
        </>
    );
}
