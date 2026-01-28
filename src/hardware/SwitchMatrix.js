/**
 * SwitchMatrix.js
 * Manages all switch inputs for the pinball machine
 * Converts physical collisions/inputs into switch events
 */

import eventBus, { Events } from '../core/EventBus.js';
import { Switches, SwitchNames, SwitchGroups } from '../config/HardwareConfig.js';

class SwitchMatrix {
    constructor() {
        // Switch states (true = closed/activated)
        this.states = new Map();

        // Debounce timers to prevent rapid re-triggering
        this.debounceTimers = new Map();
        this.debounceTime = 50; // ms

        // Switch activation history for combo detection
        this.history = [];
        this.maxHistoryLength = 20;
        this.historyTimeout = 5000; // Clear history items older than 5s

        // Initialize all switches to open (false)
        Object.values(Switches).forEach(sw => {
            this.states.set(sw, false);
        });

        // Opto switches are inverted (closed when no ball)
        this.optoSwitches = new Set([
            Switches.SW_TROUGH_1,
            Switches.SW_TROUGH_2,
            Switches.SW_TROUGH_3,
            Switches.SW_TROUGH_4,
            Switches.SW_TROUGH_5,
            Switches.SW_TROUGH_STACK,
            Switches.SW_TROUGH_VUK,
            Switches.SW_SATELLITE_HOME,
            Switches.SW_SATELLITE_UP
        ]);

        // Subscribe to physics collision events
        eventBus.on(Events.PHYSICS_COLLISION, this.handleCollision.bind(this));
    }

    /**
     * Activate a switch (ball hit or button pressed)
     * @param {number} switchId
     * @param {Object} data - Optional data about the activation
     */
    activate(switchId, data = {}) {
        // Check debounce
        if (this.debounceTimers.has(switchId)) {
            return;
        }

        const wasActive = this.states.get(switchId);

        if (!wasActive) {
            this.states.set(switchId, true);

            // Record in history
            this.recordHistory(switchId);

            // Emit event
            eventBus.emit(Events.SWITCH_ACTIVATED, {
                switchId,
                switchName: SwitchNames[switchId],
                timestamp: performance.now(),
                ...data
            });

            // Set debounce timer
            this.debounceTimers.set(switchId, setTimeout(() => {
                this.debounceTimers.delete(switchId);
            }, this.debounceTime));
        }
    }

    /**
     * Deactivate a switch
     * @param {number} switchId
     */
    deactivate(switchId) {
        const wasActive = this.states.get(switchId);

        if (wasActive) {
            this.states.set(switchId, false);

            eventBus.emit(Events.SWITCH_DEACTIVATED, {
                switchId,
                switchName: SwitchNames[switchId],
                timestamp: performance.now()
            });
        }
    }

    /**
     * Check if a switch is currently active
     * @param {number} switchId
     * @returns {boolean}
     */
    isActive(switchId) {
        return this.states.get(switchId) === true;
    }

    /**
     * Get all active switches
     * @returns {number[]}
     */
    getActiveSwitches() {
        const active = [];
        this.states.forEach((state, switchId) => {
            if (state) active.push(switchId);
        });
        return active;
    }

    /**
     * Count balls in trough
     * @returns {number}
     */
    getTroughCount() {
        let count = 0;
        for (const sw of SwitchGroups.TROUGH) {
            // For opto switches, ball present = switch open (inverted)
            if (!this.isActive(sw)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if ball is in shooter lane
     * @returns {boolean}
     */
    isBallInShooterLane() {
        return this.isActive(Switches.SW_SHOOTER_LANE);
    }

    /**
     * Handle physics collision events
     * @param {Object} data - Collision data with switchId
     */
    handleCollision(data) {
        if (data.switchId) {
            this.activate(data.switchId, {
                position: data.position,
                velocity: data.velocity
            });

            // Auto-deactivate after a short delay for momentary switches
            if (!this.isHoldSwitch(data.switchId)) {
                setTimeout(() => {
                    this.deactivate(data.switchId);
                }, 100);
            }
        }
    }

    /**
     * Check if switch should stay held (vs momentary)
     * @param {number} switchId
     * @returns {boolean}
     */
    isHoldSwitch(switchId) {
        // Trough optos, locks, and shooter lane are hold switches
        return SwitchGroups.TROUGH.includes(switchId) ||
               switchId === Switches.SW_SHOOTER_LANE ||
               switchId === Switches.SW_LEFT_LOCK ||
               switchId === Switches.SW_TANK_LOCK_1 ||
               switchId === Switches.SW_TANK_LOCK_2 ||
               switchId === Switches.SW_SATELLITE_LOCK;
    }

    /**
     * Record switch activation in history
     * @param {number} switchId
     */
    recordHistory(switchId) {
        const now = performance.now();

        // Add to history
        this.history.push({
            switchId,
            timestamp: now
        });

        // Trim old entries
        this.history = this.history.filter(
            entry => now - entry.timestamp < this.historyTimeout
        );

        // Cap length
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
    }

    /**
     * Check if a switch sequence occurred recently
     * @param {number[]} sequence - Array of switch IDs in order
     * @param {number} windowMs - Time window in ms
     * @returns {boolean}
     */
    checkSequence(sequence, windowMs = 2500) {
        const now = performance.now();
        const relevantHistory = this.history.filter(
            entry => now - entry.timestamp < windowMs
        );

        if (relevantHistory.length < sequence.length) {
            return false;
        }

        // Check if sequence appears in order in history
        let seqIndex = 0;
        for (const entry of relevantHistory) {
            if (entry.switchId === sequence[seqIndex]) {
                seqIndex++;
                if (seqIndex === sequence.length) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get recent switch history
     * @param {number} count
     * @returns {Array}
     */
    getHistory(count = 10) {
        return this.history.slice(-count).map(entry => ({
            ...entry,
            switchName: SwitchNames[entry.switchId]
        }));
    }

    /**
     * Simulate a switch hit (for testing/debugging)
     * @param {number} switchId
     * @param {number} holdTime - How long to hold in ms (0 for momentary)
     */
    simulateHit(switchId, holdTime = 100) {
        this.activate(switchId);

        if (holdTime > 0) {
            setTimeout(() => {
                this.deactivate(switchId);
            }, holdTime);
        }
    }

    /**
     * Reset all switches to default state
     */
    reset() {
        this.states.forEach((_, switchId) => {
            this.states.set(switchId, false);
        });
        this.history = [];
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }

    /**
     * Get switch state summary for debugging
     * @returns {Object}
     */
    getDebugState() {
        const active = this.getActiveSwitches();
        return {
            activeCount: active.length,
            activeSwitches: active.map(sw => SwitchNames[sw]),
            troughCount: this.getTroughCount(),
            ballInShooter: this.isBallInShooterLane(),
            recentHistory: this.getHistory(5)
        };
    }
}

// Export singleton instance
const switchMatrix = new SwitchMatrix();
export default switchMatrix;
export { SwitchMatrix };
