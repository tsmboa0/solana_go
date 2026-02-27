// ============================================================
// Session Setup Overlay — Solvestor (SWS)
// ============================================================
// Shows when the game is started but the player hasn't yet
// created a session token. One-time wallet signature to enable
// smooth gameplay without wallet popups.
// ============================================================

import { motion } from 'framer-motion';

interface Props {
    onCreateSession: () => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
}

export function SessionSetupOverlay({ onCreateSession, isLoading, error }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 490,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(10, 10, 20, 0.9)',
                backdropFilter: 'blur(12px)',
                fontFamily: "'Inter', -apple-system, sans-serif",
                padding: '20px',
            }}
        >
            <div style={{
                maxWidth: '400px',
                width: '100%',
                padding: '32px',
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
            }}>
                {/* Icon */}
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: '#fff',
                    margin: '0 0 8px 0',
                }}>
                    Activate Session
                </h2>

                {/* Description */}
                <p style={{
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.6,
                    margin: '0 0 24px 0',
                }}>
                    Sign once to enable smooth gameplay. After this, dice rolls,
                    property purchases, and tile actions will happen instantly
                    — no wallet popups during the game.
                </p>

                {/* Activate Button */}
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onCreateSession}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '14px',
                        border: 'none',
                        background: isLoading
                            ? 'rgba(153, 69, 255, 0.3)'
                            : 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: isLoading ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                        letterSpacing: '0.02em',
                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                >
                    {isLoading ? '⏳ Creating session...' : '🚀 Activate & Play'}
                </motion.button>

                {/* Error */}
                {error && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.72rem',
                        color: '#EF4444',
                        wordBreak: 'break-word',
                    }}>
                        {error}
                    </div>
                )}

                {/* Info */}
                <div style={{
                    marginTop: '16px',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.3)',
                    lineHeight: 1.5,
                }}>
                    This creates a temporary session key valid for 1 hour.
                    Your wallet only signs once — everything else is automatic.
                </div>
            </div>
        </motion.div>
    );
}
