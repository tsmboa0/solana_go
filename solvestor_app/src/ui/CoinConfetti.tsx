// ============================================================
// Coin Confetti Overlay — Solvestor (SWS)
// ============================================================
// Renders animated coin particles for credit/debit effects.
// Red coins float up for debits, green coins rain down for credits.
// Shows floating amount text (+200 / -150).
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useCoinConfetti, type CoinEffect } from '@/hooks/useCoinConfetti';

function CoinParticle({ effect }: { effect: CoinEffect }) {
    const isCredit = effect.type === 'credit';
    const coinColor = isCredit ? '#10B981' : '#EF4444';
    const bgGradient = isCredit
        ? 'linear-gradient(135deg, #10B981, #34D399)'
        : 'linear-gradient(135deg, #EF4444, #F87171)';
    const textColor = isCredit ? '#10B981' : '#EF4444';
    const sign = isCredit ? '+' : '-';

    // Generate coin particle positions
    const particles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 200,
        y: isCredit ? -(Math.random() * 120 + 40) : (Math.random() * 120 + 40),
        rotation: Math.random() * 720 - 360,
        delay: Math.random() * 0.3,
        size: 10 + Math.random() * 8,
    }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* Floating amount text */}
            <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: isCredit ? -80 : 80, scale: [0.5, 1.2, 1, 0.8] }}
                transition={{ duration: 2, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    fontFamily: "'Inter', sans-serif",
                    color: textColor,
                    textShadow: `0 0 20px ${coinColor}40, 0 2px 8px rgba(0,0,0,0.2)`,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                }}
            >
                {sign}{effect.amount}
            </motion.div>

            {/* Message text */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 0.8, 0.8, 0], y: isCredit ? -30 : 30 }}
                transition={{ duration: 2, ease: 'easeOut', delay: 0.2 }}
                style={{
                    position: 'absolute',
                    top: isCredit ? '-20px' : '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: textColor,
                    opacity: 0.9,
                    textAlign: 'center',
                    maxWidth: '280px',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
            >
                {effect.message}
            </motion.div>

            {/* Coin particles */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{
                        x: 0,
                        y: 0,
                        scale: 0,
                        rotate: 0,
                        opacity: 1,
                    }}
                    animate={{
                        x: p.x,
                        y: p.y,
                        scale: [0, 1, 0.6],
                        rotate: p.rotation,
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: 1.5,
                        delay: p.delay,
                        ease: 'easeOut',
                    }}
                    style={{
                        position: 'absolute',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        background: bgGradient,
                        boxShadow: `0 0 8px ${coinColor}60, inset 0 -2px 4px rgba(0,0,0,0.2)`,
                        border: `1.5px solid ${coinColor}80`,
                    }}
                />
            ))}
        </motion.div>
    );
}

export function CoinConfetti() {
    const effects = useCoinConfetti((s) => s.effects);

    return (
        <AnimatePresence>
            {effects.map((effect) => (
                <CoinParticle key={effect.id} effect={effect} />
            ))}
        </AnimatePresence>
    );
}
