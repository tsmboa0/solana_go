// ============================================================
// LoadingSpinner — Solvestor Mobile
// ============================================================

import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface Props {
    /** Optional message below spinner */
    message?: string;
    /** Spinner size */
    size?: 'small' | 'large';
    /** Custom color */
    color?: string;
}

export function LoadingSpinner({
    message,
    size = 'large',
    color = COLORS.solanaPurple,
}: Props) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    message: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
});
