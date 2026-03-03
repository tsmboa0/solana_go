// ============================================================
// HUD — Solvestor (SWS)
// ============================================================
// Premium top bar: Leave button, animated balance, theme toggle.
// Clean, game-asset inspired, mobile-first.
// ============================================================

import { motion } from 'framer-motion';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { WealthCounter } from './WealthCounter';
import { LeaveRoomButton } from './LeaveRoomButton';

export function HUD() {
    const currentPlayer = useGameStore(selectCurrentPlayer);
    const theme = useUIStore((s) => s.theme);
    const isDark = theme === 'dark';

    // Shared pill styling
    const pillBg = isDark
        ? 'rgba(10, 10, 24, 0.85)'
        : 'rgba(255, 255, 255, 0.92)';
    const pillBorder = isDark
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.08)';
    const pillShadow = isDark
        ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255,255,255,0.05)'
        : '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0,0,0,0.05)';

    return (
        <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                padding: '12px 14px 6px',
                pointerEvents: 'none',
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pointerEvents: 'auto',
            }}>
                {/* Left: Leave + Balance */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <LeaveRoomButton />

                    {/* Balance pill */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px 8px 12px',
                        borderRadius: '50px',
                        background: pillBg,
                        border: pillBorder,
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: pillShadow,
                    }}>
                        {/* Coin icon with glow */}
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.35)',
                            flexShrink: 0,
                        }}>
                            💰
                        </div>

                        {/* Amount */}
                        <WealthCounter
                            value={currentPlayer.balance}
                            className=""
                            style={{
                                fontSize: '1rem',
                                fontWeight: 800,
                                fontFamily: "'Inter', monospace",
                                color: isDark ? '#f0f0f5' : '#1a1a2e',
                                letterSpacing: '-0.01em',
                            }}
                        />
                    </div>
                </div>

                {/* Right: Theme toggle */}
                <motion.button
                    onClick={useUIStore.getState().toggleTheme}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: pillBg,
                        border: pillBorder,
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: pillShadow,
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                    }}
                >
                    {isDark ? '☀️' : '🌙'}
                </motion.button>
            </div>
        </motion.div>
    );
}
