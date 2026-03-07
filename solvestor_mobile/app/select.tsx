// ============================================================
// Mode Select Screen — Solvestor Mobile (Light Mode)
// ============================================================

import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useWallet } from '@/providers/WalletProvider';
import { GradientBackground } from '@/components/common/GradientBackground';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING } from '@/theme';

const { width } = Dimensions.get('window');

// ─── Mode Data ───────────────────────────────────────────────

interface ModeCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    stake: string | null;
    enabled: boolean;
    route: string;
    gradientColors: readonly [string, string];
    glowColor: string;
}

const MODES: ModeCard[] = [
    {
        id: 'explore',
        title: 'Explore',
        description: 'Play solo against CPU. No blockchain, no stakes — learn the game risk-free.',
        icon: '🎮',
        stake: null,
        enabled: true,
        route: '/game/explore',
        gradientColors: ['#14F195', '#0EA5E9'],
        glowColor: 'rgba(20, 241, 149, 0.15)',
    },
    {
        id: 'beginner',
        title: 'Beginner',
        description: 'Real multiplayer on Solana. Compete with other players in staked matches.',
        icon: '🏆',
        stake: '0.2 SOL',
        enabled: true,
        route: '/lobby',
        gradientColors: ['#9945FF', '#7B3FE4'],
        glowColor: 'rgba(153, 69, 255, 0.15)',
    },
    {
        id: 'pro',
        title: 'Pro',
        description: 'Higher stakes, bigger rewards. For experienced capital allocators.',
        icon: '💎',
        stake: '0.5 SOL',
        enabled: false,
        route: '',
        gradientColors: ['#F59E0B', '#EF4444'],
        glowColor: 'rgba(245, 158, 11, 0.15)',
    },
    {
        id: 'advanced',
        title: 'Advanced',
        description: 'The ultimate arena. Maximum stakes, maximum glory.',
        icon: '👑',
        stake: '1.0 SOL',
        enabled: false,
        route: '',
        gradientColors: ['#EF4444', '#BE185D'],
        glowColor: 'rgba(239, 68, 68, 0.15)',
    },
];

// ─── Screen Component ────────────────────────────────────────

export default function ModeSelectScreen() {
    const router = useRouter();
    const { shortAddress } = useWallet();

    const handleSelect = (card: ModeCard) => {
        if (!card.enabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(card.route as any);
    };

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Back button + wallet */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.topBar}>
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backBtn}
                    >
                        <ArrowLeft size={18} color={COLORS.textSecondary} />
                    </Pressable>
                    <View style={styles.walletPill}>
                        <View style={styles.greenDot} />
                        <Text style={styles.walletText}>{shortAddress}</Text>
                    </View>
                </Animated.View>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
                    <Text style={styles.headerTitle}>Choose Your Arena</Text>
                    <Text style={styles.headerSub}>Select a game mode to get started</Text>
                </Animated.View>

                {/* Cards */}
                {MODES.map((card, i) => (
                    <Animated.View
                        key={card.id}
                        entering={FadeInDown.delay(200 + i * 100).duration(500).springify()}
                    >
                        <Pressable
                            onPress={() => handleSelect(card)}
                            disabled={!card.enabled}
                            style={({ pressed }) => [
                                styles.card,
                                !card.enabled && styles.cardDisabled,
                                pressed && card.enabled && styles.cardPressed,
                            ]}
                        >
                            {/* Glow orb */}
                            <View style={[styles.glowOrb, { backgroundColor: card.glowColor }]} />

                            {/* Coming Soon badge */}
                            {!card.enabled && (
                                <View style={styles.comingSoon}>
                                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                                </View>
                            )}

                            {/* Icon */}
                            <LinearGradient
                                colors={card.gradientColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.iconBox}
                            >
                                <Text style={styles.iconEmoji}>{card.icon}</Text>
                            </LinearGradient>

                            {/* Title */}
                            <Text style={styles.cardTitle}>{card.title}</Text>

                            {/* Stake badge */}
                            {card.stake && (
                                <View style={styles.stakeBadge}>
                                    <Text style={styles.stakeText}>◈ {card.stake}</Text>
                                </View>
                            )}

                            {/* Description */}
                            <Text style={styles.cardDesc}>{card.description}</Text>

                            {/* Arrow */}
                            {card.enabled && (
                                <View style={styles.playRow}>
                                    <Text style={styles.playText}>Play Now</Text>
                                    <ChevronRight size={16} color={COLORS.solanaPurple} />
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>
                ))}

                <View style={{ height: 40 }} />
            </ScrollView>
        </GradientBackground>
    );
}

// ─── Styles (Light Mode) ─────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: {
        paddingHorizontal: SPACING.xl,
        paddingTop: 60,
    },

    // Top bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    greenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.solanaGreen,
    },
    walletText: {
        fontFamily: 'monospace',
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // Header
    header: {
        marginBottom: SPACING.xxl,
    },
    headerTitle: {
        fontFamily: FONTS.black,
        fontSize: FONT_SIZES.xxl,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    headerSub: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
    },

    // Card — glassmorphism on light
    card: {
        position: 'relative',
        padding: 20,
        borderRadius: RADIUS.xl,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        marginBottom: SPACING.lg,
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    cardDisabled: {
        opacity: 0.5,
    },
    cardPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        transform: [{ scale: 0.98 }],
    },
    glowOrb: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
    },

    // Coming Soon
    comingSoon: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.06)',
    },
    comingSoonText: {
        fontFamily: FONTS.bold,
        fontSize: 9,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },

    // Icon
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconEmoji: {
        fontSize: 22,
    },

    // Card content
    cardTitle: {
        fontFamily: FONTS.extrabold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    stakeBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 2,
        paddingHorizontal: 10,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(153, 69, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(153, 69, 255, 0.15)',
        marginBottom: 8,
    },
    stakeText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.xs,
        color: '#7B3FE4',
        letterSpacing: 0.3,
    },
    cardDesc: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 4,
    },
    playRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
    },
    playText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.solanaPurple,
    },
});
