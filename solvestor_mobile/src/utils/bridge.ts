// ============================================================
// WebView Bridge — Solvestor Mobile
// ============================================================
// Defines the message protocol between native app and web game.
// Native → Web: wallet info, game params, navigation commands
// Web → Native: transaction requests, game events, haptics
// ============================================================

import type { WebViewMessageEvent } from 'react-native-webview';
import type WebView from 'react-native-webview';

// ─── Message Types: Native → Web ─────────────────────────────

export type NativeToWebMessage =
  | { type: 'WALLET_CONTEXT'; payload: { publicKey: string; connected: boolean } }
  | { type: 'GAME_PARAMS'; payload: { gamePDA: string; gameId: string; mode: string } }
  | { type: 'NAVIGATE'; payload: { route: string } };

// ─── Message Types: Web → Native ─────────────────────────────

export type WebToNativeMessage =
  | { type: 'GAME_READY' }
  | { type: 'GAME_ENDED'; payload: { winner: string } }
  | { type: 'HAPTIC'; payload: { style: 'light' | 'medium' | 'heavy' | 'success' | 'error' } }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'SIGN_TRANSACTION'; payload: { transaction: string; id: string } }
  | { type: 'LOG'; payload: { message: string } };

// ─── Helpers ─────────────────────────────────────────────────

/** Send a message from native to web */
export function postToWeb(webViewRef: React.RefObject<WebView | null>, message: NativeToWebMessage) {
  const js = `
    (function() {
      window.dispatchEvent(new CustomEvent('native-message', {
        detail: ${JSON.stringify(message)}
      }));
    })();
    true;
  `;
  webViewRef.current?.injectJavaScript(js);
}

/** Parse an incoming message from web */
export function parseWebMessage(event: WebViewMessageEvent): WebToNativeMessage | null {
  try {
    return JSON.parse(event.nativeEvent.data) as WebToNativeMessage;
  } catch {
    console.warn('[Bridge] Failed to parse web message:', event.nativeEvent.data);
    return null;
  }
}

/** JavaScript to inject into the WebView to set up the bridge listener + mobile CSS */
export const BRIDGE_INJECT_JS = `
  (function() {
    // Signal to the web app that it's running inside a native WebView
    window.__SOLVESTOR_NATIVE__ = true;

    // Set up message posting back to native
    window.postToNative = function(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    };

    // ─── Mobile-specific CSS injection ───
    var style = document.createElement('style');
    style.textContent = [
      // Safe area padding for Dynamic Island / notch
      // Push the top HUD down so balance is visible
      'body { --safe-top: env(safe-area-inset-top, 0px); }',

      // HUD container: add top safe area padding
      'body > div > div > div[style*="position: fixed"][style*="top: 0"] {',
      '  padding-top: calc(var(--safe-top) + 8px) !important;',
      '  padding-left: 10px !important;',
      '  padding-right: 10px !important;',
      '}',

      // All interactive buttons: bigger touch targets
      'button { min-height: 44px; min-width: 44px; }',

      // Dice / GO button: bigger on mobile
      'div[style*="position: fixed"][style*="bottom: 20px"] {',
      '  bottom: 80px !important;',
      '}',

      // Game info panel: add bottom safe area
      'div[style*="position: fixed"][style*="bottom: 0"] {',
      '  bottom: 70px !important;',
      '}',

      // Recenter button: push up above native bar
      'div[style*="position: fixed"][style*="bottom: 16px"][style*="right:"] {',
      '  bottom: 86px !important;',
      '}',
    ].join('\\n');
    document.head.appendChild(style);

    // Log bridge is ready
    console.log('[Bridge] Native bridge initialized + mobile CSS injected');
    true;
  })();
`;
