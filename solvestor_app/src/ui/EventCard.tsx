// ============================================================
// Event Card — Solvestor (SWS)
// ============================================================
// Special popup for Chance, Community Chest, and Corner tiles.
// Shows bold action text with theme-specific icons + OK button.
// On OK: applies prediction (confetti, balance, teleport, state).
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { useCoinConfetti } from '@/hooks/useCoinConfetti';
import { markTileSeen } from '@/hooks/useDiceRoll';
import { TILES } from '@/config/boardTiles';
import { CHEST_TILES, CHANCE_TILES } from '@/config/onChainConstants';
import { formatCurrency } from '@/utils/formatters';

import magicblockLogoImg from '@/assets/projects_logo/magicblock-logo.jpg';

// ─── Tile Icon ───────────────────────────────────────────────
function TileIcon({ actionType, cornerType, effectType, size = 56 }: {
    actionType: string; cornerType: string; effectType: string; size?: number;
}) {
    const iconMap: Record<string, string> = {
        // Corners
        'corner:go': '🚀',
        'corner:graveyard': '⚰️',
        'corner:grant': '🏛️',
        'corner:liquidation': '💀',
        // Risk / Tax
        'risk': '🤖',
        'tax': '💰',
        // Governance
        'governance': '🗳️',
        // Neutral / School
        'neutral': '📚',
        // Event (pump.fun, solana conf, etc.)
        'event': '⚡',
    };

    const key = actionType === 'corner' ? `corner:${cornerType}` : actionType;
    const emoji = iconMap[key] ?? (effectType === 'credit' ? '✨' : effectType === 'debit' ? '💸' : '🎯');

    return (
        <span style={{ fontSize: size * 0.7 }} className="select-none">
            {emoji}
        </span>
    );
}

// ─── Card color themes ───────────────────────────────────────
function getCardTheme(tileIndex: number, actionType: string, effectType: string) {
    const isChance = CHANCE_TILES.includes(tileIndex);
    const isChest = CHEST_TILES.includes(tileIndex);

    if (isChance) {
        return {
            gradient: 'from-orange-500 via-amber-500 to-yellow-500',
            glow: '#F59E0B',
            label: 'CHANCE',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.3)',
        };
    }
    if (isChest) {
        return {
            gradient: 'from-blue-500 via-indigo-500 to-purple-500',
            glow: '#6366F1',
            label: 'COMMUNITY CHEST',
            bg: 'rgba(99, 102, 241, 0.08)',
            border: 'rgba(99, 102, 241, 0.3)',
        };
    }

    // Risk tiles (MEV Bot, MEV Sandwich, USDC Tax)
    if (actionType === 'risk') {
        return {
            gradient: 'from-red-500 via-rose-500 to-pink-500',
            glow: '#EF4444',
            label: effectType === 'neutral' ? 'SHIELD ACTIVE' : 'MEV ATTACK',
            bg: 'rgba(239, 68, 68, 0.08)',
            border: 'rgba(239, 68, 68, 0.3)',
        };
    }

    // Governance
    if (actionType === 'governance') {
        return {
            gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
            glow: '#8B5CF6',
            label: 'GOVERNANCE',
            bg: 'rgba(139, 92, 246, 0.08)',
            border: 'rgba(139, 92, 246, 0.3)',
        };
    }

    // School / Neutral with bonus
    if (actionType === 'neutral') {
        return {
            gradient: 'from-sky-500 via-blue-500 to-indigo-500',
            glow: '#3B82F6',
            label: 'SCHOOL',
            bg: 'rgba(59, 130, 246, 0.08)',
            border: 'rgba(59, 130, 246, 0.3)',
        };
    }

    // Event (pump.fun, solana conf)
    if (actionType === 'event') {
        return effectType === 'credit'
            ? {
                gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
                glow: '#10B981',
                label: 'EVENT',
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.3)',
            }
            : {
                gradient: 'from-red-500 via-orange-500 to-amber-500',
                glow: '#F97316',
                label: 'EVENT',
                bg: 'rgba(249, 115, 22, 0.08)',
                border: 'rgba(249, 115, 22, 0.3)',
            };
    }

    // Corner (credit = grant, debit/graveyard = liquidation)
    if (effectType === 'credit') {
        return {
            gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
            glow: '#10B981',
            label: 'CORNER',
            bg: 'rgba(16, 185, 129, 0.08)',
            border: 'rgba(16, 185, 129, 0.3)',
        };
    }
    if (effectType === 'graveyard' || effectType === 'debit') {
        return {
            gradient: 'from-red-500 via-rose-500 to-pink-500',
            glow: '#EF4444',
            label: 'CORNER',
            bg: 'rgba(239, 68, 68, 0.08)',
            border: 'rgba(239, 68, 68, 0.3)',
        };
    }

    return {
        gradient: 'from-slate-500 via-gray-500 to-zinc-500',
        glow: '#64748B',
        label: 'EVENT',
        bg: 'rgba(100, 116, 139, 0.08)',
        border: 'rgba(100, 116, 139, 0.3)',
    };
}

