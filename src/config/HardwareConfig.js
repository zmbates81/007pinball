/**
 * HardwareConfig.js
 * All Switch, Lamp, and Coil constants for GoldenEye 007 Pinball
 * Based on Sega documentation (Pages 20-25, 91-95)
 */

// =============================================================================
// SWITCH MATRIX (64 switches, 8 columns x 8 rows)
// =============================================================================

export const Switches = {
    // Column 1: System Switches (SW_01 - SW_08)
    SW_PLUMB_TILT:      1,
    SW_SLAM_TILT:       2,
    SW_START_BUTTON:    3,
    SW_COIN_1:          4,
    SW_COIN_2:          5,
    SW_COIN_3:          6,
    SW_SERVICE_ENTER:   7,
    SW_SERVICE_ESC:     8,

    // Column 2: Trough & Shooter (SW_09 - SW_16)
    SW_TROUGH_1:        9,   // Rightmost trough opto
    SW_TROUGH_2:        10,
    SW_TROUGH_3:        11,
    SW_TROUGH_4:        12,
    SW_TROUGH_5:        13,  // Leftmost trough opto
    SW_TROUGH_STACK:    14,
    SW_TROUGH_VUK:      15,
    SW_SHOOTER_LANE:    16,

    // Column 3: Ramps & Satellite (SW_17 - SW_24)
    SW_RIGHT_RAMP_EXIT:   17,
    SW_CENTER_RAMP_EXIT:  18,
    SW_RIGHT_RAMP_ENTER:  19,
    SW_SATELLITE_HOME:    20,
    SW_SATELLITE_UP:      21,
    SW_LEFT_RAMP_ENTER:   22,
    SW_LEFT_ORBIT:        23,
    SW_RIGHT_ORBIT:       24,

    // Column 4: Left Playfield (SW_25 - SW_32)
    SW_LEFT_BANK_1:     25,  // Bottom target
    SW_LEFT_BANK_2:     26,
    SW_LEFT_BANK_3:     27,
    SW_LEFT_BANK_4:     28,  // Top target
    SW_LEFT_BANK_5:     29,
    SW_LEFT_STANDUP:    30,
    SW_LEFT_LOCK:       31,
    SW_LEFT_RAMP_MADE:  32,

    // Column 5: Center Playfield (SW_33 - SW_40)
    SW_CENTER_TARGET_1: 33,
    SW_CENTER_TARGET_2: 34,
    SW_CENTER_TARGET_3: 35,
    SW_TANK_ENTRANCE:   36,
    SW_TANK_LOCK_1:     37,
    SW_TANK_LOCK_2:     38,
    SW_CENTER_STANDUP:  39,
    SW_SPINNER:         40,

    // Column 6: Bumpers & Right Targets (SW_41 - SW_48)
    SW_BUMPER_LEFT:     41,
    SW_BUMPER_BOTTOM:   42,
    SW_BUMPER_RIGHT:    43,
    SW_RIGHT_BANK_1:    44,  // Bottom target
    SW_RIGHT_BANK_2:    45,
    SW_RIGHT_BANK_3:    46,
    SW_RIGHT_BANK_4:    47,
    SW_RIGHT_BANK_5:    48,  // Top target

    // Column 7: Upper Playfield & Scoop (SW_49 - SW_56)
    SW_UPPER_LOOP:        49,
    SW_SCOOP:             50,  // Mode start
    SW_TOP_LANE_R:        51,
    SW_TOP_LANE_M:        52,
    SW_TOP_LANE_L:        53,
    SW_CENTER_RAMP_ENTER: 54,
    SW_SATELLITE_SHOT:    55,
    SW_SATELLITE_LOCK:    56,

    // Column 8: Lower Playfield (SW_57 - SW_64)
    SW_LEFT_OUTLANE:      57,
    SW_RIGHT_OUTLANE:     58,
    SW_LEFT_RETURN:       59,
    SW_RIGHT_RETURN:      60,
    SW_LEFT_SLING:        61,
    SW_RIGHT_SLING:       62,
    SW_LEFT_FLIPPER_EOS:  63,
    SW_RIGHT_FLIPPER_EOS: 64
};

