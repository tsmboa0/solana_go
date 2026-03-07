// ============================================================
// Game Screen — Solvestor Mobile (Full-Screen Immersive)
// ============================================================
// Full-screen WebView with native bottom action bar.
// Leave + Recenter buttons are native; all other controls
// live inside the WebView.
// Intercepts navigation to prevent leaving to web pages.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ActivityIndicator,
    Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Crosshair } from 'lucide-react-native';
import { useWallet } from '@/providers/WalletProvider';
import {
    postToWeb,
    parseWebMessage,
    BRIDGE_INJECT_JS,
} from '@/utils/bridge';
import { APP_CONFIG } from '@/utils/config';
import { haptic } from '@/utils/haptics';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING } from '@/theme';

// ─── Screen ──────────────────────────────────────────────────

export default function GameScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ gamePDA?: string; gameId?: string; mode?: string }>();
    const { publicKey } = useWallet();
    const webViewRef = useRef<WebView>(null);
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [gameReady, setGameReady] = useState(false);

    // Build the URL with params
    const mode = params.mode ?? 'explore';
    const gameUrl = params.gamePDA
        ? `${APP_CONFIG.webAppUrl}/game/${mode}?gamePDA=${params.gamePDA}&gameId=${params.gameId}&mobile=true`
        : `${APP_CONFIG.webAppUrl}/game/${mode}?mobile=true`;

    const isBeginner = mode === 'beginner';

    // The allowed URL origin — block any navigation outside it
    const allowedOrigin = new URL(APP_CONFIG.webAppUrl).origin;

    // Send wallet context once WebView loads
    const sendWalletContext = useCallback(() => {
        if (publicKey && webViewRef.current) {
            postToWeb(webViewRef, {
                type: 'WALLET_CONTEXT',
                payload: {
                    publicKey: publicKey.toBase58(),
                    connected: true,
                },
            });
        }
    }, [publicKey]);

    // Send game params
    const sendGameParams = useCallback(() => {
        if (webViewRef.current) {
            postToWeb(webViewRef, {
                type: 'GAME_PARAMS',
                payload: {
                    gamePDA: params.gamePDA ?? '',
                    gameId: params.gameId ?? '',
                    mode,
                },
            });
        }
    }, [params.gamePDA, params.gameId, mode]);

    // Handle messages from web
    const handleWebMessage = useCallback((event: WebViewMessageEvent) => {
        const msg = parseWebMessage(event);
        if (!msg) return;

        switch (msg.type) {
            case 'GAME_READY':
                setGameReady(true);
                sendWalletContext();
                sendGameParams();
                break;

            case 'HAPTIC': {
                const hapticMap: Record<string, () => void> = {
                    light: haptic.tap,
                    medium: haptic.press,
                    heavy: haptic.heavy,
                    success: haptic.success,
                    error: haptic.error,
                };
                hapticMap[msg.payload.style]?.();
                break;
            }

            case 'NAVIGATE_BACK':
                haptic.tap();
                router.back();
                break;

            case 'GAME_ENDED':
                haptic.success();
                Alert.alert(
                    'Game Over! 🏆',
                    `Winner: ${msg.payload.winner.slice(0, 8)}...`,
                    [{ text: 'Back to Lobby', onPress: () => router.back() }],
                );
                break;

            case 'LOG':
                console.log('[WebView]', msg.payload.message);
                break;
        }
    }, [sendWalletContext, sendGameParams, router]);

    // Intercept navigation — block leaving to web's select/lobby pages
    const handleNavigationRequest = useCallback((request: { url: string }): boolean => {
        const url = request.url;

        // Always allow the initial game URL and assets
        if (url.includes('/game/')) return true;

        // Allow same-origin asset/API requests
        if (url.startsWith(allowedOrigin) && !url.includes('/select') && !url.includes('/lobby') && !url.includes('/#')) {
            return true;
        }

        // Block navigation to web's select/lobby/landing — redirect to native
        if (url.includes('/select') || url.includes('/lobby') || url === allowedOrigin + '/') {
            console.log('[GameScreen] Blocked web navigation to:', url);
            haptic.tap();
            router.back();
            return false;
        }

        return true;
    }, [allowedOrigin, router]);

    // ─── Native actions ─────────────────────────────────────────

    // Leave game — triggers leave_room for beginner mode via web bridge
    const handleLeave = () => {
        haptic.tap();
        const title = isBeginner ? 'Leave Game?' : 'Leave Game?';
        const message = isBeginner
            ? 'Leaving will forfeit your stake and remove you from the game. This cannot be undone.'
            : 'Your explore mode progress will be reset.';

        Alert.alert(title, message, [
            { text: 'Stay', style: 'cancel' },
            {
                text: isBeginner ? 'Leave & Forfeit' : 'Leave',
                style: 'destructive',
                onPress: () => {
                    haptic.press();
                    if (isBeginner) {
                        // Tell the web to execute leave_room on-chain, then we navigate back
                        // The web's LeaveRoomButton logic calls leaveRoom + leaveGame + requestNavigateBack
                        // But since we hid it, we trigger it via injected JS
                        webViewRef.current?.injectJavaScript(`
              (function() {
                // Import and call the blockchain store's leaveRoom
                // This dispatches the leave event which the web app handles
                window.dispatchEvent(new CustomEvent('native-message', {
                  detail: { type: 'LEAVE_GAME' }
                }));
              })();
              true;
            `);
                        // Wait a moment for the tx, then navigate back
                        setTimeout(() => {
                            router.back();
                        }, 2000);
                    } else {
                        router.back();
                    }
                },
            },
        ]);
    };

    // Recenter camera
    const handleRecenter = () => {
        haptic.tap();
        webViewRef.current?.injectJavaScript(`
      (function() {
        // Import and call recenterCamera
        if (typeof window.__recenterCamera === 'function') {
          window.__recenterCamera();
        } else {
          // Fallback: dispatch event
          window.dispatchEvent(new CustomEvent('native-message', {
            detail: { type: 'RECENTER_CAMERA' }
          }));
        }
      })();
      true;
    `);
    };

    return (
        <View style={styles.container}>
            {/* Hide status bar for truly full-screen */}
            <StatusBar hidden />

            {/* WebView — full screen */}
            <WebView
                ref={webViewRef}
                source={{ uri: gameUrl }}
                style={styles.webview}
                injectedJavaScriptBeforeContentLoaded={BRIDGE_INJECT_JS}
                onMessage={handleWebMessage}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                }}
                onShouldStartLoadWithRequest={handleNavigationRequest}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                mixedContentMode="compatibility"
            />

            {/* ─── Native Bottom Action Bar ─── */}
            {gameReady && !isLoading && !hasError && (
                <Animated.View
                    entering={FadeIn.delay(800).duration(400)}
                    pointerEvents="box-none"
                    style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}
                >
                    {/* Leave button */}
                    <Pressable
                        onPress={handleLeave}
                        style={({ pressed }) => [
                            styles.bottomBtn,
                            styles.leaveBtn,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                        ]}
                    >
                        <ArrowLeft size={16} color="#fff" />
                        <Text style={styles.leaveBtnText}>Leave</Text>
                    </Pressable>

                    {/* Recenter button */}
                    <Pressable
                        onPress={handleRecenter}
                        style={({ pressed }) => [
                            styles.bottomBtn,
                            styles.recenterBtn,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                        ]}
                    >
                        <Crosshair size={16} color="#fff" />
                        <Text style={styles.recenterBtnText}>Recenter</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Loading overlay */}
            {isLoading && (
                <Animated.View entering={FadeIn} exiting={FadeOut.duration(300)} style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        <ActivityIndicator size="large" color={COLORS.solanaPurple} />
                        <Text style={styles.loadingTitle}>Loading Game</Text>
                        <Text style={styles.loadingSubtext}>
                            {mode === 'explore' ? 'Initializing the board...' : 'Connecting to blockchain...'}
                        </Text>
                        <View style={styles.modeBadge}>
                            <Text style={styles.modeBadgeText}>
                                {mode === 'explore' ? '🎮 Explore Mode' : '🏆 Beginner Mode'}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* Error state */}
            {hasError && (
                <Animated.View entering={FadeInDown.duration(400)} style={styles.errorOverlay}>
                    <Text style={styles.errorEmoji}>⚠️</Text>
                    <Text style={styles.errorTitle}>Connection Failed</Text>
                    <Text style={styles.errorDesc}>
                        Couldn't load the game.{'\n'}Make sure the web server is running.
                    </Text>
                    <Pressable
                        onPress={() => {
                            setHasError(false);
                            setIsLoading(true);
                            webViewRef.current?.reload();
                        }}
                        style={styles.retryBtn}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                    <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
                        <Text style={[styles.retryText, { color: COLORS.textMuted }]}>Go Back</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    webview: {
        flex: 1,
    },

    // ─── Bottom Action Bar ───
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    bottomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    leaveBtn: {
        backgroundColor: '#e53e3e',
    },
    leaveBtnText: {
        fontFamily: FONTS.bold,
        fontSize: 13,
        color: '#fff',
    },
    recenterBtn: {
        backgroundColor: COLORS.solanaPurple,
    },
    recenterBtnText: {
        fontFamily: FONTS.bold,
        fontSize: 13,
        color: '#fff',
    },

    // ─── Loading ───
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    loadingContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingTitle: {
        fontFamily: FONTS.extrabold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginTop: 20,
    },
    loadingSubtext: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 6,
    },
    modeBadge: {
        marginTop: 24,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(153,69,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(153,69,255,0.15)',
    },
    modeBadgeText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.sm,
        color: COLORS.solanaPurple,
    },

    // ─── Error ───
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        zIndex: 10,
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorTitle: {
        fontFamily: FONTS.extrabold,
        fontSize: FONT_SIZES.xl,
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    errorDesc: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    retryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: RADIUS.lg,
        backgroundColor: 'rgba(153,69,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(153,69,255,0.2)',
    },
    retryText: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES.md,
        color: COLORS.solanaPurple,
    },
});
