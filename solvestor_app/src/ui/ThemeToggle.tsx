// ============================================================
// Theme Toggle — Solvestor (SWS)
// ============================================================
// Dark/Light mode switch.
// ============================================================

import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';

export function ThemeToggle() {
    const theme = useUIStore((s) => s.theme);
    const toggleTheme = useUIStore((s) => s.toggleTheme);
    const isDark = theme === 'dark';

    return (
        <motion.button
            onClick={toggleTheme}
            className={`
        fixed top-20 right-4 z-50
        w-10 h-10 rounded-full flex items-center justify-center
        text-lg
        ${isDark
                    ? 'bg-white/[0.08] active:bg-white/[0.12]'
                    : 'bg-black/[0.05] active:bg-black/[0.08]'
                }
        backdrop-blur-md
      `}
            whileTap={{ scale: 0.9 }}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            {isDark ? '☀️' : '🌙'}
        </motion.button>
    );
}
