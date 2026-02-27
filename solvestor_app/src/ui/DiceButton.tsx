// ============================================================
// GO Button — Solvestor (SWS)
// ============================================================
// Clean, glassmorphic dice roll button at bottom center.
// Shows GO when ready, circular cooldown ring when waiting,
// and animated dice when rolling.
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
    const lastDiceResult = useGameStore((s) => s.lastDiceResult);
    const { performRoll } = useDiceRoll();

    const currentPlayer = useGameStore((s) => s.players[s.currentPlayerIndex]);
    const isExploreMode = useGameStore((s) => s.isExploreMode);
    const startCooldown = useGameStore((s) => s.startCooldown);

    // In explore mode, the human is ALWAYS the active player
    const isCPUTurn = !isExploreMode && currentPlayer?.isCPU === true;

    // Cooldown state
    const lastRollTime = useGameStore((s) => s.lastRollTime);
    const cooldownDuration = useGameStore((s) => s.cooldownDuration);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    useEffect(() => {
        if (!isExploreMode || !lastRollTime) {
            setCooldownRemaining(0);
            return;
        }
        const tick = () => {
            const elapsed = Date.now() - lastRollTime;
            setCooldownRemaining(Math.max(0, cooldownDuration - elapsed));
        };
        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [lastRollTime, cooldownDuration, isExploreMode]);

    const isOnCooldown = isExploreMode && cooldownRemaining > 0;

    // In explore mode: ignore phase (CPU can change it), only care about isDiceAnimating
    const isAnimating = isExploreMode ? isDiceAnimating : (phase === 'rolling' || phase === 'moving' || isDiceAnimating);
    const canRoll = isExploreMode ? !isOnCooldown && !isDiceAnimating : (phase === 'waiting' && !isDiceAnimating && !isCPUTurn && !isOnCooldown);

    // Cooldown ring
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const cooldownProgress = isOnCooldown ? 1 - (cooldownRemaining / cooldownDuration) : 1;
    const strokeDashoffset = circumference * (1 - cooldownProgress);
    const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

    const handleRollClick = async () => {
        if (!canRoll) return;
        await soundManager.init();
        soundManager.playBGM();
        if (isExploreMode) startCooldown();
        performRoll();
    };

    // In turn-based mode only: hide during CPU turn
    if (isCPUTurn && !isOnCooldown) return null;

    // Button size
    const btnSize = 88;
    const btnRadius = 22;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                pointerEvents: 'none',
            }}
        >
            {/* Dice result badge */}
            {lastDiceResult && !isAnimating && (
                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        fontFamily: "'Inter', monospace",
                        background: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        color: '#1f2937',
                        pointerEvents: 'auto',
                    }}
                >
                    <span>🎲</span>
                    <span>{lastDiceResult.die1}</span>
                    <span style={{ opacity: 0.3 }}>+</span>
                    <span>{lastDiceResult.die2}</span>
                    <span style={{ opacity: 0.3 }}>=</span>
                    <span style={{ fontWeight: 900 }}>{lastDiceResult.total}</span>
                </motion.div>
            )}

            {/* Main button */}
            <motion.button
                onClick={handleRollClick}
                disabled={!canRoll}
                whileTap={canRoll ? { scale: 0.92 } : {}}
                style={{
                    position: 'relative',
                    width: `${btnSize}px`,
                    height: `${btnSize}px`,
                    borderRadius: `${btnRadius}px`,
                    border: 'none',
                    cursor: canRoll ? 'pointer' : 'default',
                    background: 'transparent',
                    pointerEvents: 'auto',
                    padding: 0,
                }}
            >
                {/* Pulsing glow ring (when ready) */}
                {canRoll && (
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: '-6px',
                            borderRadius: `${btnRadius + 6}px`,
                            background: 'linear-gradient(135deg, rgba(153,69,255,0.25), rgba(20,241,149,0.25))',
                            filter: 'blur(6px)',
                        }}
                        animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.25, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}

                {/* Cooldown ring overlay */}
                {isOnCooldown && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${btnSize + 16}px`,
                            height: `${btnSize + 16}px`,
                            pointerEvents: 'none',
                        }}
                    >
                        <svg
                            width={btnSize + 16}
                            height={btnSize + 16}
                            viewBox={`0 0 ${btnSize + 16} ${btnSize + 16}`}
                            style={{ transform: 'rotate(-90deg)' }}
                        >
                            <circle
                                cx={(btnSize + 16) / 2}
                                cy={(btnSize + 16) / 2}
                                r={radius}
                                fill="none"
                                stroke="rgba(0,0,0,0.06)"
                                strokeWidth="3"
                            />
                            <circle
                                cx={(btnSize + 16) / 2}
                                cy={(btnSize + 16) / 2}
                                r={radius}
                                fill="none"
                                stroke="url(#cdGrad)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                            />
                            <defs>
                                <linearGradient id="cdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#9945FF" />
                                    <stop offset="100%" stopColor="#14F195" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                )}

                {/* Glass button body */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        borderRadius: `${btnRadius}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: canRoll
                            ? 'linear-gradient(135deg, #9945FF 0%, #7B3FE4 50%, #14F195 100%)'
                            : 'rgba(255,255,255,0.5)',
                        border: canRoll
                            ? '1px solid rgba(255,255,255,0.3)'
                            : '1px solid rgba(255,255,255,0.5)',
                        backdropFilter: canRoll ? 'none' : 'blur(16px)',
                        WebkitBackdropFilter: canRoll ? 'none' : 'blur(16px)',
                        boxShadow: canRoll
                            ? '0 6px 24px rgba(153,69,255,0.35), 0 2px 8px rgba(20,241,149,0.15)'
                            : '0 2px 12px rgba(0,0,0,0.06)',
                        transition: 'all 0.3s ease',
                    }}
                >
                    {/* Top highlight */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '45%',
                            borderRadius: `${btnRadius}px ${btnRadius}px 0 0`,
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Content */}
                    {isAnimating ? (
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            style={{ fontSize: '1.8rem', position: 'relative' }}
                        >
                            🎲
                        </motion.div>
                    ) : isOnCooldown ? (
                        <div style={{ position: 'relative', textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: '1.6rem',
                                    fontWeight: 900,
                                    fontFamily: "'Inter', monospace",
                                    color: '#6b6b80',
                                    lineHeight: 1,
                                }}
                            >
                                {cooldownSeconds}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.5rem',
                                    fontWeight: 700,
                                    color: '#9a9ab0',
                                    letterSpacing: '0.1em',
                                    marginTop: '2px',
                                }}
                            >
                                WAIT
                            </div>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', textAlign: 'center' }}>
                            <div
                                style={{
                                    fontSize: '1.6rem',
                                    fontWeight: 900,
                                    fontFamily: "'Inter', sans-serif",
                                    color: '#fff',
                                    letterSpacing: '0.08em',
                                    lineHeight: 1,
                                    textShadow: '0 1px 4px rgba(0,0,0,0.15)',
                                }}
                            >
                                GO
                            </div>
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
