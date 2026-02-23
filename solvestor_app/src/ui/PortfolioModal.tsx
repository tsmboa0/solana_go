// ============================================================
// Portfolio Modal — Solvestor (SWS)
// ============================================================
// Full-screen overlay showing owned tiles and net worth.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { TILES } from '@/config/tiles';
import { formatCurrency } from '@/utils/formatters';

export function PortfolioModal() {
    const isOpen = useUIStore((s) => s.isPortfolioOpen);
    const closePortfolio = useUIStore((s) => s.closePortfolio);
    const portfolioPlayerId = useUIStore((s) => s.portfolioPlayerId);
    const players = useGameStore((s) => s.players);
    const theme = useUIStore((s) => s.theme);

    const isDark = theme === 'dark';
    const player = players.find((p) => p.id === portfolioPlayerId);

    if (!player) return null;

    // Calculate portfolio value
    const ownedTileData = player.ownedTiles.map((id) => TILES[id]);
    const portfolioValue = ownedTileData.reduce(
        (sum, t) => sum + (t.price ?? 0),
        0
    );
    const netWorth = player.balance + portfolioValue;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 ${isDark ? 'bg-[#0a0a0f]/95' : 'bg-white/95'
                            } backdrop-blur-xl`}
                    />

                    {/* Content */}
                    <div className="relative h-full overflow-y-auto pb-12">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 pt-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: player.color }}
                                />
                                <h2
                                    className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {player.name}
                                </h2>
                            </div>
                            <button
                                onClick={closePortfolio}
                                className={`text-2xl p-2 ${isDark ? 'text-white/60' : 'text-gray-500'
                                    }`}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Net worth cards */}
                        <div className="px-4 grid grid-cols-3 gap-3 mb-6">
                            <div
                                className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                    }`}
                            >
                                <div
                                    className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'
                                        }`}
                                >
                                    Cash
                                </div>
                                <div
                                    className={`text-sm font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {formatCurrency(player.balance)}
                                </div>
                            </div>
                            <div
                                className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                    }`}
                            >
                                <div
                                    className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'
                                        }`}
                                >
                                    Assets
                                </div>
                                <div
                                    className={`text-sm font-bold font-mono ${isDark ? 'text-purple-400' : 'text-purple-600'
                                        }`}
                                >
                                    {formatCurrency(portfolioValue)}
                                </div>
                            </div>
                            <div
                                className={`rounded-2xl p-4 ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'
                                    }`}
                            >
                                <div
                                    className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'
                                        }`}
                                >
                                    Net Worth
                                </div>
                                <div
                                    className={`text-sm font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'
                                        }`}
                                >
                                    {formatCurrency(netWorth)}
                                </div>
                            </div>
                        </div>

                        {/* Portfolio composition bar */}
                        {ownedTileData.length > 0 && (
                            <div className="px-4 mb-6">
                                <div
                                    className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'
                                        }`}
                                >
                                    Portfolio Composition
                                </div>
                                <div className="flex h-3 rounded-full overflow-hidden">
                                    {ownedTileData.map((t, i) => (
                                        <div
                                            key={i}
                                            className="transition-all"
                                            style={{
                                                backgroundColor: t.colorBand,
                                                flex: t.price ?? 1,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Owned tiles list */}
                        <div className="px-4">
                            <h3
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-white/60' : 'text-gray-600'
                                    }`}
                            >
                                Holdings ({ownedTileData.length})
                            </h3>

                            {ownedTileData.length === 0 && (
                                <p
                                    className={`text-sm py-8 text-center ${isDark ? 'text-white/30' : 'text-gray-400'
                                        }`}
                                >
                                    No properties owned yet.
                                </p>
                            )}

                            {ownedTileData.map((t) => (
                                <motion.div
                                    key={t.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'
                                        }`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div
                                        className="w-1 h-8 rounded-full"
                                        style={{ backgroundColor: t.colorBand }}
                                    />
                                    <span className="text-xl">{t.icon}</span>
                                    <div className="flex-1">
                                        <div
                                            className={`text-sm font-semibold ${isDark ? 'text-white/90' : 'text-gray-900'
                                                }`}
                                        >
                                            {t.name}
                                        </div>
                                        <div
                                            className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'
                                                }`}
                                        >
                                            Rent: {formatCurrency(t.rent ?? 0)}
                                        </div>
                                    </div>
                                    <div
                                        className={`text-sm font-mono ${isDark ? 'text-white/60' : 'text-gray-700'
                                            }`}
                                    >
                                        {formatCurrency(t.price ?? 0)}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