// Reverse lookup for switch names
export const SwitchNames = Object.fromEntries(
    Object.entries(Switches).map(([k, v]) => [v, k])
);

// Switch groups for easier logic
export const SwitchGroups = {
    TROUGH: [
        Switches.SW_TROUGH_1,
        Switches.SW_TROUGH_2,
        Switches.SW_TROUGH_3,
        Switches.SW_TROUGH_4,
        Switches.SW_TROUGH_5
    ],
    LEFT_BANK: [
        Switches.SW_LEFT_BANK_1,
        Switches.SW_LEFT_BANK_2,
        Switches.SW_LEFT_BANK_3,
        Switches.SW_LEFT_BANK_4,
        Switches.SW_LEFT_BANK_5
    ],
    RIGHT_BANK: [
        Switches.SW_RIGHT_BANK_1,
        Switches.SW_RIGHT_BANK_2,
        Switches.SW_RIGHT_BANK_3,
        Switches.SW_RIGHT_BANK_4,
        Switches.SW_RIGHT_BANK_5
    ],
    CENTER_TARGETS: [
        Switches.SW_CENTER_TARGET_1,
        Switches.SW_CENTER_TARGET_2,
        Switches.SW_CENTER_TARGET_3
    ],
    BUMPERS: [
        Switches.SW_BUMPER_LEFT,
        Switches.SW_BUMPER_BOTTOM,
        Switches.SW_BUMPER_RIGHT
    ],
    TOP_LANES: [
        Switches.SW_TOP_LANE_L,
        Switches.SW_TOP_LANE_M,
        Switches.SW_TOP_LANE_R
    ],
    OUTLANES: [
        Switches.SW_LEFT_OUTLANE,
        Switches.SW_RIGHT_OUTLANE
    ],
    INLANES: [
        Switches.SW_LEFT_RETURN,
        Switches.SW_RIGHT_RETURN
    ],
    SLINGSHOTS: [
        Switches.SW_LEFT_SLING,
        Switches.SW_RIGHT_SLING
    ]
};

// =============================================================================
// LAMP MATRIX (64 lamps, 8 rows x 8 columns)
// =============================================================================

export const Lamps = {
    // Row 1: Mode Status Lamps (L_01 - L_08)
    L_EJECT_HURRY:      1,
    L_JACKPOT:          2,
    L_SCOOP:            3,
    L_LEFT_STANDUP:     4,
    L_RIGHT_RAMP:       5,
    L_SATELLITE:        6,
    L_LOCK_LIT:         7,
    L_START_BUTTON:     8,

    // Row 2: Multipliers & Combo (L_09 - L_16)
    L_BONUS_1X:         9,
    L_BONUS_2X:         10,
    L_BONUS_3X:         11,
    L_BONUS_4X:         12,
    L_BONUS_5X:         13,
    L_COMBO_2X:         14,
    L_COMBO_3X:         15,
    L_SATELLITE_ENABLED: 16,

    // Row 3: Left Target Bank (L_17 - L_24)
    L_LEFT_BANK_1:      17,
    L_LEFT_BANK_2:      18,
    L_LEFT_BANK_3:      19,
    L_LEFT_BANK_4:      20,
    L_LEFT_BANK_5:      21,
    L_LEFT_RAMP_ARROW:  22,
    L_LEFT_ORBIT_ARROW: 23,
    L_LEFT_LOCK:        24,

    // Row 4: Right Target Bank (L_25 - L_32)
    L_RIGHT_BANK_1:     25,
    L_RIGHT_BANK_2:     26,
    L_RIGHT_BANK_3:     27,
    L_RIGHT_BANK_4:     28,
    L_RIGHT_BANK_5:     29,
    L_RIGHT_RAMP_ARROW: 30,
    L_RIGHT_ORBIT_ARROW: 31,
    L_RIGHT_LOCK:       32,

    // Row 5: Top Lanes & Bumpers (L_33 - L_40)
    L_TOP_LANE_L:       33,
    L_TOP_LANE_M:       34,
    L_TOP_LANE_R:       35,
    L_BUMPER_L:         36,
    L_BUMPER_B:         37,
    L_BUMPER_R:         38,
    L_SPINNER_VALUE:    39,
    L_SUPER_SPINNER:    40,

    // Row 6: 007 Mode Lamps (L_41 - L_48)
    L_MODE_RUNWAY:      41,
    L_MODE_FACILITY:    42,
    L_MODE_SILO:        43,
    L_MODE_TRAIN:       44,
    L_MODE_STATUE:      45,
    L_MODE_ARCHIVES:    46,
    L_MODE_TANK:        47,
    L_MODE_CRADLE:      48,

    // Row 7: Outlanes & GI (L_49 - L_56)
    L_LEFT_OUTLANE:     49,
    L_RIGHT_OUTLANE:    50,
    L_LEFT_RETURN:      51,
    L_RIGHT_RETURN:     52,
    L_EXTRA_BALL:       53,
    L_SHOOT_AGAIN:      54,
    L_MAGNA_SAVE:       55,
    L_BALL_SAVE:        56,

    // Row 8: Playfield Inserts (L_57 - L_64)
    L_CENTER_DROP_1:    57,
    L_CENTER_DROP_2:    58,
    L_CENTER_DROP_3:    59,
    L_TANK_ENTRANCE:    60,
    L_MULTIBALL_LIT:    61,
    L_SUPER_JACKPOT:    62,
    L_GI_ZONE_1:        63,
    L_GI_ZONE_2:        64
};

