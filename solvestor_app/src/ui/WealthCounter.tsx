// ============================================================
// Wealth Counter — Solvestor (SWS)
// ============================================================
// Animated number that counts up/down when balance changes.
// Green flash on gain, red flash on loss.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/utils/formatters';

interface WealthCounterProps {
    value: number;
    className?: string;
    style?: React.CSSProperties;
}

export function WealthCounter({ value, className = '', style }: WealthCounterProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);
    const previousValue = useRef(value);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const prev = previousValue.current;
        if (prev === value) return;

        // Set flash color
        setFlash(value > prev ? 'gain' : 'loss');
        setTimeout(() => setFlash(null), 600);

        // Animate counting
        const duration = 500; // ms
        const startTime = performance.now();
        const startValue = displayValue;

        function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (value - startValue) * eased);
            setDisplayValue(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        }

        rafRef.current = requestAnimationFrame(animate);
        previousValue.current = value;

        return () => cancelAnimationFrame(rafRef.current);
    }, [value]);

    const flashColor =
        flash === 'gain'
            ? 'text-emerald-400'
            : flash === 'loss'
                ? 'text-red-400'
                : '';

    return (
        <AnimatePresence mode="wait">
            <motion.span
                key={flash}
                className={`font-mono font-bold tabular-nums ${flashColor} ${className}`}
                style={style}
                initial={flash ? { scale: 1.15 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {formatCurrency(displayValue)}
            </motion.span>
        </AnimatePresence>
    );
}
