// ============================================================
// Lobby Page — Solvestor (SWS)
// ============================================================
// Shows available game rooms to join.
// Mock data for now — will be wired to on-chain later.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface MockRoom {
    id: string;
    creator: string;
    players: number;
    maxPlayers: number;
    stake: string;
    status: 'waiting' | 'in_progress' | 'full';
    createdAgo: string;
}

const MOCK_ROOMS: MockRoom[] = [
    {
        id: 'ROOM-7A3F',
        creator: '4xK2...mN8p',
        players: 1,
        maxPlayers: 2,
        stake: '0.1 SOL',
        status: 'waiting',
        createdAgo: '2 min ago',
    },
    {
        id: 'ROOM-B91C',
        creator: '8rF5...qW2j',
        players: 2,
        maxPlayers: 2,
        stake: '0.1 SOL',
        status: 'in_progress',
        createdAgo: '5 min ago',
    },
    {
        id: 'ROOM-D4E8',
        creator: '2mX9...hL4v',
        players: 1,
        maxPlayers: 4,
        stake: '0.1 SOL',
        status: 'waiting',
        createdAgo: '1 min ago',
    },
    {
        id: 'ROOM-F2A1',
        creator: '6cN3...pR7t',
        players: 4,
        maxPlayers: 4,
        stake: '0.1 SOL',
        status: 'full',
        createdAgo: '8 min ago',
    },
];

function getStatusStyle(status: MockRoom['status']): {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
} {
    switch (status) {
        case 'waiting':
            return {
                label: 'Waiting',
                color: '#14F195',
                bg: 'rgba(20, 241, 149, 0.08)',
                border: 'rgba(20, 241, 149, 0.2)',
                dot: '#14F195',
            };
        case 'in_progress':
            return {
                label: 'In Progress',
                color: '#F59E0B',
                bg: 'rgba(245, 158, 11, 0.08)',
                border: 'rgba(245, 158, 11, 0.2)',
                dot: '#F59E0B',
            };
        case 'full':
            return {
                label: 'Full',
                color: '#EF4444',
                bg: 'rgba(239, 68, 68, 0.08)',
                border: 'rgba(239, 68, 68, 0.2)',
                dot: '#EF4444',
            };
    }
}

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

export function LobbyPage() {
    const navigate = useNavigate();

    const joinableRooms = MOCK_ROOMS.filter((r) => r.status === 'waiting');

    return (
        <div
            style={{
                width: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(180deg, #f8f8fc 0%, #eeeef6 40%, #e8e4f0 100%)',
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
                            background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            margin: '0 0 4px 0',
                        }}
                    >
                        Game Lobby
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: '#6b6b80', fontWeight: 500, margin: 0 }}>
                        Join an available game or create a new one
                    </p>
                </div>

                {/* Create Game button — disabled */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    style={{
                        position: 'relative',
                        padding: '12px 24px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'rgba(153, 69, 255, 0.12)',
                        color: '#9945FF',
                        fontFamily: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                        letterSpacing: '0.02em',
                    }}
                    disabled
                    title="Coming soon"
                >
                    + Create Game
                </motion.button>
            </motion.div>

            {/* Room cards grid */}
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
                {MOCK_ROOMS.map((room) => {
                    const statusStyle = getStatusStyle(room.status);
                    const canJoin = room.status === 'waiting';

                    return (
                        <motion.div
                            key={room.id}
                            variants={cardVariants}
                            whileHover={canJoin ? { scale: 1.02, y: -2 } : {}}
                            onClick={canJoin ? () => navigate('/game') : undefined}
                            style={{
                                padding: '20px',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.6)',
                                background: 'rgba(255, 255, 255, 0.5)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                                cursor: canJoin ? 'pointer' : 'default',
                                opacity: room.status === 'full' ? 0.5 : 1,
                                transition: 'box-shadow 0.2s ease',
                            }}
                        >
                            {/* Room ID + Status */}
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
                                    {room.id}
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
                                        {room.creator}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Players</span>
                                    <span style={{ fontSize: '0.78rem', color: '#4a4a5a', fontWeight: 700 }}>
                                        {room.players}/{room.maxPlayers}
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
                                        ◈ {room.stake}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>Created</span>
                                    <span style={{ fontSize: '0.75rem', color: '#8888a0', fontWeight: 500 }}>
                                        {room.createdAgo}
                                    </span>
                                </div>
                            </div>

                            {/* Join button (only for waiting rooms) */}
                            {canJoin && (
                                <div
                                    style={{
                                        marginTop: '14px',
                                        padding: '8px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                                        textAlign: 'center',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#fff',
                                        letterSpacing: '0.03em',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    Join Game →
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>

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
                {joinableRooms.length} game{joinableRooms.length !== 1 ? 's' : ''} available
            </motion.div>

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
        </div>
    );
}