// Reverse lookup for lamp names
export const LampNames = Object.fromEntries(
    Object.entries(Lamps).map(([k, v]) => [v, k])
);

// Lamp states
export const LampState = {
    OFF: 0,
    ON: 1,
    BLINK_SLOW: 2,      // 500ms interval
    BLINK_FAST: 3,      // 150ms interval
    BLINK_SUPERFAST: 4  // 75ms interval (hurry-up)
};

// Lamp colors for rendering
export const LampColors = {
    [Lamps.L_EJECT_HURRY]: '#ff0000',
    [Lamps.L_JACKPOT]: '#ffff00',
    [Lamps.L_SCOOP]: '#ffffff',
    [Lamps.L_LEFT_STANDUP]: '#00ff00',
    [Lamps.L_RIGHT_RAMP]: '#ff8800',
    [Lamps.L_SATELLITE]: '#0088ff',
    [Lamps.L_LOCK_LIT]: '#ff0000',
    [Lamps.L_START_BUTTON]: '#00ff00',
    // Multipliers
    [Lamps.L_BONUS_1X]: '#ffffff',
    [Lamps.L_BONUS_2X]: '#ffffff',
    [Lamps.L_BONUS_3X]: '#ffffff',
    [Lamps.L_BONUS_4X]: '#ffffff',
    [Lamps.L_BONUS_5X]: '#ffffff',
    [Lamps.L_COMBO_2X]: '#ffff00',
    [Lamps.L_COMBO_3X]: '#ffff00',
    [Lamps.L_SATELLITE_ENABLED]: '#0088ff',
    // Target banks
    [Lamps.L_LEFT_BANK_1]: '#ff0000',
    [Lamps.L_LEFT_BANK_2]: '#ff0000',
    [Lamps.L_LEFT_BANK_3]: '#ff0000',
    [Lamps.L_LEFT_BANK_4]: '#ff0000',
    [Lamps.L_LEFT_BANK_5]: '#ff0000',
    [Lamps.L_LEFT_RAMP_ARROW]: '#00ff00',
    [Lamps.L_LEFT_ORBIT_ARROW]: '#00ff00',
    [Lamps.L_LEFT_LOCK]: '#ff8800',
    [Lamps.L_RIGHT_BANK_1]: '#ff0000',
    [Lamps.L_RIGHT_BANK_2]: '#ff0000',
    [Lamps.L_RIGHT_BANK_3]: '#ff0000',
    [Lamps.L_RIGHT_BANK_4]: '#ff0000',
    [Lamps.L_RIGHT_BANK_5]: '#ff0000',
    [Lamps.L_RIGHT_RAMP_ARROW]: '#00ff00',
    [Lamps.L_RIGHT_ORBIT_ARROW]: '#00ff00',
    [Lamps.L_RIGHT_LOCK]: '#ff8800',
    // Top lanes & bumpers
    [Lamps.L_TOP_LANE_L]: '#ffffff',
    [Lamps.L_TOP_LANE_M]: '#ffffff',
    [Lamps.L_TOP_LANE_R]: '#ffffff',
    [Lamps.L_BUMPER_L]: '#ffff00',
    [Lamps.L_BUMPER_B]: '#ffff00',
    [Lamps.L_BUMPER_R]: '#ffff00',
    [Lamps.L_SPINNER_VALUE]: '#ff8800',
    [Lamps.L_SUPER_SPINNER]: '#ff8800',
    // Mode lamps
    [Lamps.L_MODE_RUNWAY]: '#0088ff',
    [Lamps.L_MODE_FACILITY]: '#0088ff',
    [Lamps.L_MODE_SILO]: '#0088ff',
    [Lamps.L_MODE_TRAIN]: '#0088ff',
    [Lamps.L_MODE_STATUE]: '#0088ff',
    [Lamps.L_MODE_ARCHIVES]: '#0088ff',
    [Lamps.L_MODE_TANK]: '#0088ff',
    [Lamps.L_MODE_CRADLE]: '#0088ff',
    // Outlanes & misc
    [Lamps.L_LEFT_OUTLANE]: '#ff0000',
    [Lamps.L_RIGHT_OUTLANE]: '#ff0000',
    [Lamps.L_LEFT_RETURN]: '#ffffff',
    [Lamps.L_RIGHT_RETURN]: '#ffffff',
    [Lamps.L_EXTRA_BALL]: '#ffff00',
    [Lamps.L_SHOOT_AGAIN]: '#ffff00',
    [Lamps.L_MAGNA_SAVE]: '#aa00ff',
    [Lamps.L_BALL_SAVE]: '#ffff00',
    // Playfield inserts
    [Lamps.L_CENTER_DROP_1]: '#ffffff',
    [Lamps.L_CENTER_DROP_2]: '#ffffff',
    [Lamps.L_CENTER_DROP_3]: '#ffffff',
    [Lamps.L_TANK_ENTRANCE]: '#ff0000',
    [Lamps.L_MULTIBALL_LIT]: '#ff0000',
    [Lamps.L_SUPER_JACKPOT]: '#ffff00',
    [Lamps.L_GI_ZONE_1]: '#ffffff',
    [Lamps.L_GI_ZONE_2]: '#ffffff'
};

