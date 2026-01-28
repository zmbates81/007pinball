/**
 * CollisionSystem.js
 * Defines all collision zones on the playfield
 * Maps physical positions to switch IDs
 */

import { Switches, Physics } from '../config/HardwareConfig.js';

/**
 * All collision zones on the playfield
 * Each zone triggers a specific switch when hit
 */
export const CollisionZones = [
    // =========================================================================
    // BUMPERS (Turbo Bumpers)
    // =========================================================================
    {
        name: 'bumper_left',
        type: 'circle',
        x: 250,
        y: 280,
        radius: 28,
        switchId: Switches.SW_BUMPER_LEFT,
        kicks: true,
        kickStrength: Physics.BUMPER_KICK
    },
    {
        name: 'bumper_bottom',
        type: 'circle',
        x: 350,
        y: 350,
        radius: 28,
        switchId: Switches.SW_BUMPER_BOTTOM,
        kicks: true,
        kickStrength: Physics.BUMPER_KICK
    },
    {
        name: 'bumper_right',
        type: 'circle',
        x: 450,
        y: 280,
        radius: 28,
        switchId: Switches.SW_BUMPER_RIGHT,
        kicks: true,
        kickStrength: Physics.BUMPER_KICK
    },

    // =========================================================================
    // TOP LANES
    // =========================================================================
    {
        name: 'top_lane_left',
        type: 'rect',
        x: 200,
        y: 80,
        w: 60,
        h: 30,
        switchId: Switches.SW_TOP_LANE_L,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'top_lane_mid',
        type: 'rect',
        x: 300,
        y: 70,
        w: 60,
        h: 30,
        switchId: Switches.SW_TOP_LANE_M,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'top_lane_right',
        type: 'rect',
        x: 400,
        y: 80,
        w: 60,
        h: 30,
        switchId: Switches.SW_TOP_LANE_R,
        normal: { x: 0, y: 1 }
    },

    // =========================================================================
    // LEFT TARGET BANK (5 targets)
    // =========================================================================
    {
        name: 'left_bank_1',
        type: 'rect',
        x: 70,
        y: 500,
        w: 18,
        h: 35,
        switchId: Switches.SW_LEFT_BANK_1,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'left_bank_2',
        type: 'rect',
        x: 70,
        y: 455,
        w: 18,
        h: 35,
        switchId: Switches.SW_LEFT_BANK_2,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'left_bank_3',
        type: 'rect',
        x: 70,
        y: 410,
        w: 18,
        h: 35,
        switchId: Switches.SW_LEFT_BANK_3,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'left_bank_4',
        type: 'rect',
        x: 70,
        y: 365,
        w: 18,
        h: 35,
        switchId: Switches.SW_LEFT_BANK_4,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'left_bank_5',
        type: 'rect',
        x: 70,
        y: 320,
        w: 18,
        h: 35,
        switchId: Switches.SW_LEFT_BANK_5,
        normal: { x: 1, y: 0 }
    },

    // =========================================================================
    // RIGHT TARGET BANK (5 targets)
    // =========================================================================
    {
        name: 'right_bank_1',
        type: 'rect',
        x: 712,
        y: 500,
        w: 18,
        h: 35,
        switchId: Switches.SW_RIGHT_BANK_1,
        normal: { x: -1, y: 0 }
    },
    {
        name: 'right_bank_2',
        type: 'rect',
        x: 712,
        y: 455,
        w: 18,
        h: 35,
        switchId: Switches.SW_RIGHT_BANK_2,
        normal: { x: -1, y: 0 }
    },
    {
        name: 'right_bank_3',
        type: 'rect',
        x: 712,
        y: 410,
        w: 18,
        h: 35,
        switchId: Switches.SW_RIGHT_BANK_3,
        normal: { x: -1, y: 0 }
    },
    {
        name: 'right_bank_4',
        type: 'rect',
        x: 712,
        y: 365,
        w: 18,
        h: 35,
        switchId: Switches.SW_RIGHT_BANK_4,
        normal: { x: -1, y: 0 }
    },
    {
        name: 'right_bank_5',
        type: 'rect',
        x: 712,
        y: 320,
        w: 18,
        h: 35,
        switchId: Switches.SW_RIGHT_BANK_5,
        normal: { x: -1, y: 0 }
    },

    // =========================================================================
    // CENTER DROP TARGETS
    // =========================================================================
    {
        name: 'center_target_1',
        type: 'rect',
        x: 340,
        y: 200,
        w: 40,
        h: 15,
        switchId: Switches.SW_CENTER_TARGET_1,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'center_target_2',
        type: 'rect',
        x: 390,
        y: 200,
        w: 40,
        h: 15,
        switchId: Switches.SW_CENTER_TARGET_2,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'center_target_3',
        type: 'rect',
        x: 440,
        y: 200,
        w: 40,
        h: 15,
        switchId: Switches.SW_CENTER_TARGET_3,
        normal: { x: 0, y: 1 }
    },

    // =========================================================================
    // SLINGSHOTS
    // =========================================================================
    {
        name: 'left_sling',
        type: 'line',
        x1: 180,
        y1: 950,
        x2: 230,
        y2: 880,
        switchId: Switches.SW_LEFT_SLING,
        kicks: true,
        kickStrength: Physics.SLING_KICK
    },
    {
        name: 'right_sling',
        type: 'line',
        x1: 620,
        y1: 950,
        x2: 570,
        y2: 880,
        switchId: Switches.SW_RIGHT_SLING,
        kicks: true,
        kickStrength: Physics.SLING_KICK
    },

    // =========================================================================
    // SCOOP (Mode Start)
    // =========================================================================
    {
        name: 'scoop',
        type: 'circle',
        x: 150,
        y: 550,
        radius: 25,
        switchId: Switches.SW_SCOOP,
        capturesBall: true
    },

    // =========================================================================
    // RAMP ENTRANCES
    // =========================================================================
    {
        name: 'left_ramp_enter',
        type: 'rect',
        x: 120,
        y: 650,
        w: 50,
        h: 20,
        switchId: Switches.SW_LEFT_RAMP_ENTER,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'center_ramp_enter',
        type: 'rect',
        x: 370,
        y: 450,
        w: 60,
        h: 20,
        switchId: Switches.SW_CENTER_RAMP_ENTER,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'right_ramp_enter',
        type: 'rect',
        x: 620,
        y: 650,
        w: 50,
        h: 20,
        switchId: Switches.SW_RIGHT_RAMP_ENTER,
        normal: { x: 0, y: 1 }
    },

    // =========================================================================
    // RAMP EXITS (where ball returns)
    // =========================================================================
    {
        name: 'left_ramp_made',
        type: 'rect',
        x: 200,
        y: 750,
        w: 40,
        h: 15,
        switchId: Switches.SW_LEFT_RAMP_MADE,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'center_ramp_exit',
        type: 'rect',
        x: 380,
        y: 550,
        w: 40,
        h: 15,
        switchId: Switches.SW_CENTER_RAMP_EXIT,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'right_ramp_exit',
        type: 'rect',
        x: 550,
        y: 750,
        w: 40,
        h: 15,
        switchId: Switches.SW_RIGHT_RAMP_EXIT,
        normal: { x: 0, y: 1 }
    },

    // =========================================================================
    // ORBITS
    // =========================================================================
    {
        name: 'left_orbit',
        type: 'rect',
        x: 90,
        y: 200,
        w: 30,
        h: 40,
        switchId: Switches.SW_LEFT_ORBIT,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'right_orbit',
        type: 'rect',
        x: 680,
        y: 200,
        w: 30,
        h: 40,
        switchId: Switches.SW_RIGHT_ORBIT,
        normal: { x: -1, y: 0 }
    },

    // =========================================================================
    // SPINNER
    // =========================================================================
    {
        name: 'spinner',
        type: 'rect',
        x: 550,
        y: 250,
        w: 25,
        h: 50,
        switchId: Switches.SW_SPINNER,
        normal: { x: -1, y: 0 }
    },

    // =========================================================================
    // STANDUPS
    // =========================================================================
    {
        name: 'left_standup',
        type: 'rect',
        x: 100,
        y: 700,
        w: 20,
        h: 40,
        switchId: Switches.SW_LEFT_STANDUP,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'center_standup',
        type: 'rect',
        x: 390,
        y: 600,
        w: 20,
        h: 30,
        switchId: Switches.SW_CENTER_STANDUP,
        normal: { x: 0, y: 1 }
    },

    // =========================================================================
    // TANK AREA
    // =========================================================================
    {
        name: 'tank_entrance',
        type: 'rect',
        x: 580,
        y: 550,
        w: 40,
        h: 20,
        switchId: Switches.SW_TANK_ENTRANCE,
        normal: { x: 0, y: 1 }
    },
    {
        name: 'tank_lock_1',
        type: 'circle',
        x: 620,
        y: 500,
        radius: 15,
        switchId: Switches.SW_TANK_LOCK_1,
        capturesBall: true
    },
    {
        name: 'tank_lock_2',
        type: 'circle',
        x: 660,
        y: 480,
        radius: 15,
        switchId: Switches.SW_TANK_LOCK_2,
        capturesBall: true
    },

    // =========================================================================
    // SATELLITE AREA
    // =========================================================================
    {
        name: 'satellite_shot',
        type: 'circle',
        x: 400,
        y: 150,
        radius: 30,
        switchId: Switches.SW_SATELLITE_SHOT,
        capturesBall: false
    },
    {
        name: 'satellite_lock',
        type: 'circle',
        x: 130,
        y: 250,
        radius: 18,
        switchId: Switches.SW_SATELLITE_LOCK,
        capturesBall: true
    },
    {
        name: 'left_lock',
        type: 'circle',
        x: 150,
        y: 700,
        radius: 18,
        switchId: Switches.SW_LEFT_LOCK,
        capturesBall: true
    },

    // =========================================================================
    // OUTLANES & INLANES
    // =========================================================================
    {
        name: 'left_outlane',
        type: 'rect',
        x: 100,
        y: 1000,
        w: 30,
        h: 80,
        switchId: Switches.SW_LEFT_OUTLANE,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'right_outlane',
        type: 'rect',
        x: 670,
        y: 1000,
        w: 30,
        h: 80,
        switchId: Switches.SW_RIGHT_OUTLANE,
        normal: { x: -1, y: 0 }
    },
    {
        name: 'left_return',
        type: 'rect',
        x: 160,
        y: 980,
        w: 30,
        h: 50,
        switchId: Switches.SW_LEFT_RETURN,
        normal: { x: 1, y: 0 }
    },
    {
        name: 'right_return',
        type: 'rect',
        x: 610,
        y: 980,
        w: 30,
        h: 50,
        switchId: Switches.SW_RIGHT_RETURN,
        normal: { x: -1, y: 0 }
    },

    // =========================================================================
    // SHOOTER LANE
    // =========================================================================
    {
        name: 'shooter_lane',
        type: 'rect',
        x: 740,
        y: 900,
        w: 40,
        h: 30,
        switchId: Switches.SW_SHOOTER_LANE,
        normal: { x: -1, y: 0 }
    },

    // =========================================================================
    // PLAYFIELD WALLS (non-switch boundaries)
    // =========================================================================
    // Upper left curve
    {
        name: 'wall_upper_left',
        type: 'line',
        x1: 50,
        y1: 200,
        x2: 150,
        y2: 60,
        switchId: null
    },
    // Upper right curve
    {
        name: 'wall_upper_right',
        type: 'line',
        x1: 650,
        y1: 60,
        x2: 750,
        y2: 200,
        switchId: null
    },
    // Left wall
    {
        name: 'wall_left',
        type: 'line',
        x1: 50,
        y1: 200,
        x2: 50,
        y2: 900,
        switchId: null
    },
    // Right wall (upper)
    {
        name: 'wall_right_upper',
        type: 'line',
        x1: 750,
        y1: 200,
        x2: 750,
        y2: 850,
        switchId: null
    },
    // Left outlane guide
    {
        name: 'wall_left_outlane_guide',
        type: 'line',
        x1: 50,
        y1: 900,
        x2: 130,
        y2: 1080,
        switchId: null
    },
    // Right outlane guide
    {
        name: 'wall_right_outlane_guide',
        type: 'line',
        x1: 700,
        y1: 900,
        x2: 670,
        y2: 1080,
        switchId: null
    },
    // Left inlane/outlane divider
    {
        name: 'wall_left_divider',
        type: 'line',
        x1: 140,
        y1: 950,
        x2: 180,
        y2: 1050,
        switchId: null
    },
    // Right inlane/outlane divider
    {
        name: 'wall_right_divider',
        type: 'line',
        x1: 660,
        y1: 950,
        x2: 620,
        y2: 1050,
        switchId: null
    }
];

/**
 * Get all collision zones that have switches
 * @returns {Array}
 */
export function getSwitchZones() {
    return CollisionZones.filter(zone => zone.switchId !== null);
}

/**
 * Get collision zone by name
 * @param {string} name
 * @returns {Object|null}
 */
export function getZoneByName(name) {
    return CollisionZones.find(zone => zone.name === name) || null;
}

/**
 * Get collision zone by switch ID
 * @param {number} switchId
 * @returns {Object|null}
 */
export function getZoneBySwitchId(switchId) {
    return CollisionZones.find(zone => zone.switchId === switchId) || null;
}

/**
 * Get all bumper zones
 * @returns {Array}
 */
export function getBumperZones() {
    return CollisionZones.filter(zone => zone.kicks && zone.name.includes('bumper'));
}

/**
 * Get all target zones
 * @returns {Array}
 */
export function getTargetZones() {
    return CollisionZones.filter(zone => zone.name.includes('bank') || zone.name.includes('target'));
}
