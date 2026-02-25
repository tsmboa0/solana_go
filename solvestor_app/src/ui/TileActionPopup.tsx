// ============================================================
// Tile Action Popup — Solvestor (SWS)
// V3 - Premium Trading Dashboard Aesthetic
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
    ShieldCheck, Building2, Sparkles, ArrowRight, X, User
} from 'lucide-react';

const EVENT_CARDS = [
    { text: 'Airdrop received! Collect $500.', effect: 500 },
    { text: 'Protocol exploit! Lose $800.', effect: -800 },
    { text: 'Staking rewards! Collect $300.', effect: 300 },
    { text: 'Rug pull! Lose $600.', effect: -600 },
    { text: 'Validator bonus! Collect $400.', effect: 400 },
    { text: 'Gas spike! Lose $200.', effect: -200 },
    { text: 'DeFi yield bump! Collect $700.', effect: 700 },
    { text: 'Impermanent loss! Lose $500.', effect: -500 },
];

export function TileActionPopup() {
    const activePopup = useUIStore((s) => s.activePopup);
    const popupTileId = useUIStore((s) => s.popupTileId);
    const theme = useUIStore((s) => s.theme);
    const currentPlayer = useGameStore(selectCurrentPlayer);
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const players = useGameStore((s) => s.players);
    const { executeBuy, executeRent, skipAction } = useTileActions();

    const isDark = theme === 'dark';
    const tile = popupTileId !== null ? TILES[popupTileId] : null;
    const owner = popupTileId !== null ? ownedTiles[popupTileId] : null;
    const ownerPlayer = owner ? players.find((p) => p.id === owner) : null;

    const eventCard = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];

    if (!activePopup || !tile) return null;

    const fn = tile.tile_function;
    const tileType = tile.type;
    const tileColor = tile.color_group ? COLOR_GROUP_MAP[tile.color_group] : '#888';

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
    let statusLabel = '';
    let statusColor = '';

    // Determine Theme Overrides
    if (fn.action_type === 'defi') {
        glowColor = '#10B981'; // Emerald Green
        statusLabel = 'YIELDING';
        statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        innerContainerStyle = isDark ? 'bg-slate-800/50 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-500/20';
    } else if (fn.action_type === 'risk') {
        glowColor = '#EF4444'; // Red
        statusLabel = 'HIGH RISK';
        statusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        innerContainerStyle = isDark ? 'bg-red-950/30 border-rose-500/20' : 'bg-rose-50/50 border-rose-500/20';
    } else if (fn.action_type === 'governance') {
        glowColor = '#0EA5E9'; // Blue/Teal
        statusLabel = 'DAO ACTIVE';
        statusColor = 'text-sky-500 bg-sky-500/10 border-sky-500/20';
        innerContainerStyle = isDark ? 'bg-sky-950/30 border-sky-500/20' : 'bg-sky-50/50 border-sky-500/20';
    } else if (fn.action_type === 'ownable') {
        statusLabel = ownerPlayer ? 'OWNED' : 'FOR SALE';
        statusColor = ownerPlayer
            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
            : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }

    // Default status if empty
    if (!statusLabel) {
        statusLabel = 'ACTIVE';
        statusColor = 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }

    // --------------------------------------------------------
    // RENDER HELPERS
    // --------------------------------------------------------
    const renderMetricsDash = () => {
        if (fn.action_type === 'ownable') {
            return (
                <div className={`rounded-2xl p-5 mb-6 border shadow-inner relative overflow-hidden ${innerContainerStyle}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Building2 size={80} />
                    </div>
                    {ownerPlayer && (
                        <div className="flex items-center gap-2 mb-4 bg-black/5 dark:bg-white/5 py-1.5 px-3 rounded-full w-max border border-black/5 dark:border-white/5">
                            <User size={14} className="opacity-70" />
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80 decoration-2 underline-offset-2" style={{ color: ownerPlayer.color, textDecorationLine: 'underline', textDecorationColor: ownerPlayer.color }}>
                                {ownerPlayer.name}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-sm font-semibold opacity-70`}>Protocol Value</span>
                        <span className={`text-lg font-black`}>{formatCurrency(fn.buy_price)}</span>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-sm font-semibold opacity-70`}>Base Rent Fee</span>
                        <span className="text-md font-bold flex items-center gap-1.5 text-blue-500">
                            {formatCurrency(fn.rent_value)}
                        </span>
                    </div>

                    <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
                        <span className={`text-xs font-medium opacity-60`}>Your Balance</span>
                        <span className={`text-sm font-mono font-bold ${currentPlayer.balance >= fn.buy_price ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {formatCurrency(currentPlayer.balance)}
                        </span>
                    </div>
                </div>
            );
        }

        if (fn.action_type === 'defi') {
            return (
                <div className={`rounded-2xl p-5 mb-6 border shadow-inner relative overflow-hidden ${innerContainerStyle}`}>
                    {/* Faint Background Chart */}
                    <svg className="absolute inset-0 w-full h-full opacity-10 drop-shadow-lg" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="M0,80 L20,60 L40,75 L70,30 L100,45" fill="none" stroke="currentColor" strokeWidth="4" className="text-emerald-500" />
                    </svg>

                    {fn.epoch_yield_rate && (
                        <div className="flex justify-between items-center mb-3 relative z-10">
                            <span className={`text-sm font-semibold flex items-center gap-2 opacity-80`}>
                                <Activity size={16} /> Epoch Yield
                            </span>
                            <span className="text-sm font-black flex items-center gap-1 text-emerald-500">
                                <TrendingUp size={14} /> {(fn.epoch_yield_rate * 100).toFixed(0)}%
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <span className={`text-sm font-semibold flex items-center gap-2 opacity-80`}>
                            <AlertTriangle size={16} /> Liquidation Risk
                        </span>
                        <span className="text-sm font-bold flex gap-1 opacity-70">
                            <span className="bg-current rounded-full w-2 h-2"></span>
                            <span className="bg-current rounded-full w-2 h-2 opacity-30"></span>
                            <span className="bg-current rounded-full w-2 h-2 opacity-30"></span>
                        </span>
                    </div>
                    <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center relative z-10">
                        <span className={`text-sm font-bold opacity-90`}>Landing Fee</span>
                        <span className="text-xl font-black text-rose-500 flex items-center gap-1">
                            <TrendingDown size={18} /> {formatCurrency(fn.landing_fee)}
                        </span>
                    </div>
                </div>
            );
        }

        if (fn.action_type === 'risk') {
            return (
                <div className={`rounded-2xl p-5 mb-6 border shadow-inner relative overflow-hidden ${innerContainerStyle}`}>
                    {/* Faint Glitch Lines via CSS background */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)', color: 'red' }}></div>

                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-500 animate-pulse">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <span className={`block text-xs font-bold uppercase tracking-wider opacity-60`}>Hazard Detected</span>
                            <span className={`block text-md font-bold`}>Unexpected Market Penalty</span>
                        </div>
                    </div>

                    {fn.can_be_protected && (
                        <div className="flex justify-between items-center mb-3 relative z-10">
                            <span className={`text-sm font-semibold opacity-80 flex items-center gap-1.5`}>
                                <ShieldCheck size={16} /> Protection Status
                            </span>
                            <span className="text-sm font-bold text-emerald-500">Available</span>
                        </div>
                    )}
                    <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center relative z-10">
                        <span className={`text-sm font-bold opacity-90`}>Penalty Value</span>
                        <span className="text-2xl font-black text-rose-500">
                            {fn.penalty_type === 'percentage' ? `${(fn.penalty_value * 100).toFixed(0)}%` : `-${formatCurrency(fn.penalty_value)}`}
                        </span>
                    </div>
                </div>
            );
        }

        return null;
    };


    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
                style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Darker Overlay Backdrop */}
                <div className="absolute inset-0 bg-black/40" onClick={skipAction} />

                {/* Main Glass Modal Card */}
                <motion.div
                    className={`relative w-full max-w-sm rounded-[2rem] border backdrop-blur-3xl overflow-hidden ${glassSurface}`}
                    initial={{ scale: 0.95, y: 30, rotateX: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 30, rotateX: -10, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    style={{ perspective: 1000 }}
                >
                    {/* Noise Texture layer */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                    />

                    {/* Ambient Top Glow */}
                    <div
                        className="absolute top-0 left-0 w-full h-40 opacity-20 blur-[50px] pointer-events-none"
                        style={{ backgroundColor: glowColor }}
                    />

                    <div className="p-7 relative z-10 flex flex-col">

                        {/* 1. TOP SECTION (Identity Block) */}
                        <div className="flex items-center gap-5 mb-5">
                            {/* Larger Glowing Logo Container */}
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 blur-md opacity-40 scale-110 rounded-2xl" style={{ backgroundColor: tileColor }} />
                                <div className={`relative w-16 h-16 rounded-[1.25rem] overflow-hidden shadow-inner flex items-center justify-center p-1 border ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                                    {tile.image_url ? (
                                        <img src={tile.image_url} alt={tile.project_name} className="w-full h-full object-contain drop-shadow-sm rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-500/50 rounded-xl" />
                                    )}
                                </div>
                            </div>

                            {/* Titles and Badges */}
                            <div className="flex flex-col justify-center flex-1">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10`} style={{ color: tileColor !== '#888' ? tileColor : undefined }}>
                                        {sectorBadgeLabel}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border flex items-center gap-1 ${statusColor}`}>
                                        {statusLabel === 'YIELDING' && <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                        {statusLabel === 'HIGH RISK' && <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                        {statusLabel}
                                    </span>
                                </div>
                                <h3 className={`text-2xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {tile.project_name}
                                </h3>
                            </div>
                        </div>

                        {/* Description */}
                        <p className={`text-[13px] italic mb-5 leading-relaxed font-serif opacity-80 border-l-2 pl-3 ${isDark ? 'border-white/20' : 'border-black/20'}`}>
                            "{tile.description}"
                        </p>

                        {/* 2. MIDDLE SECTION (Dashboard Metrics) */}
                        {renderMetricsDash()}

                        {/* 3. BOTTOM SECTION (Dominant Action Area) */}
                        <div className="flex flex-col gap-3 mt-2">
                            {activePopup === 'buy' && fn.action_type === 'ownable' && (
                                <>
                                    <div className="text-center mb-1">
                                        <p className="text-xs font-semibold text-emerald-500/80">Projected Yield Next Epoch: +{formatCurrency(fn.rent_value * 1.5)}</p>
                                    </div>
                                    <button
                                        onClick={() => executeBuy(popupTileId!)}
                                        disabled={currentPlayer.balance < fn.buy_price}
                                        className={`group relative w-full py-4 px-5 rounded-2xl font-bold text-sm tracking-wide text-white transition-all duration-300 transform active:scale-[0.98] overflow-hidden shadow-lg flex items-center justify-center gap-2 ${currentPlayer.balance >= fn.buy_price
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20 hover:shadow-emerald-500/40'
                                            : 'bg-slate-500/40 cursor-not-allowed border border-white/10'
                                            }`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <Building2 size={18} /> Invest in Project
                                    </button>
                                </>
                            )}

                            {activePopup === 'rent' && fn.action_type === 'ownable' && ownerPlayer && (
                                <button
                                    onClick={() => executeRent(popupTileId!)}
                                    className="group relative w-full py-4 px-5 rounded-2xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 transition-all duration-300 transform active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <Activity size={18} /> Pay Rent Fee
                                </button>
                            )}

                            {activePopup === 'tax' && (
                                <button
                                    onClick={skipAction}
                                    className="group relative w-full py-4 px-5 rounded-2xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 transition-all duration-300 transform active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <AlertTriangle size={18} /> Pay Protocol Fee
                                </button>
                            )}

                            {activePopup === 'event' && (
                                <>
                                    <div className={`rounded-2xl p-5 mb-2 border text-center ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200 shadow-inner'}`}>
                                        <p className={`text-md font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {eventCard.text}
                                        </p>
                                        <span className={`text-4xl font-black drop-shadow-md ${eventCard.effect > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {eventCard.effect > 0 ? '+' : ''}
                                            {formatCurrency(eventCard.effect)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={skipAction}
                                        className="group relative w-full mt-2 py-4 px-5 rounded-2xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 transform active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <Sparkles size={18} /> Accept Fate
                                    </button>
                                </>
                            )}

                            {activePopup === 'corner' && (
                                <>
                                    <div className="text-center mb-1">
                                        <p className="text-sm font-semibold opacity-80">{tile.game_description}</p>
                                    </div>
                                    <button
                                        onClick={skipAction}
                                        className="group relative w-full py-4 px-5 rounded-2xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 transform active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <ArrowRight size={18} /> Acknowledge Tile
                                    </button>
                                </>
                            )}

                            {/* Secondary Ghost Action (For passing/skipping) */}
                            {['buy'].includes(activePopup) && (
                                <button
                                    onClick={skipAction}
                                    className={`py-3 mt-1 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 transition-all duration-200 hover:text-white ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-black/5 hover:text-slate-800'}`}
                                >
                                    <X size={16} /> Pass Target
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
