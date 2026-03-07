// ============================================================
// Leave Room Button — Solvestor (SWS)
// ============================================================
// Small button in the top-left corner to exit the current game.
// In beginner mode: sends leave_room tx then navigates.
// In explore mode: clears local state and navigates.
// ============================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useGameStore } from '@/stores/useGameStore';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import { isMobileNative, requestNavigateBack, requestHaptic } from '@/utils/mobileBridge';

export function LeaveRoomButton() {
    const navigate = useNavigate();
    const wallet = useAnchorWallet();
    const { mode } = useParams<{ mode: string }>();
    const leaveGame = useGameStore((s) => s.leaveGame);
    const leaveRoom = useBlockchainStore((s) => s.leaveRoom);
    const clearCurrentGame = useBlockchainStore((s) => s.clearCurrentGame);
    const isLeaving = useBlockchainStore((s) => s.isLeaving);

    const [showConfirm, setShowConfirm] = useState(false);

    const isBeginner = mode === 'beginner';
    const isNative = isMobileNative();

    // In native WebView, the leave button is handled by the native UI
    if (isNative) return null;

    const handleLeave = async () => {
        if (isBeginner && wallet) {
            // Blockchain leave flow
            const success = await leaveRoom(wallet);
            if (success) {
                leaveGame();
                if (isNative) {
                    requestHaptic('success');
                    requestNavigateBack();
                } else {
                    navigate('/lobby');
                }
            }
        } else {
            // Explore mode — local only
            leaveGame();
            clearCurrentGame();
            if (isNative) {
                requestHaptic('light');
                requestNavigateBack();
            } else {
                navigate('/select');
                window.location.reload();
            }
        }
    };

    const handleClick = () => {
        if (isBeginner) {
            setShowConfirm(true);
        } else {
            handleLeave();
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={isLeaving}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.5)',
                    background: isLeaving
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    color: isLeaving ? '#aaa' : '#6b6b80',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isLeaving ? 'wait' : 'pointer',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    if (!isLeaving) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                        e.currentTarget.style.color = '#e53e3e';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isLeaving) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
                        e.currentTarget.style.color = '#6b6b80';
                    }
                }}
            >
                <span style={{ fontSize: '1rem' }}>←</span>
                {isLeaving ? 'Leaving...' : 'Leave'}
            </button>

            {/* Confirmation dialog for beginner mode */}
            {showConfirm && (
                <div
                    onClick={() => setShowConfirm(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.6)',
                            maxWidth: '340px',
                            width: '100%',
                            fontFamily: "'Inter', sans-serif",
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#1a1a2e',
                            margin: '0 0 8px',
                        }}>
                            Leave Game?
                        </h3>
                        <p style={{
                            fontSize: '0.78rem',
                            color: '#6b6b80',
                            margin: '0 0 20px',
                            lineHeight: 1.5,
                        }}>
                            Leaving will forfeit your stake and remove you from the game.
                            This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    background: 'rgba(0,0,0,0.03)',
                                    color: '#6b6b80',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Stay
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); handleLeave(); }}
                                disabled={isLeaving}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {isLeaving ? 'Leaving...' : 'Leave & Forfeit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
