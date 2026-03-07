// ============================================================
// GradientBackground — Solvestor Mobile (Light Mode)
// ============================================================
// Full-screen light gradient with subtle purple/green orbs.
// ============================================================

import { StyleSheet, ImageBackground } from 'react-native';

interface Props {
    children: React.ReactNode;
    colors?: readonly [string, string, ...string[]]; // Keep interface intact for compatibility
}

export function GradientBackground({ children }: Props) {
    return (
        <ImageBackground
            source={require('../../../assets/mobile-background.webp')}
            style={styles.container}
            resizeMode="cover"
        >
            {children}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
