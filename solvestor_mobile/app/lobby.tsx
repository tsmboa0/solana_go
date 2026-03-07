// ============================================================
// Lobby Screen — Solvestor Mobile (Light Mode)
// ============================================================
// Shows available game rooms. Create or join games.
// Uses mock data in Expo Go; swap to blockchain store later.
// ============================================================

import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable,
    TextInput, RefreshControl, Modal, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Plus, Search, X, Users, Clock, Coins } from 'lucide-react-native';
import { useWallet } from '@/providers/WalletProvider';
import { GradientBackground } from '@/components/common/GradientBackground';
import { GradientButton } from '@/components/common/GradientButton';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING } from '@/theme';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────

interface GameRoom {
    id: string;
    roomCode: string;
    creator: string;
    creatorDisplay: string;
    playerCount: number;
    maxPlayers: number;
    stakeAmount: number;
    isStarted: boolean;
    isEnded: boolean;
    createdAt: number;
}

// ─── Mock Data (for Expo Go testing) ─────────────────────────

const MOCK_GAMES: GameRoom[] = [
    {
        id: '1',
        roomCode: 'ALPHA',
        creator: '7xKp...3Fv9',
        creatorDisplay: '7xKp...3Fv9',
        playerCount: 1,
        maxPlayers: 2,
        stakeAmount: 0.2,
        isStarted: false,
        isEnded: false,
        createdAt: Math.floor(Date.now() / 1000) - 120,
    },
    {
        id: '2',
        roomCode: 'BETA',
        creator: '3mNq...8Rk2',
        creatorDisplay: '3mNq...8Rk2',
        playerCount: 2,
        maxPlayers: 2,
        stakeAmount: 0.2,
        isStarted: true,
        isEnded: false,
        createdAt: Math.floor(Date.now() / 1000) - 600,
    },
    {
        id: '3',
        roomCode: 'GAMMA',
        creator: '9pLx...2Yk4',
        creatorDisplay: '9pLx...2Yk4',
        playerCount: 1,
        maxPlayers: 2,
        stakeAmount: 0.2,
        isStarted: false,
        isEnded: false,
        createdAt: Math.floor(Date.now() / 1000) - 45,
    },
];

// ─── Helpers ─────────────────────────────────────────────────