// Lamp groups
export const LampGroups = {
    LEFT_BANK: [
        Lamps.L_LEFT_BANK_1,
        Lamps.L_LEFT_BANK_2,
        Lamps.L_LEFT_BANK_3,
        Lamps.L_LEFT_BANK_4,
        Lamps.L_LEFT_BANK_5
    ],
    RIGHT_BANK: [
        Lamps.L_RIGHT_BANK_1,
        Lamps.L_RIGHT_BANK_2,
        Lamps.L_RIGHT_BANK_3,
        Lamps.L_RIGHT_BANK_4,
        Lamps.L_RIGHT_BANK_5
    ],
    CENTER_DROPS: [
        Lamps.L_CENTER_DROP_1,
        Lamps.L_CENTER_DROP_2,
        Lamps.L_CENTER_DROP_3
    ],
    BONUS_MULTIPLIERS: [
        Lamps.L_BONUS_1X,
        Lamps.L_BONUS_2X,
        Lamps.L_BONUS_3X,
        Lamps.L_BONUS_4X,
        Lamps.L_BONUS_5X
    ],
    TOP_LANES: [
        Lamps.L_TOP_LANE_L,
        Lamps.L_TOP_LANE_M,
        Lamps.L_TOP_LANE_R
    ],
    BUMPERS: [
        Lamps.L_BUMPER_L,
        Lamps.L_BUMPER_B,
        Lamps.L_BUMPER_R
    ],
    MODES: [
        Lamps.L_MODE_RUNWAY,
        Lamps.L_MODE_FACILITY,
        Lamps.L_MODE_SILO,
        Lamps.L_MODE_TRAIN,
        Lamps.L_MODE_STATUE,
        Lamps.L_MODE_ARCHIVES,
        Lamps.L_MODE_TANK,
        Lamps.L_MODE_CRADLE
    ],
    GI: [
        Lamps.L_GI_ZONE_1,
        Lamps.L_GI_ZONE_2
    ]
};

