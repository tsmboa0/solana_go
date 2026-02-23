// ============================================================
// Turn Banner — Solvestor (SWS)
// ============================================================
// Cinematic "Your Turn" / "Opponent's Turn" banner.
// Slides in on turn change, auto-dismisses.
// ============================================================

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { TURN_BANNER_DURATION } from '@/config/game';

export function TurnBanner() {
    const showTurnBanner = useUIStore((s) => s.showTurnBanner);
    const setShowTurnBanner = useUIStore((s) => s.setShowTurnBanner);
    const currentPlayer = useGameStore(selectCurrentPlayer);
    const turnNumber = useGameStore((s) => s.turnNumber);
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // Show banner on turn change
    useEffect(() => {
        setShowTurnBanner(true);
        const timer = setTimeout(() => {
            setShowTurnBanner(false);
        }, TURN_BANNER_DURATION * 1000);
        return () => clearTimeout(timer);
    }, [turnNumber, setShowTurnBanner]);

    return (
        <AnimatePresence>
            {showTurnBanner && (
                <motion.div
                    className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="text-center"
                        initial={{ scale: 0.7, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 1.1, y: -20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    >
                        <div
                            className={`text-sm font-medium tracking-widest uppercase mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'
                                }`}
                        >
                            Turn {turnNumber}
                        </div>
                        <div
                            className="text-3xl font-bold"
                            style={{ color: currentPlayer.color }}
                        >
                            {currentPlayer.name}
                        </div>
                        <div
                            className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-600'
                                }`}
                        >
                            Roll the dice
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
