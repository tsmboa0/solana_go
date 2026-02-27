// ============================================================
// Mode Select Page — Solvestor (SWS)
// ============================================================
// 4 mode cards: Explore, Beginner, Pro, Advanced.
// Glassmorphic card styling following existing modal patterns.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';
import type { GameMode } from '@/stores/useAppStore';

interface ModeCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    stake: string | null;
    enabled: boolean;
    mode: GameMode;
    route: string;
    gradient: string;
    glowColor: string;
}

const MODES: ModeCard[] = [
    {
        id: 'explore',
        title: 'Explore',
        description: 'Play solo against a CPU opponent. No blockchain, no stakes — just explore the board and learn the game.',
        icon: '🎮',
        stake: null,
        enabled: true,
        mode: 'explore',
        route: '/game/explore',
        gradient: 'linear-gradient(135deg, #14F195 0%, #0EA5E9 100%)',
        glowColor: 'rgba(20, 241, 149, 0.15)',
    },
    {
        id: 'beginner',
        title: 'Beginner',
        description: 'Real multiplayer on Solana. Compete with other players in a low-stakes environment.',
        icon: '🏆',
        stake: '0.2 SOL',
        enabled: true,
        mode: 'beginner',
        route: '/lobby',
        gradient: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 100%)',
        glowColor: 'rgba(153, 69, 255, 0.15)',
    },
    {
        id: 'pro',
        title: 'Pro',
        description: 'Higher stakes, bigger rewards. For experienced capital allocators ready to prove their strategy.',
        icon: '💎',
        stake: '0.5 SOL',
        enabled: false,
        mode: null,
        route: '',
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
        glowColor: 'rgba(245, 158, 11, 0.15)',
    },
    {
        id: 'advanced',
        title: 'Advanced',
        description: 'The ultimate arena. Maximum stakes, maximum glory. Only the boldest investors survive.',
        icon: '👑',
        stake: '1.0 SOL',
        enabled: false,
        mode: null,
        route: '',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #BE185D 100%)',
        glowColor: 'rgba(239, 68, 68, 0.15)',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
};

export function ModeSelectPage() {
    const navigate = useNavigate();
    const setGameMode = useAppStore((s) => s.setGameMode);

    const handleSelect = (card: ModeCard) => {
        if (!card.enabled) return;
        setGameMode(card.mode);
        navigate(card.route);
    };

    return (
        <div
            className="page-bg"
            style={{
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                padding: '40px 20px',
            }}
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                    textAlign: 'center',
                    marginBottom: '40px',
                }}
            >
                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.01em',
                    }}
                >
                    Choose Your Arena
                </h1>
                <p
                    style={{
                        fontSize: '1rem',
                        color: '#6b6b80',
                        fontWeight: 500,
                        margin: 0,
                    }}
                >
                    Select a game mode to get started
                </p>
            </motion.div>

            {/* Cards grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '1100px',
                }}
            >
                {MODES.map((card) => (
                    <motion.button
                        key={card.id}
                        variants={cardVariants}
                        whileHover={card.enabled ? { scale: 1.03, y: -4 } : {}}
                        whileTap={card.enabled ? { scale: 0.98 } : {}}
                        onClick={() => handleSelect(card)}
                        disabled={!card.enabled}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '28px 24px',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            background: 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
                            cursor: card.enabled ? 'pointer' : 'default',
                            opacity: card.enabled ? 1 : 0.5,
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            overflow: 'hidden',
                            transition: 'box-shadow 0.3s ease',
                        }}
                    >
                        {/* Background glow */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '-30px',
                                right: '-30px',
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                background: card.glowColor,
                                filter: 'blur(40px)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Coming Soon badge */}
                        {!card.enabled && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: 'rgba(0,0,0,0.06)',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    color: '#888',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Coming Soon
                            </div>
                        )}

                        {/* Icon */}
                        <div
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '16px',
                                background: card.gradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.6rem',
                                marginBottom: '16px',
                                boxShadow: `0 4px 12px ${card.glowColor}`,
                            }}
                        >
                            {card.icon}
                        </div>

                        {/* Title */}
                        <h2
                            style={{
                                fontSize: '1.35rem',
                                fontWeight: 800,
                                color: '#1a1a2e',
                                margin: '0 0 4px 0',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {card.title}
                        </h2>

                        {/* Stake badge */}
                        {card.stake && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(153, 69, 255, 0.08)',
                                    border: '1px solid rgba(153, 69, 255, 0.15)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#7B3FE4',
                                    marginBottom: '10px',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                ◈ {card.stake}
                            </div>
                        )}

                        {/* Description */}
                        <p
                            style={{
                                fontSize: '0.85rem',
                                lineHeight: 1.5,
                                color: '#6b6b80',
                                fontWeight: 500,
                                margin: 0,
                            }}
                        >
                            {card.description}
                        </p>

                        {/* Arrow for enabled cards */}
                        {card.enabled && (
                            <div
                                style={{
                                    marginTop: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#9945FF',
                                }}
                            >
                                Play Now
                                <span style={{ fontSize: '1rem' }}>→</span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </motion.div>

            {/* Back button */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => navigate('/')}
                style={{
                    marginTop: '32px',
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
        </div>
    );
}
