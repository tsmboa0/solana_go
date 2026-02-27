// ============================================================
// GO Button — Solvestor (SWS)
// ============================================================
// Big "GO" roll button at bottom center, inspired by
// Monopoly GO's diamond-shaped action button.
// Pulses when it's player's turn. Shows dice result after roll.
// In Explore mode: shows circular cooldown countdown timer.
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { useDiceRoll } from '@/hooks/useDiceRoll';
import { soundManager } from '@/utils/SoundManager';

export function DiceButton() {
    const phase = useGameStore((s) => s.phase);
    const isDiceAnimating = useUIStore((s) => s.isDiceAnimating);
    const theme = useUIStore((s) => s.theme);
    const lastDiceResult = useGameStore((s) => s.lastDiceResult);
    const { performRoll } = useDiceRoll();

    const isDark = theme === 'dark';
    const currentPlayer = useGameStore((s) => s.players[s.currentPlayerIndex]);
    const isCPUTurn = currentPlayer?.isCPU === true;
    const isExploreMode = useGameStore((s) => s.isExploreMode);

    // Cooldown state
    const lastRollTime = useGameStore((s) => s.lastRollTime);
    const cooldownDuration = useGameStore((s) => s.cooldownDuration);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // Update cooldown timer every 100ms
    useEffect(() => {
        if (!isExploreMode || !lastRollTime) {
            setCooldownRemaining(0);
            return;
        }

        const tick = () => {
            const elapsed = Date.now() - lastRollTime;
            const remaining = Math.max(0, cooldownDuration - elapsed);
            setCooldownRemaining(remaining);
        };
        tick();

        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [lastRollTime, cooldownDuration, isExploreMode]);

    const isOnCooldown = isExploreMode && cooldownRemaining > 0;
    const isAnimating = phase === 'rolling' || phase === 'moving' || isDiceAnimating;
    const isBusy = phase !== 'waiting' || isDiceAnimating;
    const canRoll = phase === 'waiting' && !isDiceAnimating && !isCPUTurn && !isOnCooldown;

    // Cooldown progress (0 → 1 as cooldown completes)
    const cooldownProgress = isOnCooldown ? 1 - (cooldownRemaining / cooldownDuration) : 1;
    const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

    // SVG arc for circular countdown
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - cooldownProgress);

    const handleRollClick = async () => {
        if (!canRoll) return;

        // Initialize Web Audio API on first user interaction 
        await soundManager.init();
        soundManager.playBGM();

        performRoll();
    };

    // Don't render during CPU turn (hide completely so CPU token is visible)
    if (isCPUTurn && !isOnCooldown) return null;

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-3">
            {/* Dice result badge */}
            {lastDiceResult && !isAnimating && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`
            flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold font-mono
            ${isDark
                            ? 'bg-[rgba(16,16,32,0.8)] text-white/90 border border-white/10'
                            : 'bg-white/90 text-gray-800 border border-gray-200 shadow-sm'
                        }
            backdrop-blur-md
          `}
                >
                    <span className="text-base">🎲</span>
                    <span>{lastDiceResult.die1}</span>
                    <span className="text-xs opacity-50">+</span>
                    <span>{lastDiceResult.die2}</span>
                    <span className="text-xs opacity-50">=</span>
                    <span className="text-lg">{lastDiceResult.total}</span>
                </motion.div>
            )}

            {/* Big GO Button */}
            <motion.button
                onClick={handleRollClick}
                disabled={!canRoll}
                className="relative"
                whileTap={canRoll ? { scale: 0.92 } : {}}
            >
                {/* Outer glow pulse (when can roll) */}
                {canRoll && (
                    <motion.div
                        className="absolute inset-[-8px] rounded-[28px] bg-gradient-to-br from-purple-500/30 to-emerald-400/30"
                        animate={{
                            scale: [1, 1.08, 1],
                            opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{ filter: 'blur(8px)' }}
                    />
                )}

                {/* Circular cooldown ring (explore mode only) */}
                {isOnCooldown && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '110px',
                            height: '110px',
                            pointerEvents: 'none',
                        }}
                    >
                        <svg
                            width="110"
                            height="110"
                            viewBox="0 0 110 110"
                            style={{ transform: 'rotate(-90deg)' }}
                        >
                            {/* Background track */}
                            <circle
                                cx="55"
                                cy="55"
                                r={radius}
                                fill="none"
                                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                                strokeWidth="4"
                            />
                            {/* Progress arc */}
                            <circle
                                cx="55"
                                cy="55"
                                r={radius}
                                fill="none"
                                stroke="url(#cooldownGradient)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                            />
                            <defs>
                                <linearGradient id="cooldownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#9945FF" />
                                    <stop offset="100%" stopColor="#14F195" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                )}

                {/* Button body — diamond-inspired rounded rectangle */}
                <div
                    className={`
            relative w-[100px] h-[72px] rounded-[20px] flex items-center justify-center
            overflow-hidden
            transition-all duration-200
            ${canRoll
                            ? 'shadow-xl'
                            : 'opacity-50'
                        }
          `}
                    style={{
                        background: canRoll
                            ? 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 50%, #14F195 100%)'
                            : isDark
                                ? 'rgba(60,60,80,0.6)'
                                : 'rgba(180,180,200,0.6)',
                        boxShadow: canRoll
                            ? '0 8px 30px rgba(153, 69, 255, 0.4), 0 2px 8px rgba(20, 241, 149, 0.2)'
                            : 'none',
                    }}
                >
                    {/* Inner highlight */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[40%] rounded-t-[20px]"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)',
                        }}
                    />

                    {/* Button text */}
                    {isAnimating ? (
                        <motion.div
                            className="relative flex items-center gap-1.5"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            <span className="text-xl">🎲</span>
                            <span className="text-xl">🎲</span>
                        </motion.div>
                    ) : isOnCooldown ? (
                        /* Cooldown countdown display */
                        <div className="relative flex flex-col items-center">
                            <span
                                style={{
                                    color: '#fff',
                                    fontWeight: 900,
                                    fontSize: '1.4rem',
                                    lineHeight: 1,
                                    fontFamily: 'monospace',
                                    opacity: 0.9,
                                }}
                            >
                                {cooldownSeconds}
                            </span>
                            <span
                                style={{
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: '0.55rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.08em',
                                    marginTop: '2px',
                                }}
                            >
                                COOLDOWN
                            </span>
                        </div>
                    ) : isBusy ? (
                        /* Busy (action phase, etc.) */
                        <motion.div
                            className="relative flex items-center gap-1.5"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            <span className="text-base" style={{ opacity: 0.7 }}>⏳</span>
                        </motion.div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            <span className="text-white font-black text-2xl tracking-wider leading-none">
                                GO
                            </span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-white/70 text-[10px]">◀</span>
                                <span className="text-white/70 text-[10px]">▶</span>
                            </div>
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