// ─── Main Component ──────────────────────────────────────────

export function EventCard() {
    const activePopup = useUIStore((s) => s.activePopup);
    const popupTileId = useUIStore((s) => s.popupTileId);
    const pendingResult = useUIStore((s) => s.pendingEventResult);
    const closePopup = useUIStore((s) => s.closePopup);
    const theme = useUIStore((s) => s.theme);

    const currentPlayer = useGameStore(selectCurrentPlayer);
    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const showCoinEffect = useCoinConfetti((s) => s.showCoinEffect);

    if (activePopup !== 'event_card' || popupTileId === null || !pendingResult) return null;

    const tile = TILES[popupTileId];
    if (!tile) return null;

    const isDark = theme === 'dark';
    const isChance = CHANCE_TILES.includes(popupTileId);
    const isChest = CHEST_TILES.includes(popupTileId);
    const actionType = (tile.tile_function as any).action_type;
    const cornerType = actionType === 'corner' ? (tile.tile_function as any).corner_type : '';
    const cardTheme = getCardTheme(popupTileId, actionType, pendingResult.effectType);

    // ─── Handler: OK button — applies prediction ─────────────
    const handleOK = () => {
        const playerId = currentPlayer?.id;
        if (!playerId) {
            closePopup();
            return;
        }

        // 1. Apply balance change with confetti
        if (pendingResult.balanceChange !== 0) {
            const type = pendingResult.balanceChange > 0 ? 'credit' : 'debit';
            showCoinEffect(Math.abs(pendingResult.balanceChange), type as 'credit' | 'debit', pendingResult.message);

            const players = useGameStore.getState().players;
            const idx = players.findIndex((p) => p.id === playerId);
            if (idx !== -1) {
                useGameStore.getState().updatePlayerFromChain(playerId, {
                    balance: Math.max(0, players[idx].balance + pendingResult.balanceChange),
                });
            }
        }

        // 2. Apply state changes
        if (pendingResult.stateChanges) {
            useGameStore.getState().updatePlayerFromChain(playerId, {
                ...pendingResult.stateChanges,
            });
        }

        // 3. Handle teleportation (rush movement)
        if (pendingResult.newPosition !== undefined) {
            const currentPos = useGameStore.getState().players.find((p) => p.id === playerId)?.position ?? 0;
            if (pendingResult.newPosition !== currentPos) {
                // Dispatch rush teleport event — useTokenMovement will handle the fast animation
                window.dispatchEvent(new CustomEvent('solvestor:rushTeleport', {
                    detail: { playerId, targetPosition: pendingResult.newPosition },
                }));
            }
        }

        // 4. Fire on-chain (beginner mode only)
        if (isBeginnerMode) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('solvestor:performTileAction', {
                    detail: { tileIndex: popupTileId, chooseAction: false },
                }));
            }, 100);
        }

        // 5. Mark tile as seen (so next time it auto-resolves)
        markTileSeen(popupTileId);

        // 6. Close and end turn
        closePopup();
        useGameStore.getState().setPhase('turnEnd');
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
                style={{ WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60" />

                {/* Card */}
                <motion.div
                    className={`relative w-full max-w-[380px] rounded-[2rem] border backdrop-blur-3xl overflow-hidden ${isDark
                        ? 'bg-slate-900/80 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)]'
                        : 'bg-white/80 border-white/60 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
                        }`}
                    initial={{ scale: 0.8, y: 60, rotateX: 15, opacity: 0 }}
                    animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: 60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    style={{ perspective: 1200 }}
                >
                    {/* Top gradient bar */}
                    <div className={`h-2 w-full bg-gradient-to-r ${cardTheme.gradient}`} />

                    {/* Ambient glow */}
                    <div
                        className="absolute top-0 left-0 w-full h-40 blur-[80px] pointer-events-none opacity-20"
                        style={{ background: `radial-gradient(circle at 50% 0%, ${cardTheme.glow}, transparent 70%)` }}
                    />

                    {/* Content */}
                    <div className="relative" style={{ padding: '32px 28px 24px' }}>
                        {/* Badge + Icon row */}
                        <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                            {/* Type badge */}
                            <span
                                className={`text-[10px] font-black uppercase tracking-[0.15em] rounded-full border`}
                                style={{
                                    padding: '5px 14px',
                                    background: cardTheme.bg,
                                    borderColor: cardTheme.border,
                                    color: cardTheme.glow,
                                }}
                            >
                                {cardTheme.label}
                            </span>

                            {/* Effect badge */}
                            {pendingResult.balanceChange !== 0 && (
                                <span
                                    className={`text-sm font-black rounded-lg ${pendingResult.balanceChange > 0
                                        ? 'text-emerald-500 bg-emerald-500/10'
                                        : 'text-rose-500 bg-rose-500/10'
                                        }`}
                                    style={{ padding: '4px 12px' }}
                                >
                                    {pendingResult.balanceChange > 0 ? '+' : ''}
                                    {formatCurrency(pendingResult.balanceChange)}
                                </span>
                            )}
                        </div>

                        {/* Icon — large */}
                        <div className="flex justify-center" style={{ marginBottom: '24px' }}>
                            {(isChance || isChest) ? (
                                <motion.div
                                    animate={{ rotate: [0, 3, -3, 0] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                    className="rounded-2xl overflow-hidden shadow-lg border-2 border-white/20"
                                    style={{ width: 80, height: 80, backgroundColor: 'white' }}
                                >
                                    <img src={magicblockLogoImg} alt="MagicBlock Logo" className="w-full h-full object-contain p-1" />
                                </motion.div>
                            ) : tile.image_url ? (
                                <motion.div
                                    className="flex items-center justify-center rounded-2xl overflow-hidden"
                                    style={{ width: 80, height: 80 }}
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                >
                                    <img src={tile.image_url} alt={tile.project_name} className="w-full h-full object-cover rounded-2xl" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    className="flex items-center justify-center rounded-2xl"
                                    style={{
                                        width: 80,
                                        height: 80,
                                        background: cardTheme.bg,
                                        border: `2px solid ${cardTheme.border}`,
                                    }}
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                >
                                    <TileIcon actionType={actionType} cornerType={cornerType} effectType={pendingResult.effectType} size={56} />
                                </motion.div>
                            )}
                        </div>

                        {/* Tile name */}
                        <h3
                            className={`text-center text-lg font-bold tracking-tight ${isDark ? 'text-white/60' : 'text-slate-500'
                                }`}
                            style={{ marginBottom: '8px' }}
                        >
                            {tile.project_name}
                        </h3>

                        {/* Action text — BOLD */}
                        <div
                            className={`text-center rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                                }`}
                            style={{ padding: '20px 16px', marginBottom: '24px' }}
                        >
                            <p
                                className={`text-xl font-black leading-snug ${isDark ? 'text-white' : 'text-slate-900'
                                    }`}
                            >
                                {pendingResult.message}
                            </p>
                        </div>

                        {/* Teleport indicator */}
                        {pendingResult.newPosition !== undefined && (
                            <div
                                className={`flex items-center justify-center text-xs font-bold rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                    }`}
                                style={{ padding: '8px 12px', marginBottom: '16px', gap: '6px' }}
                            >
                                ⚡ Token will rush to tile {pendingResult.newPosition}
                            </div>
                        )}

                        {/* OK Button */}
                        <motion.button
                            onClick={handleOK}
                            className={`w-full rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 transform active:scale-[0.97] border bg-gradient-to-r ${cardTheme.gradient} text-white border-transparent shadow-lg`}
                            style={{ padding: '16px' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            OK
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
