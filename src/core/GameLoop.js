/**
 * GameLoop.js
 * Main game loop running at 60fps
 * Handles tick (logic update) and render phases separately
 */

import eventBus, { Events } from './EventBus.js';

class GameLoop {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.frameId = null;

        // Fixed timestep for physics (60 updates per second)
        this.fixedDeltaTime = 1000 / 60;  // ~16.67ms
        this.maxAccumulator = this.fixedDeltaTime * 5;  // Prevent spiral of death

        // FPS tracking
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFPS = 0;

        // Update callbacks
        this.updateCallbacks = [];
        this.renderCallbacks = [];
        this.lateUpdateCallbacks = [];

        // Bind the loop function
        this.loop = this.loop.bind(this);
    }

    /**
     * Register an update callback (called at fixed timestep)
     * @param {Function} callback - Function to call with delta time
     * @returns {Function} Unregister function
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
        return () => {
            const index = this.updateCallbacks.indexOf(callback);
            if (index > -1) {
                this.updateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Register a render callback (called every frame)
     * @param {Function} callback - Function to call with interpolation alpha
     * @returns {Function} Unregister function
     */
    onRender(callback) {
        this.renderCallbacks.push(callback);
        return () => {
            const index = this.renderCallbacks.indexOf(callback);
            if (index > -1) {
                this.renderCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Register a late update callback (called after physics, before render)
     * @param {Function} callback
     * @returns {Function} Unregister function
     */
    onLateUpdate(callback) {
        this.lateUpdateCallbacks.push(callback);
        return () => {
            const index = this.lateUpdateCallbacks.indexOf(callback);
            if (index > -1) {
                this.lateUpdateCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.frameId = requestAnimationFrame(this.loop);

        console.log('GameLoop started');
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        console.log('GameLoop stopped');
    }

    /**
     * Pause the game loop (stops updates, continues rendering)
     */
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            eventBus.emit(Events.SYSTEM_PAUSE);
            console.log('GameLoop paused');
        }
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now();
            this.accumulator = 0;
            eventBus.emit(Events.SYSTEM_RESUME);
            console.log('GameLoop resumed');
        }
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Main loop function
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        // Schedule next frame immediately
        this.frameId = requestAnimationFrame(this.loop);

        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update FPS counter
        this.updateFPS(deltaTime);

        // Skip if paused (but still render)
        if (!this.isPaused) {
            // Add to accumulator (capped to prevent spiral of death)
            this.accumulator += Math.min(deltaTime, this.maxAccumulator);

            // Fixed timestep updates
            while (this.accumulator >= this.fixedDeltaTime) {
                this.update(this.fixedDeltaTime);
                this.accumulator -= this.fixedDeltaTime;
            }

            // Late update (after all physics steps)
            this.lateUpdate();
        }

        // Calculate interpolation alpha for smooth rendering
        const alpha = this.accumulator / this.fixedDeltaTime;

        // Render
        this.render(alpha);
    }

    /**
     * Update game logic (fixed timestep)
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        // Emit tick event
        eventBus.emit(Events.SYSTEM_TICK, { dt });

        // Call update callbacks
        for (const callback of this.updateCallbacks) {
            try {
                callback(dt);
            } catch (err) {
                console.error('Error in update callback:', err);
            }
        }
    }

    /**
     * Late update (called once per frame after all physics updates)
     */
    lateUpdate() {
        for (const callback of this.lateUpdateCallbacks) {
            try {
                callback();
            } catch (err) {
                console.error('Error in late update callback:', err);
            }
        }
    }

    /**
     * Render frame
     * @param {number} alpha - Interpolation factor (0-1)
     */
    render(alpha) {
        // Emit render event
        eventBus.emit(Events.SYSTEM_RENDER, { alpha });

        // Call render callbacks
        for (const callback of this.renderCallbacks) {
            try {
                callback(alpha);
            } catch (err) {
                console.error('Error in render callback:', err);
            }
        }
    }

    /**
     * Update FPS counter
     * @param {number} deltaTime
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        this.fpsTime += deltaTime;

        if (this.fpsTime >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;
        }
    }

    /**
     * Get current FPS
     * @returns {number}
     */
    getFPS() {
        return this.currentFPS;
    }

    /**
     * Check if loop is running
     * @returns {boolean}
     */
    getIsRunning() {
        return this.isRunning;
    }

    /**
     * Check if loop is paused
     * @returns {boolean}
     */
    getIsPaused() {
        return this.isPaused;
    }
}

// Create singleton instance
const gameLoop = new GameLoop();

export default gameLoop;
export { GameLoop };
