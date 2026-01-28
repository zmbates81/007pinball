/**
 * EventBus.js
 * Centralized Pub/Sub event system for decoupled communication
 * All game components communicate through this bus
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.eventLog = [];
        this.logEnabled = false;
        this.maxLogSize = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (supports wildcards: 'switch.*')
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        // Log event if logging enabled
        if (this.logEnabled) {
            this.log(event, data);
        }

        // Exact match listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data, event);
                } catch (err) {
                    console.error(`EventBus error in handler for "${event}":`, err);
                }
            });
        }

        // Once listeners
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).forEach(callback => {
                try {
                    callback(data, event);
                } catch (err) {
                    console.error(`EventBus error in once handler for "${event}":`, err);
                }
            });
            this.onceListeners.delete(event);
        }

        // Wildcard listeners (e.g., 'switch.*' matches 'switch.activated')
        this.listeners.forEach((callbacks, pattern) => {
            if (pattern.includes('*') && this.matchWildcard(pattern, event)) {
                callbacks.forEach(callback => {
                    try {
                        callback(data, event);
                    } catch (err) {
                        console.error(`EventBus error in wildcard handler for "${pattern}":`, err);
                    }
                });
            }
        });
    }

    /**
     * Check if event matches wildcard pattern
     * @param {string} pattern - Pattern with wildcards (e.g., 'switch.*')
     * @param {string} event - Event name to match
     * @returns {boolean}
     */
    matchWildcard(pattern, event) {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(event);
    }

    /**
     * Log an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    log(event, data) {
        const entry = {
            timestamp: performance.now(),
            event,
            data
        };

        this.eventLog.push(entry);

        // Trim log if too large
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog.shift();
        }
    }

    /**
     * Enable/disable event logging
     * @param {boolean} enabled
     */
    setLogging(enabled) {
        this.logEnabled = enabled;
    }

    /**
     * Get event log
     * @param {string} [filter] - Optional event name filter
     * @returns {Array}
     */
    getLog(filter = null) {
        if (filter) {
            return this.eventLog.filter(entry =>
                entry.event === filter || this.matchWildcard(filter, entry.event)
            );
        }
        return [...this.eventLog];
    }

    /**
     * Clear event log
     */
    clearLog() {
        this.eventLog = [];
    }

    /**
     * Remove all listeners
     */
    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    /**
     * Get count of listeners for an event
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).size;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).size;
        }
        return count;
    }
}

// Event name constants for type safety
export const Events = {
    // Switch events
    SWITCH_ACTIVATED: 'switch.activated',
    SWITCH_DEACTIVATED: 'switch.deactivated',

    // Lamp events
    LAMP_SET: 'lamp.set',
    LAMP_STATE_CHANGED: 'lamp.stateChanged',

    // Coil events
    COIL_FIRE: 'coil.fire',
    COIL_FIRED: 'coil.fired',
    COIL_STOP: 'coil.stop',

    // Game state events
    GAME_START: 'game.start',
    GAME_OVER: 'game.over',
    BALL_LAUNCH: 'game.ballLaunch',
    BALL_DRAINED: 'game.ballDrained',
    BALL_SAVED: 'game.ballSaved',
    BALL_ENDED: 'game.ballEnded',

    // Player events
    SCORE_CHANGED: 'player.scoreChanged',
    BONUS_AWARDED: 'player.bonusAwarded',
    EXTRA_BALL: 'player.extraBall',

    // Mode events
    MODE_START: 'mode.start',
    MODE_END: 'mode.end',
    MODE_PROGRESS: 'mode.progress',

    // Multiball events
    MULTIBALL_START: 'multiball.start',
    MULTIBALL_END: 'multiball.end',
    MULTIBALL_JACKPOT: 'multiball.jackpot',

    // Physics events
    PHYSICS_COLLISION: 'physics.collision',
    PHYSICS_BALL_POSITION: 'physics.ballPosition',
    PHYSICS_FLIPPER_MOVE: 'physics.flipperMove',

    // Input events
    INPUT_FLIPPER_LEFT: 'input.flipperLeft',
    INPUT_FLIPPER_RIGHT: 'input.flipperRight',
    INPUT_LAUNCH: 'input.launch',
    INPUT_START: 'input.start',

    // System events
    SYSTEM_TICK: 'system.tick',
    SYSTEM_RENDER: 'system.render',
    SYSTEM_PAUSE: 'system.pause',
    SYSTEM_RESUME: 'system.resume'
};

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;
export { EventBus };
