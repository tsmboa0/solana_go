// ============================================================
// Tile Action Popup — Solvestor (SWS)
// V4 - Data-Driven Action Modal
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { useTileActions } from '@/hooks/useTileActions';
import { TILES } from '@/config/boardTiles';
import { COLOR_GROUP_MAP } from '@/config/theme';
import { formatCurrency } from '@/utils/formatters';
import {
    TrendingUp, TrendingDown, AlertTriangle, Activity,
    ShieldCheck, Building2, ArrowRight, X, Zap, Vote, Landmark
} from 'lucide-react';
import type { TileActionConfig } from '@/types/game';

// Helper to evaluate string conditions securely using a limited scope context
function evaluateCondition(condition: string, context: any): boolean {
    if (condition === "true") return true;
    if (condition === "false") return false;

    try {
        const execute = new Function('context', `
            const { tile, player } = context;
            try {
                return !!(${condition});
            } catch (e) {
                console.error("Condition eval error", e);
                return false;
            }
        `);
        return execute(context);
    } catch (e) {
        console.error("Failed to parse condition:", condition, e);
        return false;
    }
}

export function TileActionPopup() {
    const activePopup = useUIStore((s) => s.activePopup);
    const popupTileId = useUIStore((s) => s.popupTileId);
    const theme = useUIStore((s) => s.theme);
    const currentPlayer = useGameStore(selectCurrentPlayer);
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const players = useGameStore((s) => s.players);
    const { skipAction, executeAction, executeRent } = useTileActions();

    const isDark = theme === 'dark';
    const tile = popupTileId !== null ? TILES[popupTileId] : null;
    const owner = popupTileId !== null ? ownedTiles[popupTileId] : null;
    const ownerPlayer = owner ? players.find((p) => p.id === owner) : null;

    if (!activePopup || !tile) return null;

    const fn = tile.tile_function as any; // Cast as any for easy prop access
    const tileType = tile.type;
    const tileColor = tile.color_group ? COLOR_GROUP_MAP[tile.color_group] : '#888';

    // Context for condition evaluation
    const evalContext = {
        tile: { ...tile, owner: ownerPlayer?.id || null },
        player: {
            ...currentPlayer,
            has_voted_this_epoch: false, // Stub
            collateral_value: 0 // Stub
        }
    };

    // --------------------------------------------------------
    // THEME & STYLING LOGIC (DYNAMIC PER CATEGORY)
    // --------------------------------------------------------
    let glassSurface = isDark
        ? 'bg-slate-900/60 border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        : 'bg-white/60 border-white/60 shadow-[0_16px_40px_rgba(0,0,0,0.1)]';

    let innerContainerStyle = isDark
        ? 'bg-white/[0.03] border-white/5'
        : 'bg-black/[0.02] border-black/5';

    let glowColor = tileColor;
    let sectorBadgeLabel = tileType.toUpperCase();
    let statusLabel = 'ACTIVE';
    let statusColor = 'text-slate-500 bg-slate-500/10 border-slate-500/20';

    if (tileType === 'defi') {
        glowColor = '#10B981';
        statusLabel = 'YIELDING';
        statusColor = isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30';
        innerContainerStyle = isDark ? 'bg-slate-800/50 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-500/20';
    } else if (tileType === 'risk') {
        glowColor = '#EF4444';
        statusLabel = 'HIGH RISK';
        statusColor = isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-500/10 border-rose-500/30';
        innerContainerStyle = isDark ? 'bg-red-950/30 border-rose-500/20' : 'bg-rose-50/50 border-rose-500/20';
    } else if (tileType === 'governance') {
        glowColor = '#0EA5E9';
        statusLabel = 'DAO ACTIVE';
        statusColor = isDark ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 'text-sky-700 bg-sky-500/10 border-sky-500/30';
        innerContainerStyle = isDark ? 'bg-sky-950/30 border-sky-500/20' : 'bg-sky-50/50 border-sky-500/20';
    } else if (tile.is_ownable) {
        statusLabel = ownerPlayer ? 'OWNED' : 'FOR SALE';
        statusColor = ownerPlayer
            ? (isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-500/10 border-rose-500/30')
            : (isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30');
    } else if (tileType === 'event' || tileType === 'chance' || tileType === 'chest') {
        glowColor = '#EAB308';
        statusLabel = 'EVENT';
        statusColor = isDark ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-yellow-700 bg-yellow-500/10 border-yellow-500/30';
    }

    // --------------------------------------------------------
    // DYNAMIC METRICS DASHBOARD
    // --------------------------------------------------------
    const renderDynamicMetrics = () => {
        const metrics = [];

        // Ownable
        if (fn.buy_price !== undefined) {
            metrics.push({ label: 'Protocol Value', value: formatCurrency(fn.buy_price), icon: <Building2 size={14} className="opacity-70" /> });
        }
        if (fn.rent_value !== undefined) {
            metrics.push({ label: 'Base Fee / Rent', value: formatCurrency(fn.rent_value), isHighlight: true, icon: <Activity size={14} className="opacity-70" /> });
        }
        // DeFi
        if (fn.epoch_yield_rate !== undefined) {
            metrics.push({ label: 'Epoch Yield', value: `${(fn.epoch_yield_rate * 100).toFixed(1)}%`, isHighlight: true, icon: <TrendingUp size={14} className={`opacity-70 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> });
        }
        if (fn.borrow_interest_rate !== undefined) {
            metrics.push({ label: 'Borrow Rate', value: `${(fn.borrow_interest_rate * 100).toFixed(1)}%`, icon: <Landmark size={14} className="opacity-70" /> });
        }
        if (fn.landing_fee !== undefined) {
            metrics.push({ label: 'Landing Fee', value: formatCurrency(fn.landing_fee), icon: <TrendingDown size={14} className={`opacity-70 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} /> });
        }
        // Risk
        if (fn.penalty_value !== undefined) {
            const val = fn.penalty_type === 'percentage' ? `${(fn.penalty_value * 100).toFixed(1)}%` : formatCurrency(fn.penalty_value);
            metrics.push({ label: 'Penalty', value: `-${val}`, isHighlight: true, isNegative: true, icon: <AlertTriangle size={14} className="opacity-70" /> });
        }
        if (fn.protection_source) {
            metrics.push({ label: 'Counter-Measure', value: fn.protection_source, icon: <ShieldCheck size={14} className={`opacity-70 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> });
        }
        // Governance
        if (fn.quorum_percentage !== undefined) {
            metrics.push({ label: 'Required Quorum', value: `${fn.quorum_percentage}%`, icon: <Vote size={14} className="opacity-70" /> });
        }
        if (fn.effect_duration_epochs !== undefined) {
            metrics.push({ label: 'Effect Duration', value: `${fn.effect_duration_epochs} Epochs`, icon: <Zap size={14} className="opacity-70" /> });
        }

        if (metrics.length === 0) return null;

        return (
            <div className={`rounded-2xl border shadow-inner ${innerContainerStyle}`} style={{ padding: '16px', marginBottom: '20px' }}>
                <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                    {metrics.map((m, i) => (
                        <div key={i} className={`flex flex-col rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5`} style={{ padding: '8px' }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                                {m.icon} {m.label}
                            </span>
                            <span className={`text-sm font-black ${m.isHighlight ? (m.isNegative ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')) : ''}`}>
                                {m.value}
                            </span>
                        </div>
                    ))}
                </div>
                {ownerPlayer && (
                    <div className="border-t border-black/10 dark:border-white/10 flex items-center" style={{ marginTop: '12px', paddingTop: '12px', gap: '8px' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Owned By:</span>
                        <span className="text-xs font-bold rounded-md border" style={{ padding: '2px 8px', color: ownerPlayer.color, borderColor: ownerPlayer.color, backgroundColor: `${ownerPlayer.color}20` }}>
                            {ownerPlayer.name}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // --------------------------------------------------------
    // ACTIONS FILTERING & RENDERING
    // --------------------------------------------------------

    // First figure out if rent needs to be forced.
    let actionsToRender: TileActionConfig[] = [];

    if (activePopup === 'rent' && fn.action_type === 'ownable' && ownerPlayer) {
        actionsToRender = [{
            id: 'pay_rent',
            label: `Pay ${formatCurrency(fn.rent_value)} Rent`,
            action_type: 'pay_rent',
            requires_input: false,
            is_primary: true,
            visibility_condition: 'true'
        }];
    } else if (activePopup === 'tax') {
        const taxAmt = fn.landing_fee || fn.penalty_value || 1000;
        actionsToRender = [{
            id: 'pay_tax',
            label: `Pay ${formatCurrency(taxAmt)}`,
            action_type: 'pay_tax',
            requires_input: false,
            is_primary: true,
            visibility_condition: 'true'
        }];
    } else {
        // Dynamic loading from schema
        actionsToRender = tile.available_actions?.filter(action => {
            return evaluateCondition(action.visibility_condition, evalContext);
        }) || [];

        // Fallback if empty (e.g. for events which might not have available_actions defined yet)
        if (actionsToRender.length === 0) {
            actionsToRender = [{
                id: 'skip',
                label: 'Continue',
                action_type: 'continue',
                requires_input: false,
                is_primary: true,
                visibility_condition: 'true'
            }];
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
                style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Darker Overlay Backdrop */}
                <div className="absolute inset-0 bg-black/50" onClick={skipAction} />

                {/* Main Glass Modal Card */}
                <motion.div
                    className={`relative w-full max-w-[420px] rounded-[2.5rem] border backdrop-blur-3xl overflow-hidden ${glassSurface}`}
                    initial={{ scale: 0.9, y: 40, rotateX: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 40, rotateX: -10, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    style={{ perspective: 1000 }}
                >
                    {/* Ambient Top Glow */}
                    <div
                        className="absolute top-0 left-0 w-full h-48 opacity-[0.15] blur-[60px] pointer-events-none"
                        style={{ backgroundColor: glowColor }}
                    />

                    <div className="relative z-10 flex flex-col" style={{ padding: '32px' }}>

                        {/* 1. HEADER (Identity Block) */}
                        <div className="flex items-start" style={{ gap: '20px', marginBottom: '24px' }}>
                            {/* Logo */}
                            <div className="relative shrink-0" style={{ marginTop: '4px' }}>
                                <div className="absolute inset-0 blur-md opacity-40 scale-110 rounded-2xl" style={{ backgroundColor: tileColor }} />
                                <div className={`relative w-16 h-16 rounded-[1.25rem] overflow-hidden shadow-inner flex items-center justify-center border ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-slate-200'}`} style={{ padding: '4px' }}>
                                    {tile.image_url ? (
                                        <img src={tile.image_url} alt={tile.project_name} className="w-full h-full object-contain drop-shadow-sm rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-500/50 rounded-xl" />
                                    )}
                                </div>
                            </div>

                            {/* Titles and Badges */}
                            <div className="flex flex-col flex-1">
                                <div className="flex items-center flex-wrap" style={{ gap: '8px', marginBottom: '8px' }}>
                                    <span className={`rounded-full text-[9px] font-black tracking-widest bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10`} style={{ padding: '2px 10px', color: tileColor !== '#888' ? tileColor : undefined }}>
                                        {sectorBadgeLabel}
                                    </span>
                                    <span className={`rounded-full text-[9px] font-bold tracking-wider border flex items-center ${statusColor}`} style={{ padding: '2px 8px', gap: '6px' }}>
                                        {statusLabel === 'YIELDING' && <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                        {statusLabel === 'HIGH RISK' && <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                        {statusLabel}
                                    </span>
                                </div>
                                <h3 className={`text-2xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ marginBottom: '6px' }}>
                                    {tile.project_name}
                                </h3>
                                <p className={`text-[13px] leading-snug font-medium opacity-70`}>
                                    {tile.description}
                                </p>
                            </div>
                        </div>

                        {/* Description (Game Effect) */}
                        <div className={`rounded-xl text-[13px] italic leading-relaxed font-serif opacity-90 border-l-4 ${isDark ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'}`} style={{ padding: '16px', marginBottom: '24px' }}>
                            {tile.game_description}
                        </div>

                        {/* 2. MIDDLE SECTION (Dashboard Metrics) */}
                        {renderDynamicMetrics()}

                        {/* 3. DYNAMIC ACTIONS BLOCK */}
                        <div className={`grid ${actionsToRender.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ gap: '10px', marginTop: 'auto' }}>
                            {actionsToRender.map((action, idx) => {
                                const isPrimary = action.is_primary;
                                const isPay = action.action_type === 'pay_rent' || action.action_type === 'pay_tax';

                                // Color logic based on primary state and type
                                let btnClass = "border ";
                                if (isPay) {
                                    btnClass += "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/20 hover:shadow-rose-500/40 border-transparent";
                                } else if (isPrimary) {
                                    btnClass += "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 border-transparent";
                                } else {
                                    btnClass += isDark
                                        ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                        : "bg-black/5 border-black/10 text-slate-700 hover:bg-black/10 hover:text-black";
                                }

                                // Disable logic if buy action but poor
                                let disabled = false;
                                if (action.action_type === 'buy' && (fn.buy_price && currentPlayer.balance < fn.buy_price)) {
                                    disabled = true;
                                    btnClass = "bg-slate-500/40 text-slate-400 cursor-not-allowed border border-white/10";
                                }

                                // Handle click
                                const onClick = () => {
                                    if (action.action_type === 'pay_rent') executeRent(popupTileId!);
                                    else if (action.action_type === 'pay_tax') skipAction(); // Just skip for now to clear modal
                                    else executeAction(action.id, popupTileId!);
                                };

                                // Make the last button span 2 columns if there's an odd number of items > 1
                                const makeSpan2 = actionsToRender.length === 3 && idx === 2;

                                return (
                                    <button
                                        key={action.id}
                                        onClick={onClick}
                                        disabled={disabled}
                                        className={`group relative w-full rounded-2xl font-bold text-[13px] tracking-wide transition-all duration-300 transform active:scale-[0.98] overflow-hidden shadow-sm flex items-center justify-center ${btnClass} ${makeSpan2 ? 'col-span-2' : ''}`}
                                        style={{ padding: '14px 16px', gap: '8px' }}
                                    >
                                        {!disabled && (isPrimary || isPay) && (
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        )}
                                        {isPay && <AlertTriangle size={16} />}
                                        {action.action_type === 'buy' && <Building2 size={16} />}
                                        {action.action_type === 'continue' && !isPrimary && <X size={16} className="opacity-70" />}
                                        {action.action_type === 'continue' && isPrimary && <ArrowRight size={16} />}

                                        <span className="truncate">{action.label}</span>
                                        {action.requires_input && <span className="uppercase opacity-50 bg-black/20 rounded" style={{ fontSize: '10px', marginLeft: '4px', padding: '2px 6px' }}>Setup</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
