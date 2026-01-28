/**
 * StateMachine.js
 * Hierarchical State Machine for game logic
 * Supports nested states, transitions, and event-driven state changes
 */

import eventBus from './EventBus.js';

/**
 * Base State class
 */
export class State {
    constructor(name, machine) {
        this.name = name;
        this.machine = machine;
        this.parent = null;
        this.children = new Map();
        this.activeChild = null;
        this.data = {};
    }

    /**
     * Called when entering this state
     * @param {Object} params - Parameters passed to the state
     */
    onEnter(params = {}) {
        // Override in subclass
    }

    /**
     * Called when exiting this state
     */
    onExit() {
        // Override in subclass
    }

    /**
     * Called every update tick while in this state
     * @param {number} dt - Delta time in ms
     */
    onUpdate(dt) {
        // Override in subclass
    }

    /**
     * Handle an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {boolean} True if event was handled
     */
    onEvent(event, data) {
        // Override in subclass
        return false;
    }

    /**
     * Add a child state
     * @param {State} state
     */
    addChild(state) {
        state.parent = this;
        this.children.set(state.name, state);
    }

    /**
     * Enter a child state
     * @param {string} stateName
     * @param {Object} params
     */
    enterChild(stateName, params = {}) {
        // Exit current child if any
        if (this.activeChild) {
            this.exitChild();
        }

        const child = this.children.get(stateName);
        if (child) {
            this.activeChild = child;
            child.onEnter(params);
        } else {
            console.warn(`State "${this.name}" has no child "${stateName}"`);
        }
    }

    /**
     * Exit current child state
     */
    exitChild() {
        if (this.activeChild) {
            // Recursively exit children
            if (this.activeChild.activeChild) {
                this.activeChild.exitChild();
            }
            this.activeChild.onExit();
            this.activeChild = null;
        }
    }

    /**
     * Get full state path (e.g., "game.playing.normalPlay")
     * @returns {string}
     */
    getPath() {
        const parts = [this.name];
        let current = this.parent;
        while (current) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.join('.');
    }

    /**
     * Check if this state or any ancestor matches the name
     * @param {string} stateName
     * @returns {boolean}
     */
    isInState(stateName) {
        if (this.name === stateName) return true;
        if (this.activeChild) {
            return this.activeChild.isInState(stateName);
        }
        return false;
    }
}

/**
 * State Machine controller
 */
export class StateMachine {
    constructor() {
        this.states = new Map();
        this.rootState = null;
        this.currentState = null;
        this.history = [];
        this.maxHistory = 20;
        this.transitioning = false;
        this.eventQueue = [];
    }

    /**
     * Add a root-level state
     * @param {State} state
     */
    addState(state) {
        state.machine = this;
        this.states.set(state.name, state);

        // First state added becomes root
        if (!this.rootState) {
            this.rootState = state;
        }
    }

    /**
     * Start the state machine with initial state
     * @param {string} stateName
     * @param {Object} params
     */
    start(stateName, params = {}) {
        const state = this.states.get(stateName);
        if (state) {
            this.currentState = state;
            state.onEnter(params);
            this.recordHistory(stateName);
            console.log(`StateMachine started in state: ${stateName}`);
        } else {
            console.error(`Cannot start StateMachine: state "${stateName}" not found`);
        }
    }

    /**
     * Transition to a new state
     * @param {string} statePath - State path (e.g., "game.playing" or just "attract")
     * @param {Object} params
     */
    transition(statePath, params = {}) {
        if (this.transitioning) {
            // Queue transition if already transitioning
            this.eventQueue.push({ type: 'transition', statePath, params });
            return;
        }

        this.transitioning = true;

        try {
            const pathParts = statePath.split('.');
            const targetStateName = pathParts[0];

            // If transitioning to a different root state
            if (this.currentState && this.currentState.name !== targetStateName) {
                // Exit current state hierarchy
                this.exitCurrentState();

                // Enter new root state
                const newState = this.states.get(targetStateName);
                if (newState) {
                    this.currentState = newState;
                    newState.onEnter(params);

                    // Enter nested states if path specifies them
                    if (pathParts.length > 1) {
                        this.enterNestedState(newState, pathParts.slice(1), params);
                    }

                    this.recordHistory(statePath);
                    console.log(`StateMachine transitioned to: ${statePath}`);
                } else {
                    console.error(`State not found: ${targetStateName}`);
                }
            }
            // Transitioning within current root state
            else if (this.currentState) {
                if (pathParts.length > 1) {
                    this.enterNestedState(this.currentState, pathParts.slice(1), params);
                    this.recordHistory(statePath);
                }
            }
        } finally {
            this.transitioning = false;
            this.processEventQueue();
        }
    }

    /**
     * Enter nested states from a path
     * @param {State} parentState
     * @param {string[]} pathParts
     * @param {Object} params
     */
    enterNestedState(parentState, pathParts, params) {
        let current = parentState;

        for (const part of pathParts) {
            if (current.children.has(part)) {
                current.enterChild(part, params);
                current = current.activeChild;
            } else {
                console.warn(`Child state "${part}" not found in "${current.name}"`);
                break;
            }
        }
    }

    /**
     * Exit current state and all children
     */
    exitCurrentState() {
        if (this.currentState) {
            // Exit all children first
            let state = this.currentState;
            while (state.activeChild) {
                state = state.activeChild;
            }

            // Walk back up, exiting each
            while (state && state !== this.currentState.parent) {
                state.onExit();
                state = state.parent;
            }

            if (this.currentState) {
                this.currentState.onExit();
            }
        }
    }

    /**
     * Send an event to the current state hierarchy
     * @param {string} event
     * @param {*} data
     * @returns {boolean} True if event was handled
     */
    sendEvent(event, data = null) {
        if (!this.currentState) return false;

        // Start from deepest active state and bubble up
        let state = this.currentState;
        while (state.activeChild) {
            state = state.activeChild;
        }

        // Bubble event up until handled
        while (state) {
            if (state.onEvent(event, data)) {
                return true;
            }
            state = state.parent;
        }

        return false;
    }

    /**
     * Update current state hierarchy
     * @param {number} dt
     */
    update(dt) {
        if (!this.currentState) return;

        // Update all active states from root to leaf
        let state = this.currentState;
        const activeStates = [state];

        while (state.activeChild) {
            state = state.activeChild;
            activeStates.push(state);
        }

        for (const s of activeStates) {
            s.onUpdate(dt);
        }
    }

    /**
     * Record state in history
     * @param {string} statePath
     */
    recordHistory(statePath) {
        this.history.push({
            state: statePath,
            timestamp: Date.now()
        });

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Process queued events/transitions
     */
    processEventQueue() {
        while (this.eventQueue.length > 0 && !this.transitioning) {
            const item = this.eventQueue.shift();
            if (item.type === 'transition') {
                this.transition(item.statePath, item.params);
            }
        }
    }

    /**
     * Get current state path
     * @returns {string}
     */
    getCurrentStatePath() {
        if (!this.currentState) return '';

        const parts = [this.currentState.name];
        let state = this.currentState;

        while (state.activeChild) {
            state = state.activeChild;
            parts.push(state.name);
        }

        return parts.join('.');
    }

    /**
     * Check if currently in a specific state
     * @param {string} stateName
     * @returns {boolean}
     */
    isInState(stateName) {
        if (!this.currentState) return false;
        return this.currentState.isInState(stateName);
    }

    /**
     * Get state history
     * @returns {Array}
     */
    getHistory() {
        return [...this.history];
    }
}

// Create singleton instance
const stateMachine = new StateMachine();

export default stateMachine;
