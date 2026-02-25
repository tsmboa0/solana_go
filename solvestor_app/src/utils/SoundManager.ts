// ============================================================
// Sound Manager — Solvestor (SWS)
// ============================================================
// Singleton manager for all game audio using the Web Audio API.
// Provides low latency, no-stutter overlapping sound effects,
// and background music looping with volume controls.
// ============================================================

import { SOUND_BGM_VOLUME, SOUND_SFX_VOLUME, SOUND_ENABLED } from '@/config/game';

// Import asset URLs via Vite
import citySoundUrl from '@/assets/sounds/city-sound.mp3';
import goSoundUrl from '@/assets/sounds/go-sound.mp3';
import payRentUrl from '@/assets/sounds/pay-rent.mp3';
import tokenStepUrl from '@/assets/sounds/token-step.wav';
import rollingDiceUrl from '@/assets/sounds/rolling-dice.mp3';

const SOUND_FILES = {
    'city-sound': citySoundUrl,
    'go-sound': goSoundUrl,
    'pay-rent': payRentUrl,
    'token-step': tokenStepUrl,
    'rolling-dice': rollingDiceUrl,
};

export type SoundEffect = keyof typeof SOUND_FILES;

class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private initialized = false;

    private constructor() { }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    /**
     * Initializes the AudioContext and preloads all sounds.
     * MUST be called from a user interaction event handler (e.g. click).
     */
    public async init() {
        if (this.initialized) {
            // If already initialized, just make sure we resume if suspended (browsers suspend contexts automatically sometimes)
            if (this.audioContext?.state === 'suspended') {
                await this.audioContext.resume();
            }
            return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        // Setup gain nodes for independent volume control
        this.bgmGain = this.audioContext.createGain();
        this.bgmGain.gain.value = SOUND_BGM_VOLUME;
        this.bgmGain.connect(this.audioContext.destination);

        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = SOUND_SFX_VOLUME;
        this.sfxGain.connect(this.audioContext.destination);

        // Preload all sounds
        const loadPromises = Object.entries(SOUND_FILES).map(async ([key, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
                this.buffers.set(key, audioBuffer);
            } catch (err) {
                console.error(`[SoundManager] Failed to load sound ${key} from ${url}`, err);
            }
        });

        await Promise.all(loadPromises);

        // Resume just in case it was suspended immediately upon creation
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.initialized = true;
    }

    /**
     * Starts looping the background music natively via the Web Audio API.
     */
    public playBGM() {
        if (!SOUND_ENABLED || !this.initialized || !this.audioContext || !this.bgmGain) return;

        // If BGM is already playing, do not start again
        if (this.bgmSource) return;

        const buffer = this.buffers.get('city-sound');
        if (!buffer) {
            console.warn('[SoundManager] BGM buffer not found.');
            return;
        }

        this.bgmSource = this.audioContext.createBufferSource();
        this.bgmSource.buffer = buffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGain);
        this.bgmSource.start();
    }

    /**
     * Stops the background music setup.
     */
    public stopBGM() {
        if (this.bgmSource) {
            this.bgmSource.stop();
            this.bgmSource.disconnect();
            this.bgmSource = null;
        }
    }

    /**
     * Plays a single sound effect immediately, creating a new buffer source for overlap playback.
     */
    public play(effect: SoundEffect) {
        if (!SOUND_ENABLED || !this.initialized || !this.audioContext || !this.sfxGain) return;

        const buffer = this.buffers.get(effect);
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.sfxGain);
        source.start();
    }

    /**
     * Updates volume in real-time.
     */
    public setVolume(type: 'bgm' | 'sfx', volume: number) {
        if (!this.initialized) return;
        if (type === 'bgm' && this.bgmGain) {
            this.bgmGain.gain.value = volume;
        } else if (type === 'sfx' && this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }
}

export const soundManager = SoundManager.getInstance();
