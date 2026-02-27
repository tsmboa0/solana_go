// ============================================================
// HUD — Solvestor (SWS)
// ============================================================
// Top bar inspired by Monopoly GO: player avatar + balance
// on the left, properties count on the right.
// Compact, mobile-first.
// ============================================================

import { motion } from 'framer-motion';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { WealthCounter } from './WealthCounter';
import { LeaveRoomButton } from './LeaveRoomButton';

export function HUD() {
    const currentPlayer = useGameStore(selectCurrentPlayer);
    const players = useGameStore((s) => s.players);
    const turnNumber = useGameStore((s) => s.turnNumber);
    const theme = useUIStore((s) => s.theme);
    const openPortfolio = useUIStore((s) => s.openPortfolio);
    const isDark = theme === 'dark';

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 pb-1"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
        >
            <div className="flex items-start justify-between">
                {/* Left: Player avatar + balance */}
                <div className="flex items-center gap-2">
                    <LeaveRoomButton />

                    <button
                        className="flex items-center gap-2.5"
                        onClick={() => openPortfolio(currentPlayer.id)}
                    >
                        {/* Player avatar circle */}
                        <div
                            className={`
              w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold
              border-2
              ${isDark ? 'border-white/20' : 'border-white'}
              shadow-md
            `}
                            style={{
                                background: `linear-gradient(135deg, ${currentPlayer.color}, ${currentPlayer.color}88)`,
                            }}
                        >
                            {currentPlayer.name.charAt(0)}
                        </div>

                        {/* Balance pill */}
                        <div
                            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              ${isDark
                                    ? 'bg-[rgba(16,16,32,0.8)] border border-white/10'
                                    : 'bg-white/90 border border-gray-200 shadow-sm'
                                }
              backdrop-blur-md
            `}
                        >
                            <span className="text-xs">💰</span>
                            <WealthCounter
                                value={currentPlayer.balance}
                                className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                            />
                        </div>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {/* Turn counter */}
                    <div
                        className={`
              px-2.5 py-1.5 rounded-full text-xs font-semibold
              ${isDark
                                ? 'bg-[rgba(16,16,32,0.8)] text-white/70 border border-white/10'
                                : 'bg-white/90 text-gray-600 border border-gray-200 shadow-sm'
                            }
              backdrop-blur-md
            `}
                    >
                        T{turnNumber}
                    </div>

                    {/* Player dots */}
                    <div
                        className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
              ${isDark
                                ? 'bg-[rgba(16,16,32,0.8)] border border-white/10'
                                : 'bg-white/90 border border-gray-200 shadow-sm'
                            }
              backdrop-blur-md
            `}
                    >
                        {players.map((p) => (
                            <div
                                key={p.id}
                                className="relative"
                            >
                                <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition-all ${p.isActive
                                        ? 'ring-2 ring-offset-1 scale-110'
                                        : 'opacity-50 scale-90'
                                        }`}
                                    style={{
                                        backgroundColor: p.color,
                                    }}
                                >
                                    {p.name.charAt(0)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Menu / Theme toggle */}
                    <button
                        onClick={useUIStore.getState().toggleTheme}
                        className={`
              w-9 h-9 rounded-full flex items-center justify-center
              ${isDark
                                ? 'bg-[rgba(16,16,32,0.8)] border border-white/10'
                                : 'bg-white/90 border border-gray-200 shadow-sm'
                            }
              backdrop-blur-md
            `}
                    >
                        <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
