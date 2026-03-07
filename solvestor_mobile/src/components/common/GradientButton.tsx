// ============================================================
// GradientButton — Solvestor Mobile
// ============================================================
// Primary CTA button with Solana gradient, 3D depth shadow,
// active press scale, and inner highlight shimmer.
// ============================================================

import { StyleSheet, Text, Pressable, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, FONT_SIZES, RADIUS } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
    label: string;
    onPress: () => void;
    /** Optional icon emoji before label */
    icon?: string;
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'outline';
    /** Full width */
    fullWidth?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Custom style */
    style?: ViewStyle;
    /** Size preset */
    size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({
    label,
    onPress,
    icon,
    variant = 'primary',
    fullWidth = false,
    disabled = false,
    style,
    size = 'md',
}: Props) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(4, { damping: 15, stiffness: 300 }); // Push down by 4px on Y axis
    };

    const handlePressOut = () => {
        scale.value = withSpring(0, { damping: 15, stiffness: 300 }); // Return to 0
    };

    const handlePress = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    const sizeStyles = SIZE_MAP[size];

    if (variant === 'outline') {
        return (
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[
                    animatedStyle,
                    styles.outlineButton,
                    sizeStyles,
                    fullWidth && styles.fullWidth,
                    disabled && styles.disabled,
                    style,
                ]}
            >
                <Text style={[styles.outlineLabel, { fontSize: sizeStyles.fontSize }]}>
                    {icon ? `${icon} ${label}` : label}
                </Text>
            </AnimatedPressable>
        );
    }

    if (variant === 'secondary') {
        return (
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[
                    animatedStyle,
                    styles.secondaryButton,
                    sizeStyles,
                    fullWidth && styles.fullWidth,
                    disabled && styles.disabled,
                    style,
                ]}
            >
                <Text style={[styles.secondaryLabel, { fontSize: sizeStyles.fontSize }]}>
                    {icon ? `${icon} ${label}` : label}
                </Text>
            </AnimatedPressable>
        );
    }

    // ─── PRIMARY 3D GRADIENT BUTTON ───
    return (
        <View style={[
            styles.wrapper3D,
            fullWidth && styles.fullWidth,
            disabled && styles.disabled,
            style
        ]}>
            {/* The rigid 3D bottom "base" */}
            <View style={[styles.base3D, { borderRadius: sizeStyles.borderRadius }]} />

            {/* The clickable top surface that pushes down into the base */}
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[{ transform: [{ translateY: scale.value }] }]}
            >
                <LinearGradient
                    colors={['#A855F7', '#8135DF', '#10B981']} // slightly brighter tops
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradient, sizeStyles]}
                >
                    {/* Inner highlight ring (glass edge) */}
                    <View style={styles.innerHighlight} />

                    <Text style={[styles.label, { fontSize: sizeStyles.fontSize }]}>
                        {icon ? `${icon} ${label}` : label}
                    </Text>
                </LinearGradient>
            </AnimatedPressable>
        </View>
    );
}

const SIZE_MAP = {
    sm: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: RADIUS.lg, fontSize: FONT_SIZES.sm },
    md: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: RADIUS.xl, fontSize: FONT_SIZES.md },
    lg: { paddingVertical: 18, paddingHorizontal: 44, borderRadius: RADIUS.xxl, fontSize: FONT_SIZES.lg },
};

const styles = StyleSheet.create({
    // ─── 3D Button Components ───
    wrapper3D: {
        position: 'relative',
        marginBottom: 6, // account for the base height
    },
    base3D: {
        ...StyleSheet.absoluteFillObject,
        top: 6, // shift base down to create 3D depth
        backgroundColor: '#581C87', // dark purple shadow base
    },
    innerHighlight: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 999, // match parent via overflow
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.1)', // thinner glass reflection at bottom
        borderRightColor: 'rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none',
    },
    gradient: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // ensure innerHighlight respects border radius
    },
    label: {
        fontFamily: FONTS.extrabold,
        color: '#fff',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1.5 },
        textShadowRadius: 3,
    },
    outlineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.solanaPurple,
        backgroundColor: 'rgba(153, 69, 255, 0.08)',
    },
    outlineLabel: {
        fontFamily: FONTS.bold,
        color: COLORS.solanaPurple,
        letterSpacing: 0.3,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryLabel: {
        fontFamily: FONTS.bold,
        color: COLORS.textPrimary,
        letterSpacing: 0.3,
    },
    fullWidth: {
        alignSelf: 'stretch',
    },
    disabled: {
        opacity: 0.5,
    },
});