// =============================================================================
// SOLENOID/COIL DEFINITIONS (22 coils)
// =============================================================================

export const Coils = {
    C_TROUGH_EJECT:         1,
    C_AUTO_LAUNCH:          2,
    C_SCOOP_EJECT:          3,
    C_POWER_SCOOP:          4,
    C_LEFT_RAMP_DIVERTER:   5,
    C_CENTER_RAMP_DIVERTER: 6,
    C_CENTER_DROP_RESET:    7,
    C_TANK_TRAP_RELEASE:    8,
    C_BUMPER_LEFT:          9,
    C_BUMPER_BOTTOM:        10,
    C_BUMPER_RIGHT:         11,
    C_SLING_LEFT:           12,
    C_SLING_RIGHT:          13,
    C_FLIPPER_LEFT_MAIN:    14,
    C_FLIPPER_LEFT_HOLD:    15,
    C_FLIPPER_RIGHT_MAIN:   16,
    C_FLIPPER_RIGHT_HOLD:   17,
    C_SATELLITE_MOTOR:      18,
    C_SATELLITE_RAMP_UP:    19,
    C_SATELLITE_MAGNET:     20,
    C_KNOCKER:              21,
    C_TANK_TRAP_DOOR:       22
};

// Reverse lookup for coil names
export const CoilNames = Object.fromEntries(
    Object.entries(Coils).map(([k, v]) => [v, k])
);

// Coil types and default pulse durations (in ms)
export const CoilConfig = {
    [Coils.C_TROUGH_EJECT]:         { type: 'pulse', duration: 30 },
    [Coils.C_AUTO_LAUNCH]:          { type: 'pulse', duration: 50 },
    [Coils.C_SCOOP_EJECT]:          { type: 'pulse', duration: 40 },
    [Coils.C_POWER_SCOOP]:          { type: 'pulse', duration: 60 },
    [Coils.C_LEFT_RAMP_DIVERTER]:   { type: 'hold' },
    [Coils.C_CENTER_RAMP_DIVERTER]: { type: 'hold' },
    [Coils.C_CENTER_DROP_RESET]:    { type: 'pulse', duration: 75 },
    [Coils.C_TANK_TRAP_RELEASE]:    { type: 'pulse', duration: 35 },
    [Coils.C_BUMPER_LEFT]:          { type: 'pulse', duration: 20 },
    [Coils.C_BUMPER_BOTTOM]:        { type: 'pulse', duration: 20 },
    [Coils.C_BUMPER_RIGHT]:         { type: 'pulse', duration: 20 },
    [Coils.C_SLING_LEFT]:           { type: 'pulse', duration: 25 },
    [Coils.C_SLING_RIGHT]:          { type: 'pulse', duration: 25 },
    [Coils.C_FLIPPER_LEFT_MAIN]:    { type: 'hold' },
    [Coils.C_FLIPPER_LEFT_HOLD]:    { type: 'hold' },
    [Coils.C_FLIPPER_RIGHT_MAIN]:   { type: 'hold' },
    [Coils.C_FLIPPER_RIGHT_HOLD]:   { type: 'hold' },
    [Coils.C_SATELLITE_MOTOR]:      { type: 'hold' },
    [Coils.C_SATELLITE_RAMP_UP]:    { type: 'pulse', duration: 100 },
    [Coils.C_SATELLITE_MAGNET]:     { type: 'pulse', duration: 150 },
    [Coils.C_KNOCKER]:              { type: 'pulse', duration: 30 },
    [Coils.C_TANK_TRAP_DOOR]:       { type: 'hold' }
};

