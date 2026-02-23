// ============================================================
// Tile Action Popup — Solvestor (SWS)
// ============================================================
// Contextual popup after landing on a tile.
// Buy, pay rent, draw event, pay tax, or corner action.
// Glassmorphism with solid action buttons.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore, selectCurrentPlayer } from '@/stores/useGameStore';
import { useTileActions } from '@/hooks/useTileActions';
import { TILES } from '@/config/tiles';
import { TAX_AMOUNT } from '@/config/game';
import { formatCurrency } from '@/utils/formatters';

/** Mock event cards */
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

    // Random event card for event tiles
    const eventCard =
        EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];

    if (!activePopup || !tile) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/40" onClick={skipAction} />

                {/* Card */}
                <motion.div
                    className={`
            relative w-full max-w-sm rounded-3xl overflow-hidden
            ${isDark
                            ? 'bg-[rgba(16,16,32,0.9)] border border-white/[0.1]'
                            : 'bg-[rgba(255,255,255,0.95)] border border-black/[0.08]'
                        }
            backdrop-blur-2xl
          `}
                    initial={{ scale: 0.85, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.85, y: 30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                    {/* Color banner */}
                    <div
                        className="h-2"
                        style={{ backgroundColor: tile.colorBand }}
                    />

                    <div className="p-5">
                        {/* Tile header */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{tile.icon}</span>
                            <div>
                                <h3
                                    className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {tile.name}
                                </h3>
                                <span
                                    className="text-xs font-medium uppercase tracking-wider"
                                    style={{ color: tile.colorBand }}
                                >
                                    {tile.category}
                                </span>
                            </div>
                        </div>

                        {/* Content based on popup type */}
                        {activePopup === 'buy' && tile.price !== null && (
                            <div>
                                <p
                                    className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'
                                        }`}
                                >
                                    This property is available. Invest now?
                                </p>
                                <div
                                    className={`rounded-xl p-3 mb-4 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span
                                            className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'
                                                }`}
                                        >
                                            Purchase Price
                                        </span>
                                        <span
                                            className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'
                                                }`}
                                        >
                                            {formatCurrency(tile.price)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span
                                            className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'
                                                }`}
                                        >
                                            Your Balance
                                        </span>
                                        <span
                                            className={`text-sm font-mono ${currentPlayer.balance >= tile.price
                                                    ? 'text-emerald-400'
                                                    : 'text-red-400'
                                                }`}
                                        >
                                            {formatCurrency(currentPlayer.balance)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={skipAction}
                                        className={`
                      flex-1 py-3 rounded-xl font-semibold text-sm
                      ${isDark
                                                ? 'bg-white/[0.08] text-white/70 active:bg-white/[0.12]'
                                                : 'bg-black/[0.05] text-gray-700 active:bg-black/[0.08]'
                                            }
                    `}
                                    >
                                        Pass
                                    </button>
                                    <button
                                        onClick={() => executeBuy(popupTileId!)}
                                        disabled={currentPlayer.balance < tile.price}
                                        className={`
                      flex-1 py-3 rounded-xl font-semibold text-sm text-white
                      ${currentPlayer.balance >= tile.price
                                                ? 'bg-gradient-to-r from-purple-500 to-purple-700 active:from-purple-600'
                                                : 'bg-gray-500/50 cursor-not-allowed'
                                            }
                    `}
                                    >
                                        Buy
                                    </button>
                                </div>
                            </div>
                        )}

                        {activePopup === 'rent' && tile.rent !== null && ownerPlayer && (
                            <div>
                                <p
                                    className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'
                                        }`}
                                >
                                    This property is owned by{' '}
                                    <strong style={{ color: ownerPlayer.color }}>
                                        {ownerPlayer.name}
                                    </strong>
                                    . You owe rent.
                                </p>
                                <div
                                    className={`rounded-xl p-3 mb-4 text-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'
                                        }`}
                                >
                                    <span className="text-2xl font-bold text-red-400">
                                        -{formatCurrency(tile.rent)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => executeRent(popupTileId!)}
                                    className="w-full py-3 rounded-xl font-semibold text-sm bg-red-500/80 text-white active:bg-red-600"
                                >
                                    Pay Rent
                                </button>
                            </div>
                        )}

                        {activePopup === 'event' && (
                            <div>
                                <div
                                    className={`rounded-xl p-4 mb-4 text-center ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'
                                        }`}
                                >
                                    <p
                                        className={`text-sm mb-2 ${isDark ? 'text-white/80' : 'text-gray-800'
                                            }`}
                                    >
                                        {eventCard.text}
                                    </p>
                                    <span
                                        className={`text-xl font-bold ${eventCard.effect > 0
                                                ? 'text-emerald-400'
                                                : 'text-red-400'
                                            }`}
                                    >
                                        {eventCard.effect > 0 ? '+' : ''}
                                        {formatCurrency(eventCard.effect)}
                                    </span>
                                </div>
                                <button
                                    onClick={skipAction}
                                    className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white active:from-orange-600"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {activePopup === 'tax' && (
                            <div>
                                <div
                                    className={`rounded-xl p-4 mb-4 text-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'
                                        }`}
                                >
                                    <p
                                        className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'
                                            }`}
                                    >
                                        {tile.description}
                                    </p>
                                    <span className="text-2xl font-bold text-red-400">
                                        -{formatCurrency(TAX_AMOUNT)}
                                    </span>
                                </div>
                                <button
                                    onClick={skipAction}
                                    className="w-full py-3 rounded-xl font-semibold text-sm bg-red-500/80 text-white active:bg-red-600"
                                >
                                    Pay Tax
                                </button>
                            </div>
                        )}

                        {activePopup === 'corner' && (
                            <div>
                                <p
                                    className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'
                                        }`}
                                >
                                    {tile.description}
                                </p>
                                <button
                                    onClick={skipAction}
                                    className={`
                    w-full py-3 rounded-xl font-semibold text-sm text-white
                    bg-gradient-to-r from-purple-500 to-purple-700
                  `}
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
