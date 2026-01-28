/**
 * LampMatrix.js
 * Manages all lamp outputs for the pinball machine
 * Handles lamp states, blinking patterns, and lamp shows
 */

import eventBus, { Events } from '../core/EventBus.js';
import { Lamps, LampNames, LampState, LampColors, LampGroups } from '../config/HardwareConfig.js';

class LampMatrix {
    constructor() {
        // Lamp states
        this.states = new Map();
        this.targetStates = new Map(); // For smooth transitions

        // Blink timers
        this.blinkPhase = new Map(); // Current on/off phase for blinking lamps
        this.lastBlinkUpdate = 0;

        // Blink intervals (ms)
        this.blinkIntervals = {
            [LampState.BLINK_SLOW]: 500,
            [LampState.BLINK_FAST]: 150,
            [LampState.BLINK_SUPERFAST]: 75
        };

        // Lamp show system
        this.activeShow = null;
        this.showStep = 0;
        this.showTimer = 0;

        // Initialize all lamps to OFF
        Object.values(Lamps).forEach(lamp => {
            this.states.set(lamp, LampState.OFF);
            this.blinkPhase.set(lamp, false);
        });

        // Subscribe to lamp set events
        eventBus.on(Events.LAMP_SET, this.handleLampSet.bind(this));

        // Pre-built lamp shows
        this.shows = this.createLampShows();
    }

    /**
     * Set a lamp state
     * @param {number} lampId
     * @param {number} state - LampState value
     */
    setLamp(lampId, state) {
        const oldState = this.states.get(lampId);

        if (oldState !== state) {
            this.states.set(lampId, state);

            // Reset blink phase when changing state
            if (state === LampState.OFF || state === LampState.ON) {
                this.blinkPhase.set(lampId, state === LampState.ON);
            } else {
                // Start blinking lamps in ON phase
                this.blinkPhase.set(lampId, true);
            }

            eventBus.emit(Events.LAMP_STATE_CHANGED, {
                lampId,
                lampName: LampNames[lampId],
                state,
                color: LampColors[lampId]
            });
        }
    }

    /**
     * Set multiple lamps at once
     * @param {number[]} lampIds
     * @param {number} state
     */
    setLamps(lampIds, state) {
        lampIds.forEach(lampId => this.setLamp(lampId, state));
    }

    /**
     * Set a lamp group
     * @param {string} groupName - Key from LampGroups
     * @param {number} state
     */
    setGroup(groupName, state) {
        const group = LampGroups[groupName];
        if (group) {
            this.setLamps(group, state);
        }
    }

    /**
     * Turn all lamps off
     */
    allOff() {
        this.states.forEach((_, lampId) => {
            this.setLamp(lampId, LampState.OFF);
        });
    }

    /**
     * Turn all lamps on
     */
    allOn() {
        this.states.forEach((_, lampId) => {
            this.setLamp(lampId, LampState.ON);
        });
    }

    /**
     * Get current lamp state
     * @param {number} lampId
     * @returns {number}
     */
    getState(lampId) {
        return this.states.get(lampId);
    }

    /**
     * Check if lamp is currently visually on (accounting for blink phase)
     * @param {number} lampId
     * @returns {boolean}
     */
    isOn(lampId) {
        const state = this.states.get(lampId);

        if (state === LampState.ON) return true;
        if (state === LampState.OFF) return false;

        // For blinking states, check current phase
        return this.blinkPhase.get(lampId);
    }

    /**
     * Update blink phases (call from game loop)
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        // Update blink phases
        this.states.forEach((state, lampId) => {
            if (state >= LampState.BLINK_SLOW) {
                const interval = this.blinkIntervals[state];
                const now = performance.now();

                // Use global time for synchronized blinking
                const phase = Math.floor(now / interval) % 2 === 0;
                this.blinkPhase.set(lampId, phase);
            }
        });

        // Update lamp show if active
        if (this.activeShow) {
            this.updateShow(dt);
        }
    }

    /**
     * Handle lamp set event
     * @param {Object} data
     */
    handleLampSet(data) {
        if (data.lampId !== undefined && data.state !== undefined) {
            this.setLamp(data.lampId, data.state);
        }
    }

    /**
     * Start a lamp show
     * @param {string} showName
     */
    startShow(showName) {
        const show = this.shows[showName];
        if (show) {
            this.activeShow = show;
            this.showStep = 0;
            this.showTimer = 0;
            console.log(`Lamp show started: ${showName}`);
        }
    }

    /**
     * Stop current lamp show
     */
    stopShow() {
        if (this.activeShow) {
            console.log('Lamp show stopped');
            this.activeShow = null;
            this.allOff();
        }
    }