function getStatus(game: GameRoom) {
    if (game.isStarted) return { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' };
    if (game.playerCount >= game.maxPlayers) return { label: 'Full', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };
    return { label: 'Waiting', color: '#14F195', bg: 'rgba(20,241,149,0.08)', border: 'rgba(20,241,149,0.2)' };
}

function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Screen ──────────────────────────────────────────────────

export default function LobbyScreen() {
    const router = useRouter();
    const { shortAddress } = useWallet();
    const [games] = useState<GameRoom[]>(MOCK_GAMES);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const filtered = search.trim()
        ? games.filter((g) => g.roomCode.toLowerCase().includes(search.toLowerCase()))
        : games;

    const joinable = games.filter((g) => !g.isStarted && !g.isEnded && g.playerCount < g.maxPlayers);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // TODO: Fetch games from blockchain
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handleJoin = (game: GameRoom) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Join Game', `Join room ${game.roomCode}?\nStake: ${game.stakeAmount} SOL`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Join', onPress: () => {
                    // TODO: On-chain join
                    router.push('/game/beginner' as any);
                }
            },
        ]);
    };

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.solanaPurple} />}
            >
                {/* Top bar */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.topBar}>
                    <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                        style={styles.backBtn}
                    >
                        <ArrowLeft size={18} color={COLORS.textSecondary} />
                    </Pressable>
                    <View style={styles.walletPill}>
                        <View style={styles.greenDot} />
                        <Text style={styles.walletText}>{shortAddress}</Text>
                    </View>
                </Animated.View>

                {/* Header + Create btn */}
                <Animated.View entering={FadeInDown.duration(600)} style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Game Lobby</Text>
                        <Text style={styles.headerSub}>Join a game or create your own</Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowCreateModal(true);
                        }}
                    >
                        <LinearGradient
                            colors={['#9945FF', '#14F195']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.createBtn}
                        >
                            <Plus size={14} color="#fff" strokeWidth={3} />
                            <Text style={styles.createBtnText}>Create</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>

                {/* Search */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.searchWrap}>
                    <Search size={16} color={COLORS.textMuted} style={styles.searchIcon} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search by room code..."
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.searchInput}
                    />
                    {search !== '' && (
                        <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                            <X size={12} color={COLORS.textMuted} />
                        </Pressable>
                    )}
                </Animated.View>

                {/* Stats bar */}
                <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.statsBar}>
                    <Text style={styles.statsText}>
                        {joinable.length} game{joinable.length !== 1 ? 's' : ''} available
                    </Text>
                    {search.trim() !== '' && (
                        <Text style={styles.statsText}>
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </Text>
                    )}
                </Animated.View>

                {/* Room Cards */}
                {filtered.length === 0 ? (
                    <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>{search.trim() ? '🔎' : '🎮'}</Text>
                        <Text style={styles.emptyTitle}>
                            {search.trim() ? 'No matching rooms' : 'No games available'}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            {search.trim()
                                ? 'Try a different room code'
                                : 'Be the first to create a game!'}
                        </Text>
                    </Animated.View>
                ) : (
                    filtered.map((game, i) => {
                        const status = getStatus(game);
                        const canJoin = !game.isStarted && !game.isEnded && game.playerCount < game.maxPlayers;

                        return (
                            <Animated.View
                                key={game.id}
                                entering={FadeInDown.delay(200 + i * 80).duration(500).springify()}
                            >
                                <View style={styles.card}>
                                    {/* Header row: Room code + Status */}
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.roomCode}>{game.roomCode}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                                            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                                            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
                                        </View>
                                    </View>

                                    {/* Details */}
                                    <View style={styles.detailsGrid}>
                                        <DetailRow icon={<Users size={13} color={COLORS.textMuted} />} label="Players" value={`${game.playerCount}/${game.maxPlayers}`} />
                                        <DetailRow icon={<Coins size={13} color={COLORS.textMuted} />} label="Stake" value={`◈ ${game.stakeAmount} SOL`} valueColor="#7B3FE4" />
                                        <DetailRow icon={<Clock size={13} color={COLORS.textMuted} />} label="Created" value={timeAgo(game.createdAt)} />
                                    </View>

                                    {/* Creator */}
                                    <View style={styles.creatorRow}>
                                        <Text style={styles.creatorLabel}>Creator</Text>
                                        <Text style={styles.creatorValue}>{game.creatorDisplay}</Text>
                                    </View>

                                    {/* Join Button */}
                                    {canJoin && (
                                        <Pressable onPress={() => handleJoin(game)}>
                                            <LinearGradient
                                                colors={['#9945FF', '#14F195']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.joinBtn}
                                            >
                                                <Text style={styles.joinBtnText}>Join Game →</Text>
                                            </LinearGradient>
                                        </Pressable>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Create Room Modal */}
            <CreateGameModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </GradientBackground>
    );
}

// ─── Detail Row ──────────────────────────────────────────────

function DetailRow({
    icon, label, value, valueColor,
}: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
    return (
        <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
                {icon}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
                {value}
            </Text>
        </View>
    );
}

// ─── Create Game Modal ───────────────────────────────────────

function CreateGameModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const [maxPlayers, setMaxPlayers] = useState(2);
    const stakeAmount = 0.2;

    const handleCreate = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // TODO: On-chain create game
        Alert.alert('Game Created', 'Your game room has been created! (mock)', [
            { text: 'OK', onPress: onClose },
        ]);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Handle */}
                    <View style={styles.modalHandle} />

                    <Text style={styles.modalTitle}>Create Game</Text>
                    <Text style={styles.modalSub}>Configure your game room</Text>

                    {/* Max Players */}
                    <View style={styles.modalField}>
                        <Text style={styles.fieldLabel}>Max Players</Text>
                        <View style={styles.playerSelector}>
                            {[2, 3, 4].map((n) => (
                                <Pressable
                                    key={n}
                                    onPress={() => { Haptics.selectionAsync(); setMaxPlayers(n); }}
                                    style={[styles.playerOption, maxPlayers === n && styles.playerOptionActive]}
                                >
                                    <Text style={[styles.playerOptionText, maxPlayers === n && styles.playerOptionTextActive]}>
                                        {n}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Stake */}
                    <View style={styles.modalField}>
                        <Text style={styles.fieldLabel}>Stake Amount</Text>
                        <View style={styles.stakeDisplay}>
                            <Text style={styles.stakeValue}>◈ {stakeAmount} SOL</Text>
                            <Text style={styles.stakeNote}>per player</Text>
                        </View>
                    </View>

                    {/* Summary */}
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Pot</Text>
                            <Text style={styles.summaryValue}>◈ {(stakeAmount * maxPlayers).toFixed(1)} SOL</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Winner Gets</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.solanaGreen }]}>
                                ◈ {(stakeAmount * maxPlayers * 0.95).toFixed(2)} SOL
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.modalActions}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <GradientButton label="Create Game" onPress={handleCreate} size="md" />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: SPACING.xl, paddingTop: 60 },

    // Top bar
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
    backBtn: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    walletPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: COLORS.border },
    greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.solanaGreen },
    walletText: { fontFamily: 'monospace', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
    headerTitle: { fontFamily: FONTS.black, fontSize: FONT_SIZES.xxl, color: COLORS.textPrimary },
    headerSub: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: RADIUS.lg },
    createBtnText: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm, color: '#fff', letterSpacing: 0.3 },

    // Search
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, paddingHorizontal: 14 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, paddingVertical: 12 },
    clearBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },

    // Stats
    statsBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
    statsText: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs, color: COLORS.textMuted },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginBottom: 4 },
    emptyDesc: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.textMuted },

    // Card
    card: {
        padding: 18,
        borderRadius: RADIUS.xl,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    roomCode: { fontFamily: FONTS.extrabold, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, letterSpacing: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 10, borderRadius: RADIUS.full, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },

    // Details
    detailsGrid: { gap: 8, marginBottom: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
    detailValue: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

    // Creator
    creatorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
    creatorLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
    creatorValue: { fontFamily: 'monospace', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

    // Join button
    joinBtn: { marginTop: 14, paddingVertical: 10, borderRadius: RADIUS.lg, alignItems: 'center' },
    joinBtnText: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm, color: '#fff', letterSpacing: 0.3 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: SPACING.xl,
        paddingBottom: 40,
    },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontFamily: FONTS.extrabold, fontSize: FONT_SIZES.xl, color: COLORS.textPrimary, marginBottom: 4 },
    modalSub: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginBottom: SPACING.xxl },

    // Modal fields
    modalField: { marginBottom: SPACING.xl },
    fieldLabel: { fontFamily: FONTS.semibold, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: 10 },
    playerSelector: { flexDirection: 'row', gap: 10 },
    playerOption: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center' },
    playerOptionActive: { backgroundColor: 'rgba(153,69,255,0.08)', borderColor: 'rgba(153,69,255,0.3)' },
    playerOptionText: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.md, color: COLORS.textMuted },
    playerOptionTextActive: { color: COLORS.solanaPurple },

    stakeDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: 'rgba(0,0,0,0.03)' },
    stakeValue: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.lg, color: '#7B3FE4' },
    stakeNote: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.xs, color: COLORS.textMuted },

    // Summary
    summaryBox: { padding: 16, borderRadius: RADIUS.lg, backgroundColor: 'rgba(153,69,255,0.04)', borderWidth: 1, borderColor: 'rgba(153,69,255,0.1)', marginBottom: SPACING.xxl, gap: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontFamily: FONTS.medium, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
    summaryValue: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.sm, color: '#7B3FE4' },

    // Modal actions
    modalActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.xl, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center' },
    cancelText: { fontFamily: FONTS.semibold, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
});
