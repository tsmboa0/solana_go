// ============================================================
// Game Constants — Solvestor (SWS)
// ============================================================
// All magic numbers live here. No hardcoded values in components.
// ============================================================


// Zoom out Desired 📷 Camera: [4.85, 3.39, 0.75]  |  🎯 Target: [-1.75, -0.00, 2.85] 
// Zoom out Current 📷 Camera: [3.11, 5.50, 1.01]  |  🎯 Target: [-2.30, -0.00, 2.87]

/** Board dimensions */
export const BOARD_SIZE = 40;
export const TILES_PER_SIDE = 11; // 9 regular + 2 corners shared
export const CORNER_INDICES = [0, 10, 20, 30] as const;

/** Board 3D layout params */
export const BOARD_SCALE = 1;
export const TILE_WIDTH = 0.55;
export const TILE_DEPTH = 0.8;
export const TILE_HEIGHT = 0.05;          // Extrusion height
export const CORNER_TILE_SIZE = 0.8;      // Corners are square
export const BOARD_PADDING = 0.15;        // Gap between tiles
export const BOARD_TOTAL_SIZE = TILES_PER_SIDE * TILE_WIDTH + BOARD_PADDING * 2;

/** Environment Layout */
export const ROAD_OFFSET = 5.5;           // Distance from the center of the board to the center of the road/truck path
export const CITY_OFFSET = 2.0;           // Additional distance outward from ROAD_OFFSET where buildings begin to spawn

/** Economy */
export const STARTING_BALANCE = 15_000;
export const GO_SALARY = 2_000;
export const TAX_AMOUNT = 1_500;
export const MAX_PLAYERS = 4;

/** Sound / Audio */
export const SOUND_ENABLED = true;
export const SOUND_BGM_VOLUME = 0.4;
export const SOUND_SFX_VOLUME = 0.8;

/** Camera defaults */
export const CAMERA_FOLLOW_HEIGHT = 5.50;            // Matches start position Y
export const CAMERA_ZOOM_ON_LAND = 1.3;
// --- Camera Speed Variables ---
// Increase these values to make the camera move faster, decrease to slow it down.
// Note: We use Delta-Time scaling, so these values act as the "base" speed multiplier.
export const CAMERA_BASE_SPEED = 0.08;        // Standard follow speed
export const CAMERA_ZOOM_IN_SPEED = 0.08;     // Speed when zooming closer to the tile
export const CAMERA_ZOOM_OUT_SPEED = 0.06;    // Speed when pulling back out

/** Starting / overview camera pose (single source of truth) */
export const CAMERA_START_POSITION: [number, number, number] = [4.91, 5.50, 6.50];  //📷 Camera: [7.21, 7.32, 7.75]  | 
export const CAMERA_START_TARGET: [number, number, number] = [0.59, -0.02, 1.07];   // 🎯 Target: [0.04, 0.80, 0.67]

/** Follow mode — offset from tile position [x, y, z] */
export const CAMERA_FOLLOW_OFFSET: [number, number, number] = [1.5, 5.50, 2.2];

/** Follow mode — distance behind the token in the travel direction */
export const CAMERA_FOLLOW_DISTANCE = 3.5;

/** Follow mode — lateral offset toward board center (inward) */
export const CAMERA_SIDE_OFFSET = 2.0;

/** How far ahead of the token the lookAt point should be (in travel direction) */
export const CAMERA_LOOK_AHEAD_DISTANCE = 1.2;

/** Zoom-on-land — closer offset from tile position */
export const CAMERA_ZOOM_OFFSET: [number, number, number] = [0.8, 2.0, 1.0];

/** After zoom-out: lookAt Y value — higher = camera "chins up" for wider view */
export const CAMERA_ZOOM_OUT_LOOKAT_Y = 1.5;

/** OrbitControls limits */
export const CAMERA_MIN_DISTANCE = 2;
export const CAMERA_MAX_DISTANCE = 12;
export const CAMERA_MIN_POLAR = 0.2;                 // Nearly top-down
export const CAMERA_MAX_POLAR_DIVISOR = 2.2;          // maxPolar = PI / this

/** OrbitControls damping */
export const CAMERA_DAMPING_FACTOR = 0.08;

/** Animation timing (seconds) */
export const DICE_ROLL_DURATION = 1.2;
export const TOKEN_STEP_DURATION = 0.35;      // Time per tile step
export const TOKEN_BOUNCE_HEIGHT = 0.15;
export const TOKEN_BOUNCE_DURATION = 0.25;
export const CAMERA_ZOOM_DELAY = 0.2;        // Delay after landing before zoom
export const TURN_BANNER_DURATION = 1.3;

/** Token dimensions */
export const TOKEN_RADIUS = 0.08;
export const TOKEN_HEIGHT = 0.25;
export const TOKEN_Y_OFFSET = 0.28; // Token sits on top of tile (TILE_HEIGHT + half capsule)

/** Multiple tokens on same tile — offset spread */
export const TOKEN_SAME_TILE_OFFSET = 0.12;

/** Dice appearance */
export const DICE_SIZE = 0.35;
export const DICE_GAP = 0.5;
export const DICE_DOT_RADIUS = 0.022;

/** Dice physics (Rapier rigid body) */
export const DICE_THROW_HEIGHT = 0.3;         // Start height for throw
export const DICE_REST_HEIGHT = 0.18;         // Settled Y position (half-size + tiny lift)
export const DICE_TILE_MARGIN = 0.5;          // How far inside the tile ring dice should land
export const DICE_RESTITUTION = 0.1;          // Bounciness (0 = no bounce, 1 = full)
export const DICE_FRICTION = 1.0;             // Surface friction
export const DICE_IMPULSE_STRENGTH = 0.09;     // Base impulse for throwing (vel ≈ impulse/mass)
export const DICE_UPWARD_IMPULSE_BASE = 0.09;  // Base upward impulse
export const DICE_UPWARD_IMPULSE_VAR = 0.09;   // Random variable upward impulse
export const DICE_LATERAL_IMPULSE = 0.005;     // Base lateral separation impulse
export const DICE_TORQUE_STRENGTH = 0.02;     // Torque impulse for tumbling

