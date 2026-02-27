// ============================================================
// Bottom Sheet — Solvestor (SWS)
// ============================================================
// Slide-up panel showing tile info when user taps a tile.
// Mobile-first design with glassmorphism.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { TILES } from '@/config/boardTiles';
import { COLOR_GROUP_MAP } from '@/config/theme';
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
                        style={{
                            position: 'fixed', inset: 0, zIndex: 40,
                            backgroundColor: 'rgba(0,0,0,0.3)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeBottomSheet}
                    />

                    {/* Sheet */}
                    <motion.div
                        style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                            padding: '16px 24px 32px 24px',
                            maxHeight: '60vh', overflowY: 'auto',
                            backgroundColor: isDark ? 'rgba(16,16,32,0.85)' : 'rgba(255,255,255,0.9)',
                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                        }}
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
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px', height: '4px', borderRadius: '4px',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                            }} />
                        </div>

                        {/* Category badge + Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {tile.image_url ? (
                                    <img src={tile.image_url} alt={tile.project_name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', backgroundColor: '#6b7280', borderRadius: '4px' }} />
                                )}
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '18px', fontWeight: 'bold', margin: 0,
                                    color: isDark ? '#ffffff' : '#111827'
                                }}>
                                    {tile.project_name}
                                </h2>
                                <span style={{
                                    fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '9999px',
                                    textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', marginTop: '4px',
                                    backgroundColor: (tile.color_group ? COLOR_GROUP_MAP[tile.color_group] : '#888') + '22',
                                    color: tile.color_group ? COLOR_GROUP_MAP[tile.color_group] : '#888',
                                }}>
                                    {tile.type}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <p style={{
                            fontSize: '14px', marginBottom: '8px', marginTop: 0,
                            color: isDark ? 'rgba(255,255,255,0.6)' : '#4b5563'
                        }}>
                            {tile.description}
                        </p>
                        <p style={{
                            fontSize: '14px', marginBottom: '16px', marginTop: 0, fontWeight: 600,
                            color: isDark ? 'rgba(255,255,255,0.8)' : '#1f2937'
                        }}>
                            {tile.game_description}
                        </p>

                        {/* Stats grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px'
                        }}>
                            {tile.is_ownable && tile.tile_function.action_type === 'ownable' && (
                                <div style={{
                                    borderRadius: '12px', padding: '12px',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                                }}>
                                    <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.4)' : '#6b7280' }}>
                                        Price
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: isDark ? '#ffffff' : '#111827' }}>
                                        {formatCurrency(tile.tile_function.buy_price)}
                                    </div>
                                </div>
                            )}

                            {tile.is_ownable && tile.tile_function.action_type === 'ownable' && (
                                <div style={{
                                    borderRadius: '12px', padding: '12px',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                                }}>
                                    <div style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.4)' : '#6b7280' }}>
                                        Rent
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: isDark ? '#34d399' : '#059669' }}>
                                        {formatCurrency(tile.tile_function.rent_value)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner info */}
                        {ownerPlayer && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', padding: '12px',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: ownerPlayer.color }} />
                                <span style={{ fontSize: '14px', color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' }}>
                                    Owned by <strong style={{ fontWeight: 'bold' }}>{ownerPlayer.name}</strong>
                                </span>
                            </div>
                        )}

                        {!owner && tile.is_ownable && tile.tile_function.action_type === 'ownable' && (
                            <div style={{
                                textAlign: 'center', fontSize: '14px', padding: '8px 0',
                                color: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'
                            }}>
                                Available for purchase
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
