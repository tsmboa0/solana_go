use anchor_lang::prelude::*;

#[error_code]
pub enum GameErrorCode {
    #[msg("Game has already started")]
    GameAlreadyStarted,
    #[msg("Game has not started yet")]
    GameNotStarted,
    #[msg("Game has ended")]
    GameEnded,
    #[msg("Room is full. Max players reached")]
    RoomFull,
    #[msg("Player already joined the game")]
    PlayerAlreadyJoined,
    #[msg("Player not found in game")]
    PlayerNotFound,
    #[msg("Invalid Escrow Account")]
    InvalidEscrow,
    #[msg("Math Overflow")]
    MathOverflow,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Property already owned")]
    PropertyAlreadyOwned,
    #[msg("Not the owner of the property")]
    NotOwner,
    #[msg("Must wait 20 seconds before rolling again")]
    CooldownActive,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid tile index (must be 0-39)")]
    InvalidTileIndex,
    #[msg("Game requires go_count >= max_go_count to end")]
    CannotEndGameYet,
    #[msg("Property is not ownable")]
    NotOwnable,
    #[msg("Player is not on this tile")]
    NotOnTile,
    #[msg("Player is not active")]
    PlayerNotActive,
    #[msg("Player is not in this game")]
    PlayerNotInGame,
    #[msg("This tile has no applicable effect")]
    NotATileEffect,
    #[msg("Max players must be between 2 and 10")]
    InvalidMaxPlayers,
    #[msg("Need at least 2 players to start")]
    NotEnoughPlayers,
    #[msg("Only the game creator can start the game")]
    NotCreator,
    #[msg("No eligible winner found (need go_passes >= half of MIN_GO_COUNT_TO_END)")]
    NoEligibleWinner,
    #[msg("Player cannot afford the shield")]
    CannotAffordShield,
    #[msg("Player cannot afford to stake")]
    CannotAffordStake,
    #[msg("Player already has a shield")]
    AlreadyHasShield,
    #[msg("Player already staked in DeFi")]
    AlreadyStakedDeFi,
    #[msg("Player is trapped in the Graveyard (must roll doubles)")]
    TrappedInGraveyard,
    #[msg("Player cannot afford the potion")]
    CannotAffordPotion,
    #[msg("Player already has a potion")]
    AlreadyHasPotion,
    #[msg("Game winner has not been determined yet")]
    WinnerNotDetermined,
    #[msg("Game has not ended yet")]
    GameNotEnded,
    #[msg("Missing owner player account in remaining_accounts")]
    MissingOwnerAccount,
}
