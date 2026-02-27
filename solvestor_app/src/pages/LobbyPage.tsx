// ============================================================
// Lobby Page — Solvestor (SWS)
// ============================================================
// Shows available game rooms from the blockchain.
// Create Game opens a modal; Join Game executes on-chain.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import type { OnChainGame, TransactionStep } from '@/stores/useBlockchainStore';
import { CreateRoomModal } from '@/ui/CreateRoomModal';
import { lamportsToSol } from '@/anchor/setup';

// ─── Status Helper ───────────────────────────────────────────

function getStatusStyle(game: OnChainGame): {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
} {
    if (game.isStarted) {
        return {
            label: 'In Progress',
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.2)',
            dot: '#F59E0B',
        };
    }
    if (game.playerCount >= game.maxPlayers) {
        return {
            label: 'Full',
            color: '#EF4444',
            bg: 'rgba(239, 68, 68, 0.08)',
            border: 'rgba(239, 68, 68, 0.2)',
            dot: '#EF4444',
        };
    }
    return {
        label: 'Waiting',
        color: '#14F195',
        bg: 'rgba(20, 241, 149, 0.08)',
        border: 'rgba(20, 241, 149, 0.2)',
        dot: '#14F195',
    };
}

function timeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Animation Variants ──────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── Component ───────────────────────────────────────────────

