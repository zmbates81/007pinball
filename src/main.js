/**
 * main.js
 * Entry point for GoldenEye 007 Pinball Simulation
 * Initializes all systems and starts the game loop
 */

import eventBus, { Events } from './core/EventBus.js';
import gameLoop from './core/GameLoop.js';
import stateMachine from './core/StateMachine.js';
import physicsEngine from './physics/PhysicsEngine.js';
import switchMatrix from './hardware/SwitchMatrix.js';
import lampMatrix from './hardware/LampMatrix.js';
import solenoidDriver from './hardware/SolenoidDriver.js';
import renderer from './render/Renderer.js';
import gameLogic from './logic/GameLogic.js';

/**
 * Main Application
 */
class PinballApp {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize all game systems
     */
    async initialize() {
        console.log('=================================');
        console.log('GoldenEye 007 Pinball Simulation');
        console.log('=================================');
        console.log('Initializing...');

        try {
            // Initialize renderer first (sets up canvas and input)
            renderer.initialize('game-canvas');

            // Initialize physics engine
            physicsEngine.initialize();

            // Initialize game logic (sets up state machine)
            gameLogic.initialize();

            // Register update callbacks with game loop
            gameLoop.onUpdate((dt) => {
                // Update physics
                physicsEngine.update(dt);

                // Update game logic
                gameLogic.update(dt);
            });

            // Register render callback
            gameLoop.onRender((alpha) => {
                renderer.render(alpha);
                renderer.updateDebugFps(gameLoop.getFPS());
            });

            // Start in attract mode
            stateMachine.start('attract');

            // Enable event logging for debugging
            eventBus.setLogging(true);

            this.initialized = true;
            console.log('Initialization complete!');
            console.log('');
            console.log('Controls:');
            console.log('  [S] or [Enter] - Start Game');
            console.log('  [Z] or [Left Shift] - Left Flipper');
            console.log('  [X] or [Right Shift] - Right Flipper');
            console.log('  [Space] - Launch Ball (hold & release)');
            console.log('  [D] - Toggle Debug Panel');
            console.log('  [C] - Toggle Collision Zones');
            console.log('');
            console.log('Mouse:');
            console.log('  Click bottom-left: Left Flipper');
            console.log('  Click bottom-right: Right Flipper');
            console.log('  Click/drag plunger: Launch Ball');
            console.log('');

        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start the game
     */
    start() {
        if (!this.initialized) {
            console.error('Cannot start: not initialized');
            return;
        }

        // Start the game loop
        gameLoop.start();

        console.log('Game loop started');
    }

    /**
     * Stop the game
     */
    stop() {
        gameLoop.stop();
        console.log('Game loop stopped');
    }

    /**
     * Pause the game
     */
    pause() {
        gameLoop.pause();
    }

    /**
     * Resume the game
     */
    resume() {
        gameLoop.resume();
    }

    /**
     * Get current game state for debugging
     */
    getDebugInfo() {
        return {
            state: stateMachine.getCurrentStatePath(),
            physics: physicsEngine.getDebugState(),
            switches: switchMatrix.getDebugState(),
            lamps: lampMatrix.getDebugState(),
            coils: solenoidDriver.getDebugState(),
            fps: gameLoop.getFPS()
        };
    }
}

// Create app instance
const app = new PinballApp();

// Initialize and start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await app.initialize();
        app.start();
    });
} else {
    // DOM already loaded
    (async () => {
        await app.initialize();
        app.start();
    })();
}

// Expose for debugging
window.pinball = {
    app,
    eventBus,
    gameLoop,
    stateMachine,
    physicsEngine,
    switchMatrix,
    lampMatrix,
    solenoidDriver,
    renderer,
    gameLogic
};

// Export for module usage
export default app;