// =============================================================================
// PHYSICS CONSTANTS (Arcade-style)
// =============================================================================

export const Physics = {
    GRAVITY: 0.12,              // pixels/frame² (tuned for arcade feel)
    BALL_RADIUS: 12,            // pixels
    FLIPPER_LENGTH: 65,         // pixels
    FLIPPER_WIDTH: 12,          // pixels
    FLIPPER_ANGULAR_VEL: 18,    // degrees/frame (snappy response)
    FLIPPER_MAX_ANGLE: 45,      // degrees from rest
    FLIPPER_REST_ANGLE: -25,    // degrees (pointing down)
    BALL_FRICTION: 0.998,       // velocity multiplier per frame
    BOUNCE_DAMPING: 0.65,       // velocity retention on bounce
    BUMPER_KICK: 10,            // velocity boost from bumpers
    SLING_KICK: 7,              // velocity boost from slingshots
    FLIPPER_KICK: 14,           // velocity boost from flippers
    MAX_VELOCITY: 28,           // speed cap
    LAUNCH_VELOCITY_MIN: 12,    // minimum launch speed
    LAUNCH_VELOCITY_MAX: 22     // maximum launch speed
};

// =============================================================================
// PLAYFIELD GEOMETRY (positions for collision detection)
// =============================================================================

export const PlayfieldConfig = {
    WIDTH: 800,
    HEIGHT: 1200,

    // Shooter lane
    SHOOTER_LANE: {
        x: 750,
        y: 1100,
        width: 40,
        height: 150
    },

    // Flipper positions (pivot points)
    LEFT_FLIPPER: {
        x: 280,
        y: 1050,
        angle: -25  // rest angle in degrees
    },
    RIGHT_FLIPPER: {
        x: 520,
        y: 1050,
        angle: -155  // rest angle (mirrored)
    },

    // Drain
    DRAIN: {
        x: 300,
        y: 1180,
        width: 200,
        height: 30
    },

    // Trough (off-screen, conceptual)
    TROUGH: {
        x: 0,
        y: 1250,
        capacity: 5
    }
};

// =============================================================================
// SCORING VALUES
// =============================================================================

export const Scoring = {
    // Basic targets
    TARGET_HIT: 5000,
    STANDUP_HIT: 7500,
    SPINNER_SPIN: 1000,

    // Bumpers
    BUMPER_HIT: 1000,
    SUPER_BUMPER_HIT: 5000,

    // Ramps
    RAMP_SHOT: 25000,
    COMBO_RAMP: 50000,

    // Lanes
    TOP_LANE: 10000,
    INLANE: 5000,

    // Special
    SKILL_SHOT_BASE: 500000,
    MODE_COMPLETION: 1000000,
    JACKPOT_BASE: 1000000,
    SUPER_JACKPOT: 5000000,

    // Bonus
    BONUS_PER_TARGET: 10000,
    BONUS_PER_RAMP: 25000
};

// =============================================================================
// GAME SETTINGS
// =============================================================================

export const GameSettings = {
    BALLS_PER_GAME: 3,
    BALL_SAVE_TIME: 10000,      // 10 seconds
    TILT_WARNINGS: 3,
    COMBO_WINDOW: 2500,         // 2.5 seconds to chain combos
    MODE_TIME_DEFAULT: 30000,   // 30 seconds per mode
    MULTIBALL_BALL_SAVE: 15000, // 15 seconds ball save during multiball
    EXTRA_BALL_SCORE: 10000000, // Score threshold for extra ball
    REPLAY_SCORE: 50000000      // Score threshold for replay
};
