// ============================================================
// Landing Page — Solvestor (SWS)
// ============================================================
// Full-viewport landing: "SOLANA GO!" 3D text, connect wallet,
// enter button. Light background, Solana branding.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function LandingPage() {
    const navigate = useNavigate();
    const { connected, publicKey } = useWallet();
    const { setVisible } = useWalletModal();
    const [isHoveringEnter, setIsHoveringEnter] = useState(false);

    const handleConnectWallet = () => {
        setVisible(true);
    };

    const handleEnter = () => {
        navigate('/select');
    };

    // Truncate wallet address for display
    const shortAddress = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
        : '';

    return (
        <div
            style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #f8f8fc 0%, #eeeef6 40%, #e8e4f0 100%)',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
        >
            {/* Subtle background orbs */}
            <div
                style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '-10%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(153,69,255,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '-15%',
                    right: '-10%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(20,241,149,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    zIndex: 1,
                }}
            >
                {/* 3D "SOLANA GO!" Title */}
                <motion.h1
                    initial={{ scale: 0.8, opacity: 0, rotateX: 30 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    style={{
                        fontSize: 'clamp(3.5rem, 12vw, 7rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        margin: 0,
                        background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 40%, #14F195 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: 'none',
                        position: 'relative',
                        userSelect: 'none',
                    }}
                >
                    {/* 3D depth shadow layer (behind the gradient text) */}
                    <span
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'none',
                            WebkitBackgroundClip: 'unset',
                            WebkitTextFillColor: 'unset',
                            backgroundClip: 'unset',
                            color: 'transparent',
                            textShadow: `
                                0px 1px 0px rgba(120, 50, 200, 0.25),
                                0px 2px 0px rgba(110, 45, 190, 0.22),
                                0px 3px 0px rgba(100, 40, 180, 0.19),
                                0px 4px 0px rgba(90, 35, 170, 0.16),
                                0px 5px 0px rgba(80, 30, 160, 0.13),
                                0px 6px 0px rgba(70, 25, 150, 0.10),
                                0px 8px 15px rgba(100, 40, 180, 0.15),
                                0px 12px 30px rgba(153, 69, 255, 0.12)
                            `,
                            zIndex: -1,
                        }}
                    >
                        SOLANA GO!
                    </span>
                    SOLANA GO!
                </motion.h1>

                {/* Tagline */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    style={{
                        fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)',
                        color: '#6b6b80',
                        fontWeight: 500,
                        textAlign: 'center',
                        maxWidth: '460px',
                        lineHeight: 1.5,
                        margin: 0,
                    }}
                >
                    A competitive capital allocation strategy game on Solana
                </motion.p>

                {/* Spacer */}
                <div style={{ height: '20px' }} />

                {/* Connect Wallet / Enter Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    {!connected ? (
                        /* Connect Wallet Button — game button feel */
                        <motion.button
                            onClick={handleConnectWallet}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            style={{
                                position: 'relative',
                                padding: '16px 40px',
                                borderRadius: '20px',
                                border: 'none',
                                cursor: 'pointer',
                                background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 50%, #14F195 100%)',
                                color: '#fff',
                                fontFamily: 'inherit',
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                letterSpacing: '0.03em',
                                boxShadow: `
                                    0 4px 0px 0px rgba(100, 40, 180, 0.5),
                                    0 8px 24px rgba(153, 69, 255, 0.3),
                                    0 2px 8px rgba(20, 241, 149, 0.15),
                                    inset 0 1px 0 rgba(255,255,255,0.25)
                                `,
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Inner highlight for 3D feel */}
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '45%',
                                    borderRadius: '20px 20px 0 0',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                                    pointerEvents: 'none',
                                }}
                            />
                            <span style={{ position: 'relative', zIndex: 1 }}>🔗 Connect Wallet</span>
                        </motion.button>
                    ) : (
                        <>
                            {/* Connected indicator */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 20px',
                                    borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.7)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(153, 69, 255, 0.2)',
                                    boxShadow: '0 2px 12px rgba(153, 69, 255, 0.08)',
                                }}
                            >
                                <div
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#14F195',
                                        boxShadow: '0 0 8px rgba(20, 241, 149, 0.5)',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#4a4a5a',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {shortAddress}
                                </span>
                            </motion.div>

                            {/* Enter Button — game button feel */}
                            <motion.button
                                onClick={handleEnter}
                                onMouseEnter={() => setIsHoveringEnter(true)}
                                onMouseLeave={() => setIsHoveringEnter(false)}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                                style={{
                                    position: 'relative',
                                    padding: '18px 56px',
                                    borderRadius: '22px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 50%, #14F195 100%)',
                                    color: '#fff',
                                    fontFamily: 'inherit',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.08em',
                                    boxShadow: isHoveringEnter
                                        ? `
                                            0 4px 0px 0px rgba(100, 40, 180, 0.5),
                                            0 12px 32px rgba(153, 69, 255, 0.4),
                                            0 4px 12px rgba(20, 241, 149, 0.2),
                                            inset 0 1px 0 rgba(255,255,255,0.25)
                                        `
                                        : `
                                            0 4px 0px 0px rgba(100, 40, 180, 0.5),
                                            0 8px 24px rgba(153, 69, 255, 0.3),
                                            0 2px 8px rgba(20, 241, 149, 0.15),
                                            inset 0 1px 0 rgba(255,255,255,0.25)
                                        `,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    overflow: 'hidden',
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '45%',
                                        borderRadius: '22px 22px 0 0',
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                                        pointerEvents: 'none',
                                    }}
                                />
                                <span style={{ position: 'relative', zIndex: 1 }}>ENTER ▶</span>
                            </motion.button>
                        </>
                    )}
                </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                style={{
                    position: 'absolute',
                    bottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#a0a0b0',
                    fontWeight: 500,
                }}
            >
                Built on
                <span style={{ color: '#9945FF', fontWeight: 700 }}>Solana</span>
                ⚡
            </motion.div>
        </div>
    );
}
