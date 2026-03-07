// ============================================================
// GlassCard — Solvestor Mobile (Light Mode)
// ============================================================

import { StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SPACING } from '@/theme';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
    borderColor?: string;
    padding?: 'sm' | 'md' | 'lg';
    intensity?: number;
}

const PADDING_MAP = {
    sm: SPACING.md,
    md: SPACING.lg,
    lg: SPACING.xl,
};

export function GlassCard({
    children,
    style,
    borderColor = COLORS.border,
    padding = 'md',
    intensity = 60,
}: Props) {
    return (
        <View style={[styles.outer, { borderColor }, style]}>
            <BlurView intensity={intensity} tint="light" style={styles.blur}>
                <View style={[styles.inner, { padding: PADDING_MAP[padding] }]}>
                    {children}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    blur: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
    },
    inner: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});
