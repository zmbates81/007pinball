/**
 * SolenoidDriver.js
 * Controls all solenoids/coils for the pinball machine
 * Handles pulse timing and hold coils
 */

import eventBus, { Events } from '../core/EventBus.js';
import { Coils, CoilNames, CoilConfig } from '../config/HardwareConfig.js';

class SolenoidDriver {
    constructor() {
        // Coil states (true = energized)
        this.states = new Map();

        // Active pulse timers
        this.pulseTimers = new Map();

        // Coil fire history for diagnostics
        this.history = [];
        this.maxHistory = 50;

        // Safety: max continuous hold time (prevents coil burnout)
        this.maxHoldTime = 5000; // 5 seconds
        this.holdTimers = new Map();

        // Initialize all coils to off
        Object.values(Coils).forEach(coil => {
            this.states.set(coil, false);
        });

        // Subscribe to coil fire events
        eventBus.on(Events.COIL_FIRE, this.handleCoilFire.bind(this));
        eventBus.on(Events.COIL_STOP, this.handleCoilStop.bind(this));
    }

    /**
     * Fire a coil (pulse or hold based on config)
     * @param {number} coilId
     * @param {Object} options - Override options
     */
    fire(coilId, options = {}) {
        const config = CoilConfig[coilId];
        if (!config) {
            console.warn(`Unknown coil: ${coilId}`);
            return;
        }

        // Don't fire if already active (for pulse coils)
        if (this.states.get(coilId) && config.type === 'pulse') {
            return;
        }

        // Energize the coil
        this.states.set(coilId, true);

        // Record in history
        this.recordHistory(coilId, 'fire');

        // Emit fired event
        eventBus.emit(Events.COIL_FIRED, {
            coilId,
            coilName: CoilNames[coilId],
            type: config.type,
            timestamp: performance.now()
        });

        // Handle pulse vs hold coils
        if (config.type === 'pulse') {
            const duration = options.duration || config.duration;
            this.schedulePulseOff(coilId, duration);
        } else {
            // Hold coil - set safety timeout
            this.setHoldTimeout(coilId);
        }
    }

    /**
     * Stop a coil (mainly for hold coils)
     * @param {number} coilId
     */
    stop(coilId) {
        if (this.states.get(coilId)) {
            this.states.set(coilId, false);

            // Clear any pending timers
            if (this.pulseTimers.has(coilId)) {
                clearTimeout(this.pulseTimers.get(coilId));
                this.pulseTimers.delete(coilId);
            }

            if (this.holdTimers.has(coilId)) {
                clearTimeout(this.holdTimers.get(coilId));
                this.holdTimers.delete(coilId);
            }

            this.recordHistory(coilId, 'stop');
        }
    }

    /**
     * Schedule pulse coil to turn off
     * @param {number} coilId
     * @param {number} duration - ms
     */
    schedulePulseOff(coilId, duration) {
        // Clear any existing timer
        if (this.pulseTimers.has(coilId)) {
            clearTimeout(this.pulseTimers.get(coilId));
        }

        const timer = setTimeout(() => {
            this.states.set(coilId, false);
            this.pulseTimers.delete(coilId);
            this.recordHistory(coilId, 'pulseEnd');
        }, duration);

        this.pulseTimers.set(coilId, timer);
    }

    /**
     * Set safety timeout for hold coils
     * @param {number} coilId
     */
    setHoldTimeout(coilId) {
        // Clear any existing timer
        if (this.holdTimers.has(coilId)) {
            clearTimeout(this.holdTimers.get(coilId));
        }

        const timer = setTimeout(() => {
            console.warn(`Safety timeout: Coil ${CoilNames[coilId]} held too long, releasing`);
            this.stop(coilId);
        }, this.maxHoldTime);

        this.holdTimers.set(coilId, timer);
    }

    /**
     * Check if a coil is currently energized
     * @param {number} coilId
     * @returns {boolean}
     */
    isActive(coilId) {
        return this.states.get(coilId) === true;
    }

    /**
     * Handle coil fire event
     * @param {Object} data
     */
    handleCoilFire(data) {
        if (data.coilId !== undefined) {
            this.fire(data.coilId, data.options || {});
        }
    }

