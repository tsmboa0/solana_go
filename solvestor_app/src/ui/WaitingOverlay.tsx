// ============================================================
// Waiting for Players Overlay — Solvestor (SWS)
// ============================================================
// Shown while waiting for opponents to join a blockchain game.
// Includes room code for sharing and a live player counter.
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PublicKey } from '@solana/web3.js';

interface Props {
    playerCount: number;
    maxPlayers: number;
    gamePDA: PublicKey;
    roomCode: string;
}

export function WaitingOverlay({ playerCount, maxPlayers, gamePDA, roomCode }: Props) {
    const [copied, setCopied] = useState(false);

    const fullRoomCode = gamePDA.toBase58();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullRoomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = fullRoomCode;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 500,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(10, 10, 20, 0.85)',
                backdropFilter: 'blur(12px)',
                fontFamily: "'Inter', -apple-system, sans-serif",
            }}
        >
            {/* Animated rings */}
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1.6, 1],
                            opacity: [0.4, 0, 0.4],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: 'easeOut',
                        }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '2px solid rgba(153, 69, 255, 0.3)',
                        }}
                    />
                ))}
                {/* Center icon */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                }}>
                    🎮
                </div>
            </div>

            {/* Text */}
            <motion.h2
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: '#fff',
                    margin: '0 0 8px 0',
                    textAlign: 'center',
                }}
            >
                Waiting for Players...
            </motion.h2>

            {/* Player count */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '8px 0 28px',
            }}>
                {Array.from({ length: maxPlayers }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            background: i < playerCount
                                ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)'
                                : 'rgba(255,255,255,0.08)',
                            border: i < playerCount
                                ? 'none'
                                : '1px dashed rgba(255,255,255,0.2)',
                            color: i < playerCount ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontWeight: 700,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {i < playerCount ? '✓' : '?'}
                    </div>
                ))}
            </div>

            <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.5)',
                margin: '0 0 24px',
            }}>
                {playerCount} / {maxPlayers} players joined
            </p>

            {/* Room Code */}
            <div style={{
                padding: '16px 24px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                maxWidth: '360px',
                width: '100%',
            }}>
                <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px',
                }}>
                    Room Code
                </div>
                <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#14F195',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                    wordBreak: 'break-all',
                }}>
                    {roomCode}
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    style={{
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: '1px solid rgba(153, 69, 255, 0.3)',
                        background: 'rgba(153, 69, 255, 0.12)',
                        color: '#9945FF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {copied ? '✓ Copied!' : '📋 Copy Full Address'}
                </motion.button>
                <div style={{
                    marginTop: '10px',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.3)',
                }}>
                    Share this with friends to join your game
                </div>
            </div>
        </motion.div>
    );
}