export function LobbyPage() {
    const navigate = useNavigate();
    const wallet = useAnchorWallet();

    // Blockchain state
    const activeGames = useBlockchainStore((s) => s.activeGames);
    const isFetchingGames = useBlockchainStore((s) => s.isFetchingGames);
    const fetchActiveGames = useBlockchainStore((s) => s.fetchActiveGames);
    const joinRoom = useBlockchainStore((s) => s.joinRoom);
    const isJoining = useBlockchainStore((s) => s.isJoining);
    const txSteps = useBlockchainStore((s) => s.txSteps);
    const error = useBlockchainStore((s) => s.error);
    const clearError = useBlockchainStore((s) => s.clearError);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [joiningGamePDA, setJoiningGamePDA] = useState<string | null>(null);

    // Fetch games on mount and every 10 seconds
    useEffect(() => {
        if (!wallet) return;

        fetchActiveGames(wallet);
        const interval = setInterval(() => fetchActiveGames(wallet), 10000);
        return () => clearInterval(interval);
    }, [wallet, fetchActiveGames]);

    // Handle join game
    const handleJoin = async (game: OnChainGame) => {
        if (!wallet || isJoining) return;
        clearError();
        setJoiningGamePDA(game.gamePDA.toBase58());

        const success = await joinRoom(wallet, game.gamePDA, game);
        if (success) {
            const params = new URLSearchParams({
                gamePDA: game.gamePDA.toBase58(),
                gameId: game.gameId.toString(),
            });
            navigate(`/game/beginner?${params.toString()}`);
        }
        setJoiningGamePDA(null);
    };

    const joinableGames = activeGames.filter(
        (g) => !g.isStarted && !g.isEnded && g.playerCount < g.maxPlayers
    );

    return (
        <div
            className="page-bg"
            style={{
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: '40px 20px',
            }}
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: '1.8rem',
                            fontWeight: 900,
                            background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            margin: '0 0 4px 0',
                        }}
                    >
                        Game Lobby
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#6b6b80', fontWeight: 600, margin: 0 }}>
                        Join an available game or create a new one
                    </p>
                </div>

                {/* Create Game button — now enabled */}
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                        position: 'relative',
                        padding: '12px 24px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.02em',
                        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                >
                    + Create Game
                </motion.button>
            </motion.div>

            {/* Loading state */}
            {isFetchingGames && activeGames.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#8888a0',
                        fontSize: '0.9rem',
                    }}
                >
                    <div style={{
                        width: '24px',
                        height: '24px',
                        border: '3px solid rgba(153, 69, 255, 0.2)',
                        borderTopColor: '#9945FF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 12px',
                    }} />
                    Loading games from blockchain...
                </motion.div>
            )}

            {/* Empty state */}
            {!isFetchingGames && activeGames.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        maxWidth: '400px',
                    }}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎮</div>
                    <p style={{ fontSize: '0.95rem', color: '#4a4a5a', fontWeight: 600, margin: '0 0 8px 0' }}>
                        No games available
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#8888a0', margin: 0 }}>
                        Be the first to create a game and invite others to join!
                    </p>
                </motion.div>
            )}

            {/* Joining overlay */}
            {isJoining && joiningGamePDA && (
                <JoinOverlay steps={txSteps} error={error} />
            )}

            {/* Room cards grid */}
            {activeGames.length > 0 && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '16px',
                        width: '100%',
                        maxWidth: '800px',
                    }}
                >
                    {activeGames.map((game) => {
                        const statusStyle = getStatusStyle(game);
                        const canJoin = !game.isStarted && !game.isEnded && game.playerCount < game.maxPlayers;
                        const isCurrentlyJoining = joiningGamePDA === game.gamePDA.toBase58();
                        // Check if user is in this game
                        const isUserInGame = wallet && game.creator.toBase58() === wallet.publicKey.toBase58();

                        return (
                            <motion.div
                                key={game.gamePDA.toBase58()}
                                variants={cardVariants}
                                whileHover={canJoin && !isUserInGame ? { scale: 1.02, y: -2 } : {}}
                                style={{
                                    padding: '20px',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.6)',
                                    background: 'rgba(255, 255, 255, 0.5)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                                    cursor: canJoin && !isUserInGame ? 'pointer' : 'default',
                                    opacity: game.isEnded ? 0.4 : game.isStarted ? 0.7 : 1,
                                    transition: 'box-shadow 0.2s ease',
                                }}
                            >
                                {/* Room Code + Status */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '14px',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 800,
                                            color: '#1a1a2e',
                                            fontFamily: 'monospace',
                                            letterSpacing: '0.03em',
                                        }}
                                    >
                                        {game.roomCode}
                                    </span>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '3px 10px',
                                            borderRadius: '10px',
                                            background: statusStyle.bg,
                                            border: `1px solid ${statusStyle.border}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: statusStyle.dot,
                                                boxShadow: `0 0 6px ${statusStyle.dot}`,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                color: statusStyle.color,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            {statusStyle.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Creator</span>
                                        <span style={{ fontSize: '0.78rem', color: '#4a4a5a', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {game.creatorDisplay}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Players</span>
                                        <span style={{ fontSize: '0.78rem', color: '#4a4a5a', fontWeight: 700 }}>
                                            {game.playerCount}/{game.maxPlayers}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Stake</span>
                                        <span
                                            style={{
                                                fontSize: '0.78rem',
                                                color: '#7B3FE4',
                                                fontWeight: 700,
                                            }}
                                        >
                                            ◈ {lamportsToSol(game.stakeAmount)} SOL
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Created</span>
                                        <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>
                                            {timeAgo(game.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Join button */}
                                {canJoin && !isUserInGame && (
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoin(game);
                                        }}
                                        style={{
                                            marginTop: '14px',
                                            padding: '8px',
                                            borderRadius: '12px',
                                            background: isCurrentlyJoining
                                                ? 'rgba(153, 69, 255, 0.2)'
                                                : 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                                            textAlign: 'center',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            color: '#fff',
                                            letterSpacing: '0.03em',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                            cursor: isCurrentlyJoining ? 'wait' : 'pointer',
                                        }}
                                    >
                                        {isCurrentlyJoining ? 'Joining...' : 'Join Game →'}
                                    </motion.div>
                                )}

                                {/* User is creator */}
                                {isUserInGame && !game.isStarted && (
                                    <motion.div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const params = new URLSearchParams({
                                                gamePDA: game.gamePDA.toBase58(),
                                                gameId: game.gameId.toString(),
                                            });
                                            navigate(`/game/beginner?${params.toString()}`);
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        style={{
                                            marginTop: '14px',
                                            padding: '8px',
                                            borderRadius: '12px',
                                            background: 'rgba(153, 69, 255, 0.12)',
                                            textAlign: 'center',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            color: '#9945FF',
                                            letterSpacing: '0.03em',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Enter Game →
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Available count */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                    marginTop: '24px',
                    fontSize: '0.8rem',
                    color: '#8888a0',
                    fontWeight: 500,
                }}
            >
                {joinableGames.length} game{joinableGames.length !== 1 ? 's' : ''} available
            </motion.div>

            {/* Error display */}
            {error && !isJoining && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        marginTop: '12px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.78rem',
                        color: '#EF4444',
                        maxWidth: '500px',
                        wordBreak: 'break-word',
                        cursor: 'pointer',
                    }}
                    onClick={clearError}
                >
                    {error}
                    <span style={{ opacity: 0.6, marginLeft: '8px' }}>✕</span>
                </motion.div>
            )}

            {/* Back button */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={() => navigate('/select')}
                style={{
                    marginTop: '16px',
                    padding: '10px 24px',
                    borderRadius: '14px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)',
                    color: '#6b6b80',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                ← Back
            </motion.button>

            {/* CSS animation for spinner */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* Create Room Modal */}
            <CreateRoomModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}

// ─── Join Overlay Component ──────────────────────────────────

function JoinOverlay({ steps, error }: { steps: TransactionStep[]; error: string | null }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div style={{
                padding: '28px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.6)',
                maxWidth: '380px',
                width: '100%',
                fontFamily: "'Inter', sans-serif",
            }}>
                <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: '#1a1a2e',
                    margin: '0 0 16px 0',
                }}>
                    Joining Game...
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.8rem',
                            color: step.status === 'done' ? '#14F195'
                                : step.status === 'signing' ? '#9945FF'
                                    : step.status === 'error' ? '#EF4444'
                                        : '#8888a0',
                            fontWeight: 600,
                        }}>
                            <span>{step.status === 'done' ? '✓' : step.status === 'signing' ? '🔐' : step.status === 'error' ? '✕' : '○'}</span>
                            <span>{step.label}</span>
                        </div>
                    ))}
                </div>
                {error && (
                    <div style={{
                        marginTop: '12px',
                        fontSize: '0.72rem',
                        color: '#EF4444',
                        wordBreak: 'break-word',
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