    /**
     * Handle coil stop event
     * @param {Object} data
     */
    handleCoilStop(data) {
        if (data.coilId !== undefined) {
            this.stop(data.coilId);
        }
    }

    /**
     * Fire trough eject coil
     */
    ejectFromTrough() {
        this.fire(Coils.C_TROUGH_EJECT);
    }

    /**
     * Fire auto-launch coil
     * @param {number} power - 0-1 power level (affects duration)
     */
    autoLaunch(power = 1) {
        const baseDuration = CoilConfig[Coils.C_AUTO_LAUNCH].duration;
        const duration = baseDuration * Math.max(0.5, Math.min(1.5, power));
        this.fire(Coils.C_AUTO_LAUNCH, { duration });
    }

    /**
     * Fire left flipper
     */
    fireLeftFlipper() {
        this.fire(Coils.C_FLIPPER_LEFT_MAIN);
    }

    /**
     * Release left flipper
     */
    releaseLeftFlipper() {
        this.stop(Coils.C_FLIPPER_LEFT_MAIN);
        this.stop(Coils.C_FLIPPER_LEFT_HOLD);
    }

    /**
     * Fire right flipper
     */
    fireRightFlipper() {
        this.fire(Coils.C_FLIPPER_RIGHT_MAIN);
    }

    /**
     * Release right flipper
     */
    releaseRightFlipper() {
        this.stop(Coils.C_FLIPPER_RIGHT_MAIN);
        this.stop(Coils.C_FLIPPER_RIGHT_HOLD);
    }

    /**
     * Fire bumper coil
     * @param {number} bumperId - Which bumper (Coils.C_BUMPER_LEFT/BOTTOM/RIGHT)
     */
    fireBumper(bumperId) {
        this.fire(bumperId);
    }

    /**
     * Fire slingshot coil
     * @param {number} slingId - Which sling (Coils.C_SLING_LEFT/RIGHT)
     */
    fireSlingshot(slingId) {
        this.fire(slingId);
    }

    /**
     * Eject ball from scoop
     * @param {boolean} power - True for power eject
     */
    ejectFromScoop(power = false) {
        this.fire(power ? Coils.C_POWER_SCOOP : Coils.C_SCOOP_EJECT);
    }

    /**
     * Fire satellite magnet (magna-save)
     */
    fireMagnaSave() {
        this.fire(Coils.C_SATELLITE_MAGNET);
    }

    /**
     * Control tank trap door
     * @param {boolean} open
     */
    setTankTrapDoor(open) {
        if (open) {
            this.fire(Coils.C_TANK_TRAP_DOOR);
        } else {
            this.stop(Coils.C_TANK_TRAP_DOOR);
        }
    }

    /**
     * Fire knocker (award sound)
     */
    fireKnocker() {
        this.fire(Coils.C_KNOCKER);
    }

    /**
     * Reset center drop targets
     */
    resetCenterDrops() {
        this.fire(Coils.C_CENTER_DROP_RESET);
    }

    /**
     * Record coil action in history
     * @param {number} coilId
     * @param {string} action
     */
    recordHistory(coilId, action) {
        this.history.push({
            coilId,
            coilName: CoilNames[coilId],
            action,
            timestamp: performance.now()
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Get active coils
     * @returns {number[]}
     */
    getActiveCoils() {
        const active = [];
        this.states.forEach((state, coilId) => {
            if (state) active.push(coilId);
        });
        return active;
    }

    /**
     * Get debug state
     * @returns {Object}
     */
    getDebugState() {
        const active = this.getActiveCoils();
        return {
            activeCount: active.length,
            activeCoils: active.map(c => CoilNames[c]),
            recentFires: this.history.slice(-5)
        };
    }

    /**
     * Stop all coils
     */
    stopAll() {
        this.states.forEach((_, coilId) => {
            this.stop(coilId);
        });
    }

    /**
     * Reset driver
     */
    reset() {
        this.stopAll();
        this.history = [];
    }
}

// Export singleton instance
const solenoidDriver = new SolenoidDriver();
export default solenoidDriver;
export { SolenoidDriver };
