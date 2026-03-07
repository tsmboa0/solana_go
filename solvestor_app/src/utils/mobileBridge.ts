// ============================================================
// Mobile Bridge Utilities — Solvestor Web App
// ============================================================
// Helpers for the web app to communicate with the native shell
// when running inside the Solvestor mobile app's WebView.
// ============================================================

/** Check if the web app is running inside the native WebView */
export function isMobileNative(): boolean {
    return !!(window as any).__SOLVESTOR_NATIVE__;
}

/** Check if URL has ?mobile=true param */
export function isMobileParam(): boolean {
    return new URLSearchParams(window.location.search).get('mobile') === 'true';
}

/** Send a message to the native app */
export function postToNative(message: {
    type: string;
    payload?: Record<string, any>;
}) {
    if ((window as any).postToNative) {
        (window as any).postToNative(message);
    }
}

/** Request haptic feedback from the native app */
export function requestHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
    postToNative({ type: 'HAPTIC', payload: { style } });
}

/** Tell the native app the game is ready */
export function signalGameReady() {
    postToNative({ type: 'GAME_READY' });
}

/** Tell the native app to navigate back */
export function requestNavigateBack() {
    postToNative({ type: 'NAVIGATE_BACK' });
}

/** Tell the native app the game ended */
export function signalGameEnded(winner: string) {
    postToNative({ type: 'GAME_ENDED', payload: { winner } });
}

/** Listen for messages from the native app */
export function onNativeMessage(
    handler: (message: { type: string; payload?: any }) => void
): () => void {
    const listener = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.type) handler(detail);
    };
    window.addEventListener('native-message', listener);
    return () => window.removeEventListener('native-message', listener);
}
