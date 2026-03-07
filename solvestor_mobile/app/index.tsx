// ============================================================
// Landing Screen — Solvestor Mobile (Light Mode)
// ============================================================

import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Zap } from 'lucide-react-native';
import { useWallet } from '@/providers/WalletProvider';
import { GradientBackground } from '@/components/common/GradientBackground';
import { GradientButton } from '@/components/common/GradientButton';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING } from '@/theme';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
    const router = useRouter();
    const { connected, connect, disconnect, connecting, shortAddress } = useWallet();

    // Floating animation for the title
    const floatY = useSharedValue(0);

    useEffect(() => {
        floatY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, // infinite
            true,
        );
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const handleConnect = async () => {
        await connect();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleEnter = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/select');
    };

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Logo Entrance + Floating Animation */}
                <Animated.View
                    entering={FadeInUp.delay(400).duration(1000).springify()}
                    style={styles.titleWrap}
                >
                    <Animated.View style={floatingStyle}>
                        <Image
                            source={require('../assets/full-logo.webp')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </Animated.View>
                </Animated.View>


                {/* Spacer */}
                <View style={{ height: 80 }} />

                {/* Connect Wallet / Connected State */}
                <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.actionArea}>
                    {!connected ? (
                        <GradientButton
                            label={connecting ? 'Connecting...' : 'Connect Wallet'}
                            icon="🔗"
                            onPress={handleConnect}
                            size="md"
                            disabled={connecting}
                        />
                    ) : (
                        <View style={styles.connectedArea}>
                            {/* Wallet Badge */}
                            <View style={styles.walletBadge}>
                                <View style={styles.greenDot} />
                                <Text style={styles.walletAddress}>{shortAddress}</Text>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        disconnect();
                                    }}
                                    style={styles.disconnectBtn}
                                >
                                    <Text style={styles.disconnectText}>✕</Text>
                                </Pressable>
                            </View>

                            {/* Enter Button */}
                            <GradientButton
                                label="ENTER ▶"
                                onPress={handleEnter}
                                size="md"
                            />
                        </View>
                    )}
                </Animated.View>

                {/* Feature Pills */}
                <Animated.View entering={FadeIn.delay(900).duration(800)} style={styles.features}>
                    <FeaturePill emoji="⛓️" label="100% On-Chain" />
                    <FeaturePill emoji="🎲" label="VRF Dice" />
                    <FeaturePill emoji="⚡" label="Sub-Second" />
                </Animated.View>

                {/* Footer */}
                <Animated.View entering={FadeIn.delay(1100).duration(600)} style={styles.footer}>
                    <Text style={styles.footerText}>Built on </Text>
                    <Text style={[styles.footerText, { color: COLORS.solanaPurple, fontFamily: FONTS.bold }]}>
                        Solana
                    </Text>
                    <Text style={styles.footerText}> ⚡</Text>
                </Animated.View>
            </View>
        </GradientBackground>
    );
}

// ─── Feature Pill ────────────────────────────────────────────

function FeaturePill({ emoji, label }: { emoji: string; label: string }) {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillEmoji}>{emoji}</Text>
            <Text style={styles.pillLabel}>{label}</Text>
        </View>
    );
}

// ─── Styles (Light Mode) ─────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxxl,
    },

    // Title — 3D effect
    titleWrap: {
        marginBottom: SPACING.xxxl * 2.5,
    },
    // Logo Image
    logoImage: {
        width: width * 4.5,
        height: 420,
    },

    // Powered by
    poweredBy: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.15)',
    },
    poweredByText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: '#B45309',
    },

    // Action area
    actionArea: {
        width: '100%',
        alignItems: 'center',
    },
    connectedArea: {
        alignItems: 'center',
        gap: SPACING.lg,
    },

    // Wallet badge
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingLeft: 16,
        paddingRight: 8,
        borderRadius: RADIUS.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(153, 69, 255, 0.2)',
        // Shadow
        shadowColor: 'rgba(153, 69, 255, 0.15)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    greenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.solanaGreen,
        shadowColor: COLORS.solanaGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
    },
    walletAddress: {
        fontFamily: 'monospace',
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    disconnectBtn: {
        width: 28,
        height: 28,
        borderRadius: RADIUS.sm,
        backgroundColor: 'rgba(255, 77, 106, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 106, 0.15)',
    },
    disconnectText: {
        fontSize: 12,
        color: COLORS.loss,
    },

    // Feature pills
    features: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.xxxl,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
    },
    pillEmoji: {
        fontSize: 14,
    },
    pillLabel: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
});
