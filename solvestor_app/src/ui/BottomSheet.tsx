// ============================================================
// Bottom Sheet — Solvestor (SWS)
// ============================================================
// Slide-up panel showing tile info when user taps a tile.
// Mobile-first design with glassmorphism.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { TILES } from '@/config/tiles';
import { formatCurrency } from '@/utils/formatters';

export function BottomSheet() {
    const isOpen = useUIStore((s) => s.isBottomSheetOpen);
    const tileId = useUIStore((s) => s.bottomSheetTileId);
    const closeBottomSheet = useUIStore((s) => s.closeBottomSheet);
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const players = useGameStore((s) => s.players);
    const theme = useUIStore((s) => s.theme);

    const isDark = theme === 'dark';
    const tile = tileId !== null ? TILES[tileId] : null;
    const owner = tileId !== null ? ownedTiles[tileId] : null;
    const ownerPlayer = owner ? players.find((p) => p.id === owner) : null;

    return (
        <AnimatePresence>
            {isOpen && tile && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeBottomSheet}
                    />

                    {/* Sheet */}
                    <motion.div
                        className={`
              fixed bottom-0 left-0 right-0 z-50
              rounded-t-3xl px-6 pt-4 pb-8
              max-h-[60vh] overflow-y-auto
              ${isDark
                                ? 'bg-[rgba(16,16,32,0.85)] border-t border-white/[0.08]'
                                : 'bg-[rgba(255,255,255,0.9)] border-t border-black/[0.08]'
                            }
              backdrop-blur-2xl
            `}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) closeBottomSheet();
                        }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center mb-4">
                            <div
                                className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-black/20'
                                    }`}
                            />
                        </div>

                        {/* Category badge + Icon */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{tile.icon}</span>
                            <div>
                                <h2
                                    className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                >
                                    {tile.name}
                                </h2>
                                <span
                                    className="text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
                                    style={{
                                        backgroundColor: tile.colorBand + '22',
                                        color: tile.colorBand,
                                    }}
                                >
                                    {tile.category}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <p
                            className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'
                                }`}
                        >
                            {tile.description}
                        </p>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {tile.price !== null && (
                                <div
                                    className={`rounded-xl p-3 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                        }`}
                                >
                                    <div
                                        className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'
                                            }`}
                                    >
                                        Price
                                    </div>
                                    <div
                                        className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'
                                            }`}
                                    >
                                        {formatCurrency(tile.price)}
                                    </div>
                                </div>
                            )}

                            {tile.rent !== null && (
                                <div
                                    className={`rounded-xl p-3 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                        }`}
                                >
                                    <div
                                        className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'
                                            }`}
                                    >
                                        Rent
                                    </div>
                                    <div
                                        className={`text-base font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'
                                            }`}
                                    >
                                        {formatCurrency(tile.rent)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner info */}
                        {ownerPlayer && (
                            <div
                                className={`flex items-center gap-2 rounded-xl p-3 ${isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'
                                    }`}
                            >
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: ownerPlayer.color }}
                                />
                                <span
                                    className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-700'
                                        }`}
                                >
                                    Owned by <strong>{ownerPlayer.name}</strong>
                                </span>
                            </div>
                        )}

                        {!owner && tile.price !== null && (
                            <div
                                className={`text-center text-sm py-2 ${isDark ? 'text-white/40' : 'text-gray-400'
                                    }`}
                            >
                                Available for purchase
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
