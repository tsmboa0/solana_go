// ============================================================
// GO Button — Solvestor (SWS)
// ============================================================
// Big "GO" roll button at bottom center, inspired by
// Monopoly GO's diamond-shaped action button.
// Pulses when it's player's turn. Shows dice result after roll.
// ============================================================

import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { useDiceRoll } from '@/hooks/useDiceRoll';

export function DiceButton() {
    const phase = useGameStore((s) => s.phase);
    const isDiceAnimating = useUIStore((s) => s.isDiceAnimating);
    const theme = useUIStore((s) => s.theme);
    const lastDiceResult = useGameStore((s) => s.lastDiceResult);
    const { performRoll } = useDiceRoll();

    const isDark = theme === 'dark';
    const canRoll = phase === 'waiting' && !isDiceAnimating;
    const isAnimating =
        phase === 'rolling' || phase === 'moving' || isDiceAnimating;

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-3">
            {/* Dice result badge */}
            {lastDiceResult && !isAnimating && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`
            flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold font-mono
            ${isDark
                            ? 'bg-[rgba(16,16,32,0.8)] text-white/90 border border-white/10'
                            : 'bg-white/90 text-gray-800 border border-gray-200 shadow-sm'
                        }
            backdrop-blur-md
          `}
                >
                    <span className="text-base">🎲</span>
                    <span>{lastDiceResult.die1}</span>
                    <span className="text-xs opacity-50">+</span>
                    <span>{lastDiceResult.die2}</span>
                    <span className="text-xs opacity-50">=</span>
                    <span className="text-lg">{lastDiceResult.total}</span>
                </motion.div>
            )}

            {/* Big GO Button */}
            <motion.button
                onClick={canRoll ? performRoll : undefined}
                disabled={!canRoll}
                className="relative"
                whileTap={canRoll ? { scale: 0.92 } : {}}
            >
                {/* Outer glow pulse (when can roll) */}
                {canRoll && (
                    <motion.div
                        className="absolute inset-[-8px] rounded-[28px] bg-gradient-to-br from-purple-500/30 to-emerald-400/30"
                        animate={{
                            scale: [1, 1.08, 1],
                            opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{ filter: 'blur(8px)' }}
                    />
                )}

                {/* Button body — diamond-inspired rounded rectangle */}
                <div
                    className={`
            relative w-[100px] h-[72px] rounded-[20px] flex items-center justify-center
            overflow-hidden
            transition-all duration-200
            ${canRoll
                            ? 'shadow-xl'
                            : 'opacity-50'
                        }
          `}
                    style={{
                        background: canRoll
                            ? 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 50%, #14F195 100%)'
                            : isDark
                                ? 'rgba(60,60,80,0.6)'
                                : 'rgba(180,180,200,0.6)',
                        boxShadow: canRoll
                            ? '0 8px 30px rgba(153, 69, 255, 0.4), 0 2px 8px rgba(20, 241, 149, 0.2)'
                            : 'none',
                    }}
                >
                    {/* Inner highlight */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[40%] rounded-t-[20px]"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                        }}
                    />

                    {/* Button text */}
                    {isAnimating ? (
                        <motion.div
                            className="relative flex items-center gap-1.5"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            <span className="text-xl">🎲</span>
                            <span className="text-xl">🎲</span>
                        </motion.div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            <span className="text-white font-black text-2xl tracking-wider leading-none">
                                GO
                            </span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-white/70 text-[10px]">◀</span>
                                <span className="text-white/70 text-[10px]">▶</span>
                            </div>
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
