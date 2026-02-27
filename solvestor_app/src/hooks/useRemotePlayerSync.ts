// ============================================================
// Remote Player Sync — Solvestor (SWS)
// ============================================================
// Watches on-chain PlayerState changes for remote players and
// syncs their positions/balances to the local game store.
// Remote players' tokens move silently (no camera, sound, popup).
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useBlockchainStore, type OnChainGameState } from '@/stores/useBlockchainStore';

/**
 * Subscribes to each remote player's on-chain state and syncs
 * position/balance changes into the local game store.
 */
export function useRemotePlayerSync() {
    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const players = useGameStore((s) => s.players);
    const localPlayerIndex = useGameStore((s) => s.localPlayerIndex);
    const updateOwnershipFromChain = useGameStore((s) => s.updateOwnershipFromChain);

    const currentGameState = useBlockchainStore((s) => s.currentGameState);

    // Track previous positions for each player so we only trigger on actual changes
    const prevPositions = useRef<Record<string, number>>({});
    const prevBalances = useRef<Record<string, number>>({});

    // ─── Sync remote player positions & balances from on-chain GameState ───
    useEffect(() => {
        if (!isBeginnerMode || !currentGameState) return;

        // currentGameState.players is the array of PublicKeys in the game
        const onChainPlayers = (currentGameState as OnChainGameState).players;
        if (!onChainPlayers) return;

        // We don't have individual PlayerState subscriptions for all remote
        // players yet — that would require subscribing to each PlayerState PDA.
        // For now, we'll update from the GameState's property_owners.
        const propertyOwners = (currentGameState as any).propertyOwners;
        if (propertyOwners) {
            const ownerStrings = propertyOwners.map((pk: any) =>
                pk?.toBase58 ? pk.toBase58() : String(pk)
            );
            updateOwnershipFromChain(ownerStrings);
        }
    }, [isBeginnerMode, currentGameState, updateOwnershipFromChain]);

    // ─── Sync individual player state from subscription callbacks ───
    // This handles position and balance updates for each player
    useEffect(() => {
        if (!isBeginnerMode) return;

        for (let i = 0; i < players.length; i++) {
            if (i === localPlayerIndex) continue; // Skip local player

            const player = players[i];
            const prevPos = prevPositions.current[player.id];

            // Detect position change — trigger move animation
            if (prevPos !== undefined && prevPos !== player.position) {
                // Position already updated via updatePlayerFromChain in the
                // blockchain store subscription — the token will animate via
                // useTokenMovement detecting the position change
                console.log(`[RemoteSync] Player ${player.id.slice(0, 8)} moved: ${prevPos} → ${player.position}`);
            }

            // Track current values for next comparison
            prevPositions.current[player.id] = player.position;
            prevBalances.current[player.id] = player.balance;
        }
    }, [isBeginnerMode, players, localPlayerIndex]);
}
