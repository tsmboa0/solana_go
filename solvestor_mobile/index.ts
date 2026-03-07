// ============================================================
// Entry Point — Solvestor Mobile
// ============================================================
// Polyfills MUST be imported before anything else.
// Expo Router uses this file as the entry point.
// ============================================================

// Crypto polyfills for Solana SDK (must be first)
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Expo Router entry
import 'expo-router/entry';
