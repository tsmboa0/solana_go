// ============================================================
// Leave Room Button — Solvestor (SWS)
// ============================================================
// Small button in the top-left corner to exit the current game.
// Clears persisted state and navigates back to mode select.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/useGameStore';

export function LeaveRoomButton() {
    const navigate = useNavigate();
    const leaveGame = useGameStore((s) => s.leaveGame);

    const handleLeave = () => {
        leaveGame();
        navigate('/select');
    };

    return (
        <button
            onClick={handleLeave}
            style={{
                position: 'fixed',
                top: '16px',
                left: '16px',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                color: '#6b6b80',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', -apple-system, sans-serif",
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                e.currentTarget.style.color = '#e53e3e';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                e.currentTarget.style.color = '#6b6b80';
            }}
        >
            <span style={{ fontSize: '1rem' }}>←</span>
            Leave
        </button>
    );
}