    /**
     * Update lamp show
     * @param {number} dt
     */
    updateShow(dt) {
        if (!this.activeShow) return;

        this.showTimer += dt;

        const currentStep = this.activeShow.steps[this.showStep];
        if (!currentStep) {
            // Show complete - loop or stop
            if (this.activeShow.loop) {
                this.showStep = 0;
                this.showTimer = 0;
            } else {
                this.stopShow();
            }
            return;
        }

        // Execute step if timer reached
        if (this.showTimer >= currentStep.delay) {
            // Turn off previous lamps if specified
            if (currentStep.off) {
                this.setLamps(currentStep.off, LampState.OFF);
            }

            // Turn on/blink new lamps
            if (currentStep.on) {
                this.setLamps(currentStep.on, currentStep.state || LampState.ON);
            }

            this.showStep++;
            this.showTimer = 0;
        }
    }

    /**
     * Create pre-built lamp shows
     * @returns {Object}
     */
    createLampShows() {
        return {
            // Attract mode sweeping pattern
            attract: {
                loop: true,
                steps: [
                    { delay: 0, on: LampGroups.LEFT_BANK, state: LampState.ON },
                    { delay: 100, off: LampGroups.LEFT_BANK, on: LampGroups.BUMPERS },
                    { delay: 100, off: LampGroups.BUMPERS, on: LampGroups.RIGHT_BANK },
                    { delay: 100, off: LampGroups.RIGHT_BANK, on: LampGroups.TOP_LANES },
                    { delay: 100, off: LampGroups.TOP_LANES, on: LampGroups.MODES },
                    { delay: 100, off: LampGroups.MODES, on: LampGroups.CENTER_DROPS },
                    { delay: 100, off: LampGroups.CENTER_DROPS, on: LampGroups.BONUS_MULTIPLIERS },
                    { delay: 100, off: LampGroups.BONUS_MULTIPLIERS },
                    { delay: 200 }
                ]
            },

            // Game start flash
            gameStart: {
                loop: false,
                steps: [
                    { delay: 0, on: Object.values(Lamps), state: LampState.ON },
                    { delay: 150, off: Object.values(Lamps) },
                    { delay: 100, on: Object.values(Lamps) },
                    { delay: 150, off: Object.values(Lamps) },
                    { delay: 100, on: Object.values(Lamps) },
                    { delay: 150, off: Object.values(Lamps) }
                ]
            },

            // Multiball celebration
            multiball: {
                loop: true,
                steps: [
                    { delay: 0, on: LampGroups.LEFT_BANK, state: LampState.ON },
                    { delay: 0, on: LampGroups.RIGHT_BANK, state: LampState.ON },
                    { delay: 75, off: LampGroups.LEFT_BANK },
                    { delay: 0, off: LampGroups.RIGHT_BANK },
                    { delay: 0, on: LampGroups.BUMPERS },
                    { delay: 0, on: LampGroups.TOP_LANES },
                    { delay: 75, off: LampGroups.BUMPERS },
                    { delay: 0, off: LampGroups.TOP_LANES }
                ]
            },

            // Jackpot celebration
            jackpot: {
                loop: false,
                steps: [
                    { delay: 0, on: [Lamps.L_JACKPOT], state: LampState.BLINK_SUPERFAST },
                    { delay: 0, on: Object.values(Lamps).filter(l => l !== Lamps.L_JACKPOT), state: LampState.BLINK_FAST },
                    { delay: 2000, off: Object.values(Lamps) }
                ]
            },

            // Mode complete
            modeComplete: {
                loop: false,
                steps: [
                    { delay: 0, on: LampGroups.MODES, state: LampState.ON },
                    { delay: 200, off: LampGroups.MODES },
                    { delay: 100, on: LampGroups.MODES },
                    { delay: 200, off: LampGroups.MODES },
                    { delay: 100, on: LampGroups.MODES },
                    { delay: 200, off: LampGroups.MODES }
                ]
            }
        };
    }

    /**
     * Get all lamp states for rendering
     * @returns {Map}
     */
    getAllStates() {
        const result = new Map();
        this.states.forEach((state, lampId) => {
            result.set(lampId, {
                state,
                isOn: this.isOn(lampId),
                color: LampColors[lampId]
            });
        });
        return result;
    }

    /**
     * Get debug state
     * @returns {Object}
     */
    getDebugState() {
        const onLamps = [];
        const blinkingLamps = [];

        this.states.forEach((state, lampId) => {
            if (state === LampState.ON) {
                onLamps.push(LampNames[lampId]);
            } else if (state >= LampState.BLINK_SLOW) {
                blinkingLamps.push(LampNames[lampId]);
            }
        });

        return {
            onCount: onLamps.length,
            blinkingCount: blinkingLamps.length,
            activeShow: this.activeShow ? 'active' : 'none'
        };
    }

    /**
     * Reset all lamps
     */
    reset() {
        this.stopShow();
        this.allOff();
    }
}

// Export singleton instance
const lampMatrix = new LampMatrix();
export default lampMatrix;
export { LampMatrix };
