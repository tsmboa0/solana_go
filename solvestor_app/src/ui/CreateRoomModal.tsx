// ============================================================
// Create Room Modal — Solvestor (SWS)
// ============================================================
// Glassmorphism modal for creating a new game room.
// Shows a 2-step transaction flow with visual progress.
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import type { TransactionStep } from '@/stores/useBlockchainStore';

// ─── Constants for Beginner Mode ─────────────────────────────

const BEGINNER_STAKE = 0.2;     // SOL
const BEGINNER_CAPITAL = 1500;  // in-game units
const DEFAULT_ROUND_DURATION = 20; // seconds

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: Props) {
    const navigate = useNavigate();
    const wallet = useAnchorWallet();
    const createRoom = useBlockchainStore((s) => s.createRoom);
    const txSteps = useBlockchainStore((s) => s.txSteps);
    const isCreating = useBlockchainStore((s) => s.isCreating);
    const error = useBlockchainStore((s) => s.error);
    const clearError = useBlockchainStore((s) => s.clearError);

    const [maxPlayers, setMaxPlayers] = useState(2);
    const [roundDuration, setRoundDuration] = useState(DEFAULT_ROUND_DURATION);

    const handleCreate = async () => {
        if (!wallet) return;
        clearError();

        const result = await createRoom(wallet, {
            maxPlayers,
            roundDuration,
            startCapital: BEGINNER_CAPITAL,
            stakeAmount: BEGINNER_STAKE * 1_000_000_000, // Convert to lamports
        });

        if (result) {
            // Navigate to game page with game PDA as query param
            const params = new URLSearchParams({
                gamePDA: result.gamePDA.toBase58(),
                gameId: result.gameId.toString(),
            });
            navigate(`/game/beginner?${params.toString()}`);
        }
    };

    const handleClose = () => {
        if (isCreating) return; // Don't allow closing during transaction
        clearError();
        onClose();
    };

    // Check if we're in the "transaction flow" state
    const showTransactionFlow = isCreating || txSteps.some(s => s.status === 'done' || s.status === 'error');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(8px)',
                        padding: '20px',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                            padding: '28px',
                            fontFamily: "'Inter', -apple-system, sans-serif",
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                        }}>
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                margin: 0,
                            }}>
                                Create Game
                            </h2>
                            {!isCreating && (
                                <button
                                    onClick={handleClose}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.2rem',
                                        cursor: 'pointer',
                                        color: '#8888a0',
                                        padding: '4px',
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Transaction Flow */}
                        {showTransactionFlow ? (
                            <TransactionFlow steps={txSteps} error={error} />
                        ) : (
                            <>
                                {/* Form Fields */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Max Players */}
                                    <div>
                                        <label style={labelStyle}>Max Players</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[2, 3, 4].map((n) => (
                                                <button
                                                    key={n}
                                                    onClick={() => setMaxPlayers(n)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '12px',
                                                        border: maxPlayers === n
                                                            ? '2px solid #9945FF'
                                                            : '1px solid rgba(0,0,0,0.08)',
                                                        background: maxPlayers === n
                                                            ? 'rgba(153, 69, 255, 0.08)'
                                                            : 'rgba(255,255,255,0.5)',
                                                        color: maxPlayers === n ? '#9945FF' : '#4a4a5a',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        fontFamily: 'inherit',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Round Duration */}
                                    <div>
                                        <label style={labelStyle}>Round Duration (seconds)</label>
                                        <input
                                            type="number"
                                            value={roundDuration}
                                            onChange={(e) => setRoundDuration(Math.max(10, parseInt(e.target.value) || 10))}
                                            min={10}
                                            max={120}
                                            style={inputStyle}
                                        />
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: '#8888a0',
                                            marginTop: '4px',
                                            display: 'block',
                                        }}>
                                            Cooldown between dice rolls (10-120s)
                                        </span>
                                    </div>

                                    {/* Fixed Fields Display */}
                                    <div style={{
                                        padding: '14px',
                                        borderRadius: '14px',
                                        background: 'rgba(153, 69, 255, 0.04)',
                                        border: '1px solid rgba(153, 69, 255, 0.1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                    }}>
                                        <div style={rowStyle}>
                                            <span style={rowLabelStyle}>Stake</span>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: '#7B3FE4',
                                            }}>
                                                ◈ {BEGINNER_STAKE} SOL
                                            </span>
                                        </div>
                                        <div style={rowStyle}>
                                            <span style={rowLabelStyle}>Starting Capital</span>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: '#4a4a5a',
                                            }}>
                                                ${BEGINNER_CAPITAL.toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={rowStyle}>
                                            <span style={rowLabelStyle}>Mode</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#14F195',
                                                background: 'rgba(20, 241, 149, 0.08)',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                            }}>
                                                Beginner
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info Note */}
                                    <div style={{
                                        fontSize: '0.72rem',
                                        color: '#8888a0',
                                        lineHeight: 1.5,
                                        padding: '0 2px',
                                    }}>
                                        💡 You'll sign <strong>2 transactions</strong>: one to create the room & stake SOL,
                                        and one to activate real-time gameplay via MagicBlock.
                                    </div>
                                </div>

                                {/* Create Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCreate}
                                    disabled={!wallet}
                                    style={{
                                        width: '100%',
                                        marginTop: '20px',
                                        padding: '14px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: wallet
                                            ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)'
                                            : 'rgba(0,0,0,0.1)',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: wallet ? 'pointer' : 'not-allowed',
                                        fontFamily: 'inherit',
                                        letterSpacing: '0.02em',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {wallet ? 'Create & Join Room' : 'Connect Wallet First'}
                                </motion.button>

                                {/* Error Display */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            marginTop: '12px',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            fontSize: '0.75rem',
                                            color: '#EF4444',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Transaction Flow Component ──────────────────────────────

function TransactionFlow({ steps, error }: { steps: TransactionStep[]; error: string | null }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {steps.map((step, i) => (
                <div
                    key={i}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: step.status === 'done'
                            ? 'rgba(20, 241, 149, 0.06)'
                            : step.status === 'error'
                                ? 'rgba(239, 68, 68, 0.06)'
                                : step.status === 'signing'
                                    ? 'rgba(153, 69, 255, 0.06)'
                                    : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${step.status === 'done'
                            ? 'rgba(20, 241, 149, 0.2)'
                            : step.status === 'error'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : step.status === 'signing'
                                    ? 'rgba(153, 69, 255, 0.2)'
                                    : 'rgba(0,0,0,0.05)'}`,
                        transition: 'all 0.3s ease',
                    }}
                >
                    <StepIcon status={step.status} />
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: step.status === 'done'
                                ? '#14F195'
                                : step.status === 'error'
                                    ? '#EF4444'
                                    : step.status === 'signing'
                                        ? '#9945FF'
                                        : '#8888a0',
                        }}>
                            {step.label}
                        </div>
                        <div style={{
                            fontSize: '0.68rem',
                            color: '#8888a0',
                            marginTop: '2px',
                        }}>
                            {step.status === 'pending' && 'Waiting...'}
                            {step.status === 'signing' && '🔐 Please approve in your wallet'}
                            {step.status === 'confirming' && '⏳ Confirming on-chain...'}
                            {step.status === 'done' && '✓ Complete'}
                            {step.status === 'error' && 'Failed'}
                        </div>
                    </div>
                </div>
            ))}

            {/* Error detail */}
            {error && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    fontSize: '0.72rem',
                    color: '#EF4444',
                    wordBreak: 'break-word',
                }}>
                    {error}
                </div>
            )}
        </div>
    );
}

// ─── Step Icon ───────────────────────────────────────────────

function StepIcon({ status }: { status: TransactionStep['status'] }) {
    const size = 28;
    const style: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        flexShrink: 0,
    };

    switch (status) {
        case 'done':
            return (
                <div style={{ ...style, background: 'rgba(20, 241, 149, 0.15)', color: '#14F195' }}>
                    ✓
                </div>
            );
        case 'error':
            return (
                <div style={{ ...style, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                    ✕
                </div>
            );
        case 'signing':
        case 'confirming':
            return (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{
                        ...style,
                        background: 'rgba(153, 69, 255, 0.12)',
                        border: '2px solid transparent',
                        borderTopColor: '#9945FF',
                    }}
                />
            );
        default:
            return (
                <div style={{
                    ...style,
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    color: '#ccc',
                }}>
                    ○
                </div>
            );
    }
}

// ─── Styles ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#4a4a5a',
    marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#1a1a2e',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const rowLabelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: '#8888a0',
    fontWeight: 500,
};
