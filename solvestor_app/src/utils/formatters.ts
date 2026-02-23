// ============================================================
// Formatters — Solvestor (SWS)
// ============================================================

/** Format as currency: 15000 → "$15,000" */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Compact format: 15000 → "$15K" */
export function formatCompact(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount}`;
}

/** Format dice result: "⚄ ⚂ = 7" */
export function formatDiceResult(die1: number, die2: number): string {
    const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return `${faces[die1 - 1]} ${faces[die2 - 1]} = ${die1 + die2}`;
}
