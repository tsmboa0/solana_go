// ============================================================
// End Turn Button — Solvestor (SWS)
// ============================================================
// Appears after action phase to advance to next player.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/useGameStore';
import { useCameraStore } from '@/stores/useCameraStore';

export function EndTurnButton() {
    const phase = useGameStore((s) => s.phase);
    const endTurn = useGameStore((s) => s.endTurn);
    const followPlayer = useCameraStore((s) => s.followPlayer);
    const players = useGameStore((s) => s.players);
    const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

    const currentPlayer = players[currentPlayerIndex];
    const isCPUTurn = currentPlayer?.isCPU === true;
    const isExploreMode = useGameStore((s) => s.isExploreMode);

    // In explore mode, turns auto-end — no button needed
    const show = phase === 'turnEnd' && !isCPUTurn && !isExploreMode;

    const handleEndTurn = () => {
        endTurn();
        // Camera follows next player
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        followPlayer(players[nextIndex].position);
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                >
                    <button
                        onClick={handleEndTurn}
                        className={`
              px-8 py-3 rounded-2xl font-semibold text-sm
              bg-gradient-to-r from-purple-500 to-emerald-500
              text-white shadow-lg
              active:scale-95 transition-transform
            `}
                    >
                        End Turn →
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
