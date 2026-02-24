import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useUIStore } from '@/stores/useUIStore';
import { COLORS } from '@/config/theme';
import { ROAD_OFFSET, CITY_OFFSET } from '@/config/game';

const DEFI_COUNT = 300;
const VALIDATOR_COUNT = 200;

export function Cityscape() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const defiMeshRef = useRef<THREE.InstancedMesh>(null);
    const validatorMeshRef = useRef<THREE.InstancedMesh>(null);

    // Procedurally generate positions once
    const matrices = useMemo(() => {
        const dummy = new THREE.Object3D();

        // The road is ROAD_OFFSET away from center, and width is 2.
        // We want buildings to start right after the outer edge of the road (plus the configurable CITY_OFFSET gap).
        const CITY_START = ROAD_OFFSET + CITY_OFFSET;

        // DeFi Buildings (Glassy Skyscrapers)
        // Located generally in the +X, +Z quadrant, but scattered around
        const defiTransforms: THREE.Matrix4[] = [];
        for (let i = 0; i < DEFI_COUNT; i++) {
            let x = 0, z = 0;
            // Generate coordinates outside the city start square, up to 35x35
            do {
                x = (Math.random() - 0.5) * 70;
                z = (Math.random() - 0.5) * 70;
            } while (Math.abs(x) < CITY_START && Math.abs(z) < CITY_START);

            const width = 1 + Math.random() * 2;
            const height = 1 + Math.random() * 4; // Much shorter
            const depth = 1 + Math.random() * 2;

            dummy.position.set(x, (height / 2) - 0.2, z); // shift down to touch ground
            dummy.scale.set(width, height, depth);
            dummy.updateMatrix();
            defiTransforms.push(dummy.matrix.clone());
        }

        // Validator Towers (Monolithic server-racks)
        // Located generally in the -X, -Z quadrant
        const validatorTransforms: THREE.Matrix4[] = [];
        for (let i = 0; i < VALIDATOR_COUNT; i++) {
            let x = 0, z = 0;
            do {
                x = (Math.random() - 0.5) * 70;
                z = (Math.random() - 0.5) * 70;
            } while (Math.abs(x) < CITY_START && Math.abs(z) < CITY_START);

            const width = 2 + Math.random() * 3;
            const height = 1 + Math.random() * 3; // Much shorter
            const depth = 2 + Math.random() * 3;

            dummy.position.set(x, (height / 2) - 0.2, z);
            dummy.scale.set(width, height, depth);
            dummy.updateMatrix();
            validatorTransforms.push(dummy.matrix.clone());
        }

        // Apply transforms immediately instead of using setTimeout
        // React 18+ useMemo runs during render, and refs might not be attached yet, 
        // BUT assigning to instanceMatrix array directly handles initialization safely.
        return { defiTransforms, validatorTransforms };
    }, []);


    useLayoutEffect(() => {
        if (defiMeshRef.current) {
            for (let i = 0; i < DEFI_COUNT; i++) {
                defiMeshRef.current.setMatrixAt(i, matrices.defiTransforms[i]);
            }
            defiMeshRef.current.instanceMatrix.needsUpdate = true;
        }
        if (validatorMeshRef.current) {
            for (let i = 0; i < VALIDATOR_COUNT; i++) {
                validatorMeshRef.current.setMatrixAt(i, matrices.validatorTransforms[i]);
            }
            validatorMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [matrices]);

    return (
        <group>
            {/* DeFi Glass Towers */}
            <instancedMesh
                ref={defiMeshRef}
                args={[undefined, undefined, DEFI_COUNT]}
                receiveShadow
                castShadow
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color={isDark ? '#050510' : '#ffffff'}
                    metalness={isDark ? 0.8 : 0.2}
                    roughness={isDark ? 0.2 : 0.1}
                    transparent
                    opacity={isDark ? 0.9 : 0.6}
                    envMapIntensity={isDark ? 1 : 2}
                />
            </instancedMesh>

            {/* Validator Towers */}
            <instancedMesh
                ref={validatorMeshRef}
                args={[undefined, undefined, VALIDATOR_COUNT]}
                receiveShadow
                castShadow
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color={isDark ? '#12121a' : '#d0d0d8'}
                    metalness={0.5}
                    roughness={0.7}
                    emissive={isDark ? COLORS.solanaPurple : COLORS.solanaGreen}
                    emissiveIntensity={isDark ? 0.05 : 0.02} // very subtle edge glow
                    wireframe={false}
                />
            </instancedMesh>
        </group>
    );
}
