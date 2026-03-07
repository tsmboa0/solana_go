// ============================================================
// Badge — Solvestor Mobile
// ============================================================

import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING } from '@/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'purple';

interface Props {
    label: string;
    variant?: BadgeVariant;
    style?: ViewStyle;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: {
        bg: 'rgba(136, 136, 170, 0.12)',
        text: COLORS.textSecondary,
        border: 'rgba(136, 136, 170, 0.2)',
    },
    success: {
        bg: 'rgba(20, 241, 149, 0.12)',
        text: COLORS.solanaGreen,
        border: 'rgba(20, 241, 149, 0.25)',
    },
    warning: {
        bg: 'rgba(255, 184, 77, 0.12)',
        text: COLORS.warning,
        border: 'rgba(255, 184, 77, 0.25)',
    },
    error: {
        bg: 'rgba(255, 77, 106, 0.12)',
        text: COLORS.loss,
        border: 'rgba(255, 77, 106, 0.25)',
    },
    purple: {
        bg: 'rgba(153, 69, 255, 0.12)',
        text: COLORS.solanaPurple,
        border: 'rgba(153, 69, 255, 0.25)',
    },
};

export function Badge({ label, variant = 'default', style }: Props) {
    const colors = VARIANT_COLORS[variant];

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    label: {
        fontFamily: FONTS.semibold,
        fontSize: FONT_SIZES.xs,
        letterSpacing: 0.3,
    },
});
