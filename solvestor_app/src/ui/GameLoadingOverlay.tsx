// ============================================================
// Game Loading Overlay — Solvestor (SWS)
// ============================================================
// Light glassmorphic splash screen shown while the 3D scene
// initializes. Features SOLANA GO! branding and crypto-themed
// motivational messages with a smooth fade-out.
// ============================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MOTIVATIONAL_MESSAGES = [
    'Build your empire on-chain 🏗️',
    'Every tile is an opportunity 🎯',
    'Stack your portfolio. Dominate the board. 💎',
    'The blockchain never sleeps 🌐',
    'Fortune favors the bold 🚀',
    'Your next move could change everything ♟️',
    'Think big. Roll bigger. 🎲',
    'From zero to whale 🐋',
];

/** How long the overlay stays (ms) */
const OVERLAY_DURATION_MS = 3500;
/** How often the message rotates (ms) */
const MESSAGE_ROTATE_MS = 1800;

export function GameLoadingOverlay() {
    const [isVisible, setIsVisible] = useState(true);
    const [messageIndex, setMessageIndex] = useState(
        () => Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
    );

    // Rotate messages
    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
        }, MESSAGE_ROTATE_MS);
        return () => clearInterval(interval);
    }, []);

    // Auto-dismiss after duration
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, OVERLAY_DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(180deg, #f8f8fc 0%, #eeeef6 40%, #e8e4f0 100%)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Glassmorphic card container */}
                    <motion.div
                        initial={{ y: 30, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '48px 56px',
                            borderRadius: '32px',
                            border: '1px solid rgba(255,255,255,0.7)',
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Ambient glow inside card */}
                        <div
                            style={{
                                position: 'absolute',
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(153,69,255,0.08) 0%, transparent 70%)',
                                top: '-60px',
                                right: '-60px',
                                filter: 'blur(40px)',
                                pointerEvents: 'none',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                width: '180px',
                                height: '180px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(20,241,149,0.06) 0%, transparent 70%)',
                                bottom: '-40px',
                                left: '-40px',
                                filter: 'blur(40px)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* SOLANA GO! Title */}
                        <div
                            style={{
                                fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                                fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
                                fontWeight: 900,
                                letterSpacing: '0.06em',
                                background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 40%, #14F195 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                position: 'relative',
                                zIndex: 1,
                                lineHeight: 1.1,
                            }}
                        >
                            SOLANA GO!
                        </div>

                        {/* Subtitle */}
                        <div
                            style={{
                                color: '#8a8a9e',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                marginTop: '10px',
                                zIndex: 1,
                            }}
                        >
                            Preparing your board
                        </div>

                        {/* Loading dots animation */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '32px',
                                zIndex: 1,
                            }}
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: [1, 1.4, 1],
                                        opacity: [0.3, 1, 0.3],
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                        ease: 'easeInOut',
                                    }}
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #9945FF, #14F195)',
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Motivational message — below the card */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '12%',
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            zIndex: 1,
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={messageIndex}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.4 }}
                                style={{
                                    color: '#7a7a90',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    fontStyle: 'italic',
                                    padding: '0 32px',
                                }}
                            >
                                {MOTIVATIONAL_MESSAGES[messageIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
