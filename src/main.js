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

console.log('Modules loaded successfully');

/**
 * Main Application
 */
class PinballApp {
    constructor() {
        this.initialized = false;
        console.log('PinballApp constructor called');
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
            console.log('1. Initializing renderer...');
            renderer.initialize('game-canvas');
            console.log('   Renderer initialized, ctx:', renderer.ctx ? 'OK' : 'NULL');

            // Initialize physics engine
            console.log('2. Initializing physics engine...');
            physicsEngine.initialize();
            console.log('   Physics initialized, flippers:',
                physicsEngine.leftFlipper ? 'OK' : 'NULL');

            // Initialize game logic (sets up state machine)
            console.log('3. Initializing game logic...');
            gameLogic.initialize();
            console.log('   Game logic initialized');

            // Register update callbacks with game loop
            console.log('4. Registering game loop callbacks...');
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
            console.log('   Callbacks registered');

            // Start in attract mode
            console.log('5. Starting state machine in attract mode...');
            stateMachine.start('attract');
            console.log('   State machine started');

            // Disable verbose event logging (enable with eventBus.setLogging(true) in console)
            eventBus.setLogging(false);

            this.initialized = true;

            // Update loading status
            const loadingEl = document.getElementById('loading-status');
            if (loadingEl) {
                loadingEl.textContent = 'Ready! Press S to start';
                loadingEl.style.color = '#0f0';
            }

            console.log('');
            console.log('=== Initialization complete! ===');
            console.log('');
            console.log('Controls:');
            console.log('  [S] or [Enter] - Start Game');
            console.log('  [Z] or [Left Shift] - Left Flipper');
            console.log('  [X] or [Right Shift] - Right Flipper');
            console.log('  [Space] - Launch Ball (hold & release)');
            console.log('  [D] - Toggle Debug Panel');
            console.log('  [C] - Toggle Collision Zones');
            console.log('');

        } catch (error) {
            console.error('Initialization failed:', error);
            console.error(error.stack);

            // Update loading status with error
            const loadingEl = document.getElementById('loading-status');
            if (loadingEl) {
                loadingEl.textContent = 'Error: ' + error.message;
                loadingEl.style.color = '#f00';
            }

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
