// ============================================================
// Game Info Panel — Solvestor (SWS)
// ============================================================
// Slide-out panel showing comprehensive game state:
//   - Wealth leaderboard with rankings
//   - Properties owned per player
//   - Go counts (global + individual)
//   - Player status effects
//   - Net worth breakdown
// ============================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/useGameStore';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import { useUIStore } from '@/stores/useUIStore';
import { TILES } from '@/config/boardTiles';
import { COLOR_GROUP_MAP } from '@/config/theme';
import { formatCurrency } from '@/utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────

function getPropertyValue(tileIndex: number): number {
    const tile = TILES[tileIndex];
    if (!tile || tile.tile_function.action_type !== 'ownable') return 0;
    return (tile.tile_function as any).buy_price || 0;
}

function getPropertyRent(tileIndex: number): number {
    const tile = TILES[tileIndex];
    if (!tile || tile.tile_function.action_type !== 'ownable') return 0;
    return (tile.tile_function as any).rent_value || 0;
}

// ─── Component ───────────────────────────────────────────────

export function GameInfoPanel() {
    const isOpen = useUIStore((s) => s.isGameInfoOpen);
    const togglePanel = useUIStore((s) => s.toggleGameInfo);
    const theme = useUIStore((s) => s.theme);

    const players = useGameStore((s) => s.players);
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const turnNumber = useGameStore((s) => s.turnNumber);
    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const localPlayerIndex = useGameStore((s) => s.localPlayerIndex);

    // On-chain state for Go counts
    const currentGameState = useBlockchainStore((s) => s.currentGameState);
    const currentPlayerState = useBlockchainStore((s) => s.currentPlayerState);
    const remotePlayerStates = useBlockchainStore((s) => s.remotePlayerStates);

    const isDark = theme === 'dark';

    // ─── Computed data ───────────────────────────────────────

    // Net worth = cash + property values
    const playerStats = useMemo(() => {
        return players.map((player, index) => {
            const propertyValue = player.ownedTiles.reduce(
                (sum, tileId) => sum + getPropertyValue(tileId), 0
            );
            const rentIncome = player.ownedTiles.reduce(
                (sum, tileId) => sum + getPropertyRent(tileId), 0
            );
            const netWorth = player.balance + propertyValue;

            // Get Go passes from on-chain state
            let goPasses = 0;
            if (isBeginnerMode) {
                if (index === localPlayerIndex && currentPlayerState) {
                    goPasses = currentPlayerState.goPasses ?? 0;
                } else {
                    const remotePubkey = player.id;
                    const remoteState = remotePlayerStates[remotePubkey];
                    if (remoteState) {
                        goPasses = remoteState.goPasses ?? 0;
                    }
                }
            }

            return {
                ...player,
                index,
                propertyValue,
                rentIncome,
                netWorth,
                goPasses,
                propertyCount: player.ownedTiles.length,
            };
        }).sort((a, b) => b.netWorth - a.netWorth);
    }, [players, isBeginnerMode, localPlayerIndex, currentPlayerState, remotePlayerStates]);

    const globalGoCount = currentGameState?.goCount ?? 0;
    const totalProperties = Object.keys(ownedTiles).length;
    const totalOwnableProperties = TILES.filter(
        (t) => t.tile_function.action_type === 'ownable'
    ).length;

    // ─── Styles ──────────────────────────────────────────────

    const panelBg = isDark
        ? 'rgba(10, 10, 20, 0.92)'
        : 'rgba(255, 255, 255, 0.92)';
    const cardBg = isDark
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(0, 0, 0, 0.03)';
    const borderColor = isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f0f0f5' : '#1a1a2e';
    const textSecondary = isDark ? '#8888aa' : '#555570';
    const textMuted = isDark ? '#555570' : '#999';
    const accentGradient = 'linear-gradient(135deg, #9945FF, #14F195)';

    // ─── Rank badge ──────────────────────────────────────────

    const rankEmoji = (rank: number) => {
        if (rank === 0) return '👑';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        return `#${rank + 1}`;
    };

    // ─── Status badges ───────────────────────────────────────

    const statusBadges = (player: typeof playerStats[0]) => {
        const badges: { icon: string; label: string; color: string }[] = [];
        if (player.hasShield) badges.push({ icon: '🛡️', label: 'Shield', color: '#4ECDC4' });
        if (player.hasStakedDefi) badges.push({ icon: '📈', label: 'Staked', color: '#14F195' });
        if (player.hasPotion) badges.push({ icon: '🧪', label: 'Potion', color: '#9945FF' });
        if (player.isInGraveyard) badges.push({ icon: '💀', label: 'Graveyard', color: '#FF4D6A' });
        return badges;
    };

    return (
        <>
            {/* Toggle Button — fixed on right edge */}
            <motion.button
                onClick={togglePanel}
                style={{
                    position: 'fixed',
                    right: isOpen ? '340px' : '0',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 60,
                    width: '36px',
                    height: '72px',
                    borderRadius: '12px 0 0 12px',
                    border: `1px solid ${borderColor}`,
                    borderRight: 'none',
                    background: panelBg,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isDark
                        ? '-4px 0 20px rgba(0,0,0,0.4)'
                        : '-4px 0 20px rgba(0,0,0,0.08)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span style={{
                    fontSize: '1.1rem',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.3s ease',
                }}>
                    📊
                </span>
            </motion.button>

            {/* Backdrop (mobile) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={togglePanel}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            zIndex: 58,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '340px',
                            maxWidth: '90vw',
                            zIndex: 59,
                            background: panelBg,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            borderLeft: `1px solid ${borderColor}`,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            boxShadow: isDark
                                ? '-8px 0 40px rgba(0,0,0,0.5)'
                                : '-8px 0 40px rgba(0,0,0,0.1)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '20px 20px 0',
                            position: 'sticky',
                            top: 0,
                            background: panelBg,
                            backdropFilter: 'blur(24px)',
                            zIndex: 2,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                            }}>
                                <div>
                                    <h2 style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 800,
                                        fontFamily: "'Inter', sans-serif",
                                        color: textPrimary,
                                        margin: 0,
                                        letterSpacing: '-0.02em',
                                    }}>
                                        Game Dashboard
                                    </h2>
                                    <p style={{
                                        fontSize: '0.7rem',
                                        color: textMuted,
                                        margin: '2px 0 0',
                                        fontFamily: "'Inter', sans-serif",
                                    }}>
                                        Turn {turnNumber} • {totalProperties}/{totalOwnableProperties} properties owned
                                    </p>
                                </div>
                                <button
                                    onClick={togglePanel}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '10px',
                                        border: `1px solid ${borderColor}`,
                                        background: cardBg,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.9rem',
                                        color: textSecondary,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Global Stats Row */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                marginBottom: '16px',
                            }}>
                                <div style={{
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: cardBg,
                                    border: `1px solid ${borderColor}`,
                                }}>
                                    <div style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        color: textMuted,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '0.08em',
                                        marginBottom: '4px',
                                    }}>
                                        🔄 Global Go Count
                                    </div>
                                    <div style={{
                                        fontSize: '1.2rem',
                                        fontWeight: 800,
                                        fontFamily: "'Inter', monospace",
                                        background: accentGradient,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                        {globalGoCount}
                                    </div>
                                </div>
                                <div style={{
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: cardBg,
                                    border: `1px solid ${borderColor}`,
                                }}>
                                    <div style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        color: textMuted,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '0.08em',
                                        marginBottom: '4px',
                                    }}>
                                        🏠 Properties Claimed
                                    </div>
                                    <div style={{
                                        fontSize: '1.2rem',
                                        fontWeight: 800,
                                        fontFamily: "'Inter', monospace",
                                        color: textPrimary,
                                    }}>
                                        {totalProperties}
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: textMuted,
                                            fontWeight: 500,
                                        }}>/{totalOwnableProperties}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                height: '1px',
                                background: borderColor,
                            }} />
                        </div>

                        {/* Wealth Rankings — Only #1 + Local Player */}
                        <div style={{ padding: '12px 20px 20px' }}>
                            <div style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: textMuted,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.1em',
                                marginBottom: '10px',
                            }}>
                                🏆 Wealth Rankings
                            </div>

                            {/* #1 Wealthiest Player */}
                            {playerStats.length > 0 && (() => {
                                const leader = playerStats[0];
                                const isLeaderLocal = leader.index === localPlayerIndex;
                                const badges = statusBadges(leader);

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            marginBottom: '8px',
                                            borderRadius: '14px',
                                            border: isLeaderLocal
                                                ? '1px solid rgba(153, 69, 255, 0.3)'
                                                : `1px solid rgba(255, 215, 0, 0.25)`,
                                            background: isLeaderLocal
                                                ? isDark ? 'rgba(153, 69, 255, 0.08)' : 'rgba(153, 69, 255, 0.04)'
                                                : isDark ? 'rgba(255, 215, 0, 0.06)' : 'rgba(255, 215, 0, 0.04)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div style={{
                                            padding: '12px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                        }}>
                                            <div style={{ fontSize: '1.3rem', width: '28px', textAlign: 'center' as const }}>
                                                👑
                                            </div>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${leader.color}, ${leader.color}88)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: 'white',
                                                flexShrink: 0,
                                                border: isLeaderLocal ? '2px solid #9945FF' : '2px solid rgba(255,215,0,0.4)',
                                            }}>
                                                {leader.name.charAt(0)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        color: textPrimary,
                                                    }}>
                                                        {leader.name}
                                                    </span>
                                                    {isLeaderLocal && (
                                                        <span style={{
                                                            fontSize: '0.5rem',
                                                            fontWeight: 700,
                                                            color: '#9945FF',
                                                            background: 'rgba(153, 69, 255, 0.15)',
                                                            padding: '1px 6px',
                                                            borderRadius: '6px',
                                                        }}>
                                                            YOU
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: textMuted }}>
                                                    Tile {leader.position} • {leader.propertyCount} properties • Go ×{leader.goPasses}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' as const }}>
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 800,
                                                    fontFamily: "'Inter', monospace",
                                                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}>
                                                    {formatCurrency(leader.netWorth)}
                                                </div>
                                                <div style={{ fontSize: '0.5rem', color: textMuted }}>net worth</div>
                                            </div>
                                        </div>

                                        {/* Stats Row — always show for the leader */}
                                        {isLeaderLocal && (
                                            <>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr 1fr',
                                                    gap: '1px',
                                                    background: borderColor,
                                                }}>
                                                    {[
                                                        { icon: '💰', label: 'Cash', value: formatCurrency(leader.balance), color: textPrimary },
                                                        { icon: '🏠', label: 'Assets', value: formatCurrency(leader.propertyValue), color: '#14F195' },
                                                        { icon: '🔄', label: 'Go', value: `${leader.goPasses}×`, color: '#9945FF' },
                                                    ].map((stat) => (
                                                        <div key={stat.label} style={{
                                                            padding: '8px 10px',
                                                            background: isDark ? 'rgba(10,10,20,0.6)' : 'rgba(255,255,255,0.6)',
                                                            textAlign: 'center' as const,
                                                        }}>
                                                            <div style={{
                                                                fontSize: '0.5rem',
                                                                color: textMuted,
                                                                fontWeight: 600,
                                                                textTransform: 'uppercase' as const,
                                                                letterSpacing: '0.06em',
                                                                marginBottom: '2px',
                                                            }}>
                                                                {stat.icon} {stat.label}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                fontFamily: "'Inter', monospace",
                                                                color: stat.color,
                                                            }}>
                                                                {stat.value}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Status badges */}
                                                {badges.length > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '6px',
                                                        padding: '8px 14px',
                                                        flexWrap: 'wrap' as const,
                                                    }}>
                                                        {badges.map((b) => (
                                                            <span
                                                                key={b.label}
                                                                style={{
                                                                    fontSize: '0.55rem',
                                                                    fontWeight: 600,
                                                                    color: b.color,
                                                                    background: `${b.color}18`,
                                                                    border: `1px solid ${b.color}30`,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px',
                                                                }}
                                                            >
                                                                {b.icon} {b.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Owned Properties */}
                                                {leader.ownedTiles.length > 0 && (
                                                    <div style={{
                                                        padding: '6px 14px 10px',
                                                        borderTop: `1px solid ${borderColor}`,
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.55rem',
                                                            fontWeight: 600,
                                                            color: textMuted,
                                                            textTransform: 'uppercase' as const,
                                                            letterSpacing: '0.06em',
                                                            marginBottom: '6px',
                                                        }}>
                                                            Your Properties
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap' as const,
                                                            gap: '4px',
                                                        }}>
                                                            {leader.ownedTiles.map((tileId) => {
                                                                const tile = TILES[tileId];
                                                                if (!tile) return null;
                                                                const groupColor = tile.color_group
                                                                    ? COLOR_GROUP_MAP[tile.color_group] || textMuted
                                                                    : textMuted;
                                                                return (
                                                                    <span
                                                                        key={tileId}
                                                                        title={`${tile.project_name} — Value: ${formatCurrency(getPropertyValue(tileId))}, Rent: ${formatCurrency(getPropertyRent(tileId))}`}
                                                                        style={{
                                                                            fontSize: '0.55rem',
                                                                            fontWeight: 600,
                                                                            color: groupColor,
                                                                            background: `${groupColor}15`,
                                                                            border: `1px solid ${groupColor}30`,
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            cursor: 'default',
                                                                            whiteSpace: 'nowrap' as const,
                                                                        }}
                                                                    >
                                                                        {tile.project_name}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })()}

                            {/* Local Player's Position (if not already #1) */}
                            {playerStats.length > 0 && (() => {
                                const localRank = playerStats.findIndex((p) => p.index === localPlayerIndex);
                                if (localRank <= 0) return null; // Already shown as #1
                                const localPlayer = playerStats[localRank];
                                const badges = statusBadges(localPlayer);
                                const wealthPercent = playerStats[0].netWorth > 0
                                    ? (localPlayer.netWorth / playerStats[0].netWorth) * 100
                                    : 0;

                                return (
                                    <>
                                        {/* Separator with rank info */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 0',
                                        }}>
                                            <div style={{
                                                flex: 1,
                                                height: '1px',
                                                background: borderColor,
                                            }} />
                                            <span style={{
                                                fontSize: '0.55rem',
                                                fontWeight: 600,
                                                color: textMuted,
                                                textTransform: 'uppercase' as const,
                                                letterSpacing: '0.08em',
                                            }}>
                                                Your Position
                                            </span>
                                            <div style={{
                                                flex: 1,
                                                height: '1px',
                                                background: borderColor,
                                            }} />
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            style={{
                                                borderRadius: '14px',
                                                border: '1px solid rgba(153, 69, 255, 0.3)',
                                                background: isDark
                                                    ? 'rgba(153, 69, 255, 0.08)'
                                                    : 'rgba(153, 69, 255, 0.04)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {/* Header */}
                                            <div style={{
                                                padding: '12px 14px 8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                            }}>
                                                <div style={{
                                                    fontSize: '0.85rem',
                                                    width: '28px',
                                                    textAlign: 'center' as const,
                                                    fontWeight: 800,
                                                    color: textSecondary,
                                                }}>
                                                    {rankEmoji(localRank)}
                                                </div>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${localPlayer.color}, ${localPlayer.color}88)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    color: 'white',
                                                    flexShrink: 0,
                                                    border: '2px solid #9945FF',
                                                }}>
                                                    {localPlayer.name.charAt(0)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            color: textPrimary,
                                                        }}>
                                                            {localPlayer.name}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.5rem',
                                                            fontWeight: 700,
                                                            color: '#9945FF',
                                                            background: 'rgba(153, 69, 255, 0.15)',
                                                            padding: '1px 6px',
                                                            borderRadius: '6px',
                                                        }}>
                                                            YOU
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.6rem', color: textMuted }}>
                                                        Tile {localPlayer.position} • {localPlayer.propertyCount} properties
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' as const }}>
                                                    <div style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 800,
                                                        fontFamily: "'Inter', monospace",
                                                        color: textPrimary,
                                                    }}>
                                                        {formatCurrency(localPlayer.netWorth)}
                                                    </div>
                                                    <div style={{ fontSize: '0.5rem', color: textMuted }}>net worth</div>
                                                </div>
                                            </div>

                                            {/* Wealth bar vs leader */}
                                            <div style={{
                                                margin: '0 14px 8px',
                                                height: '3px',
                                                borderRadius: '2px',
                                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                                overflow: 'hidden',
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${wealthPercent}%` }}
                                                    transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                                                    style={{
                                                        height: '100%',
                                                        borderRadius: '2px',
                                                        background: accentGradient,
                                                    }}
                                                />
                                            </div>

                                            {/* Stats Row */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr 1fr',
                                                gap: '1px',
                                                background: borderColor,
                                            }}>
                                                {[
                                                    { icon: '💰', label: 'Cash', value: formatCurrency(localPlayer.balance), color: textPrimary },
                                                    { icon: '🏠', label: 'Assets', value: formatCurrency(localPlayer.propertyValue), color: '#14F195' },
                                                    { icon: '🔄', label: 'Go', value: `${localPlayer.goPasses}×`, color: '#9945FF' },
                                                ].map((stat) => (
                                                    <div key={stat.label} style={{
                                                        padding: '8px 10px',
                                                        background: isDark ? 'rgba(10,10,20,0.6)' : 'rgba(255,255,255,0.6)',
                                                        textAlign: 'center' as const,
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.5rem',
                                                            color: textMuted,
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase' as const,
                                                            letterSpacing: '0.06em',
                                                            marginBottom: '2px',
                                                        }}>
                                                            {stat.icon} {stat.label}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            fontFamily: "'Inter', monospace",
                                                            color: stat.color,
                                                        }}>
                                                            {stat.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Status badges */}
                                            {badges.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    flexWrap: 'wrap' as const,
                                                }}>
                                                    {badges.map((b) => (
                                                        <span
                                                            key={b.label}
                                                            style={{
                                                                fontSize: '0.55rem',
                                                                fontWeight: 600,
                                                                color: b.color,
                                                                background: `${b.color}18`,
                                                                border: `1px solid ${b.color}30`,
                                                                padding: '2px 8px',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                            }}
                                                        >
                                                            {b.icon} {b.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Owned Properties */}
                                            {localPlayer.ownedTiles.length > 0 && (
                                                <div style={{
                                                    padding: '6px 14px 10px',
                                                    borderTop: `1px solid ${borderColor}`,
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.55rem',
                                                        fontWeight: 600,
                                                        color: textMuted,
                                                        textTransform: 'uppercase' as const,
                                                        letterSpacing: '0.06em',
                                                        marginBottom: '6px',
                                                    }}>
                                                        Your Properties
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap' as const,
                                                        gap: '4px',
                                                    }}>
                                                        {localPlayer.ownedTiles.map((tileId) => {
                                                            const tile = TILES[tileId];
                                                            if (!tile) return null;
                                                            const groupColor = tile.color_group
                                                                ? COLOR_GROUP_MAP[tile.color_group] || textMuted
                                                                : textMuted;
                                                            return (
                                                                <span
                                                                    key={tileId}
                                                                    title={`${tile.project_name} — Value: ${formatCurrency(getPropertyValue(tileId))}, Rent: ${formatCurrency(getPropertyRent(tileId))}`}
                                                                    style={{
                                                                        fontSize: '0.55rem',
                                                                        fontWeight: 600,
                                                                        color: groupColor,
                                                                        background: `${groupColor}15`,
                                                                        border: `1px solid ${groupColor}30`,
                                                                        padding: '2px 8px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'default',
                                                                        whiteSpace: 'nowrap' as const,
                                                                    }}
                                                                >
                                                                    {tile.project_name}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </>
                                );
                            })()}

                            {/* Rent Income Summary */}
                            <div style={{
                                marginTop: '16px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: `1px solid ${borderColor}`,
                                background: cardBg,
                            }}>
                                <div style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: textMuted,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.1em',
                                    marginBottom: '10px',
                                }}>
                                    💸 Rent Income / Turn
                                </div>
                                {playerStats.map((player) => (
                                    <div
                                        key={player.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '4px 0',
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: player.color,
                                            }} />
                                            <span style={{
                                                fontSize: '0.72rem',
                                                color: textPrimary,
                                                fontWeight: 500,
                                            }}>
                                                {player.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            fontFamily: "'Inter', monospace",
                                            color: player.rentIncome > 0 ? '#14F195' : textMuted,
                                        }}>
                                            {player.rentIncome > 0
                                                ? `+${formatCurrency(player.rentIncome)}`
                                                : '—'
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
