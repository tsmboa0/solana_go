// ============================================================
// Recenter Button — Solvestor (SWS)
// ============================================================
// Small floating button to snap camera back to player's tile.
// Only visible during free-look phases (waiting / turnEnd).
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { recenterCamera } from '@/scene/CameraController';

export function RecenterButton() {
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    const isCameraDetached = useCameraStore((s) => s.isCameraDetached);

    // Only show when the user has manually explored away from the auto-target
    const isVisible = isCameraDetached;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    onClick={recenterCamera}
                    className={`
            fixed bottom-4 right-4 z-40
            w-10 h-10 rounded-full flex items-center justify-center
            ${isDark
                            ? 'bg-[rgba(16,16,32,0.8)] border border-white/10 text-white/70'
                            : 'bg-white/90 border border-gray-200 shadow-sm text-gray-600'
                        }
            backdrop-blur-md
            active:scale-90 transition-transform
          `}
                    title="Recenter camera"
                >
                    <span className="text-base">🎯</span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
