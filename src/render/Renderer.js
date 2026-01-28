/**
 * Renderer.js
 * Main rendering system for the pinball game
 * Handles Canvas drawing, input, and visual effects
 */

import eventBus, { Events } from '../core/EventBus.js';
import { PlayfieldConfig, Lamps, LampColors, LampState, Switches } from '../config/HardwareConfig.js';
import { CollisionZones, getZoneBySwitchId } from '../physics/CollisionSystem.js';
import lampMatrix from '../hardware/LampMatrix.js';
import physicsEngine from '../physics/PhysicsEngine.js';

class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = PlayfieldConfig.WIDTH;
        this.height = PlayfieldConfig.HEIGHT;

        // Input state
        this.keys = {};
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        // Visual settings
        this.showDebug = false;
        this.showCollisionZones = false;

        // Interpolation data
        this.lastBallPositions = new Map();

        // Lamp positions for rendering
        this.lampPositions = this.generateLampPositions();

        // Plunger visual state
        this.plungerY = 0;
        this.plungerMaxPull = 80;
    }

    /**
     * Initialize renderer with canvas element
     * @param {string} canvasId
     */
    initialize(canvasId = 'game-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Set up input handlers
        this.setupInputHandlers();

        console.log('Renderer initialized');
    }

    /**
     * Set up keyboard and mouse input handlers
     */
    setupInputHandlers() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (this.keys[e.code]) return; // Prevent key repeat
            this.keys[e.code] = true;
            this.handleKeyDown(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.handleKeyUp(e.code);
        });

        // Mouse
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.updateMousePosition(e);
            this.handleMouseDown(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
            this.handleMouseUp(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
            if (this.mouseDown) {
                this.handleMouseDrag(e);
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.mouseDown) {
                this.handleMouseUp({ button: 0 });
            }
            this.mouseDown = false;
        });

        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Update mouse position relative to canvas
     * @param {MouseEvent} e
     */
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }

    /**
     * Handle key down
     * @param {string} code
     */
    handleKeyDown(code) {
        switch (code) {
            case 'KeyZ':
            case 'ShiftLeft':
                eventBus.emit(Events.INPUT_FLIPPER_LEFT, { pressed: true });
                physicsEngine.pressLeftFlipper();
                break;
            case 'KeyX':
            case 'ShiftRight':
                eventBus.emit(Events.INPUT_FLIPPER_RIGHT, { pressed: true });
                physicsEngine.pressRightFlipper();
                break;
            case 'Space':
                eventBus.emit(Events.INPUT_LAUNCH, { pressed: true });
                physicsEngine.startPlungerCharge();
                break;
            case 'KeyS':
            case 'Enter':
                eventBus.emit(Events.INPUT_START, { pressed: true });
                break;
            case 'KeyD':
                this.showDebug = !this.showDebug;
                document.getElementById('debug-panel')?.classList.toggle('visible', this.showDebug);
                break;
            case 'KeyC':
                this.showCollisionZones = !this.showCollisionZones;
                break;
        }
    }

    /**
     * Handle key up
     * @param {string} code
     */
    handleKeyUp(code) {
        switch (code) {
            case 'KeyZ':
            case 'ShiftLeft':
                eventBus.emit(Events.INPUT_FLIPPER_LEFT, { pressed: false });
                physicsEngine.releaseLeftFlipper();
                break;
            case 'KeyX':
            case 'ShiftRight':
                eventBus.emit(Events.INPUT_FLIPPER_RIGHT, { pressed: false });
                physicsEngine.releaseRightFlipper();
                break;
            case 'Space':
                eventBus.emit(Events.INPUT_LAUNCH, { pressed: false });
                physicsEngine.releasePlunger();
                break;
        }
    }

    /**
     * Handle mouse down
     * @param {MouseEvent} e
     */
    handleMouseDown(e) {
        // Check if clicking on flipper zones
        if (this.mouseY > 900) {
            if (this.mouseX < this.width / 2) {
                eventBus.emit(Events.INPUT_FLIPPER_LEFT, { pressed: true });
                physicsEngine.pressLeftFlipper();
            } else {
                eventBus.emit(Events.INPUT_FLIPPER_RIGHT, { pressed: true });
                physicsEngine.pressRightFlipper();
            }
        }

        // Check if clicking on plunger area
        if (this.mouseX > 720 && this.mouseY > 950) {
            physicsEngine.startPlungerCharge();
        }
    }

    /**
     * Handle mouse up
     * @param {MouseEvent} e
     */
    handleMouseUp(e) {
        // Release flippers
        eventBus.emit(Events.INPUT_FLIPPER_LEFT, { pressed: false });
        eventBus.emit(Events.INPUT_FLIPPER_RIGHT, { pressed: false });
        physicsEngine.releaseLeftFlipper();
        physicsEngine.releaseRightFlipper();

        // Release plunger
        if (physicsEngine.plungerCharging) {
            physicsEngine.releasePlunger();
        }
    }

    /**
     * Handle mouse drag
     * @param {MouseEvent} e
     */
    handleMouseDrag(e) {
        // Plunger pull
        if (this.mouseX > 720 && physicsEngine.plungerCharging) {
            this.plungerY = Math.min(this.plungerMaxPull, Math.max(0, this.mouseY - 950));
        }
    }

    /**
     * Generate lamp positions based on playfield layout
     * @returns {Map}
     */
    generateLampPositions() {
        const positions = new Map();

        // Mode lamps (top area)
        const modeLamps = [
            Lamps.L_MODE_RUNWAY, Lamps.L_MODE_FACILITY, Lamps.L_MODE_SILO, Lamps.L_MODE_TRAIN,
            Lamps.L_MODE_STATUE, Lamps.L_MODE_ARCHIVES, Lamps.L_MODE_TANK, Lamps.L_MODE_CRADLE
        ];
        modeLamps.forEach((lamp, i) => {
            positions.set(lamp, { x: 180 + i * 60, y: 130 });
        });

        // Top lane lamps
        positions.set(Lamps.L_TOP_LANE_L, { x: 230, y: 95 });
        positions.set(Lamps.L_TOP_LANE_M, { x: 330, y: 85 });
        positions.set(Lamps.L_TOP_LANE_R, { x: 430, y: 95 });

        // Bumper lamps
        positions.set(Lamps.L_BUMPER_L, { x: 250, y: 280 });
        positions.set(Lamps.L_BUMPER_B, { x: 350, y: 350 });
        positions.set(Lamps.L_BUMPER_R, { x: 450, y: 280 });

        // Left target bank lamps
        positions.set(Lamps.L_LEFT_BANK_1, { x: 95, y: 515 });
        positions.set(Lamps.L_LEFT_BANK_2, { x: 95, y: 470 });
        positions.set(Lamps.L_LEFT_BANK_3, { x: 95, y: 425 });
        positions.set(Lamps.L_LEFT_BANK_4, { x: 95, y: 380 });
        positions.set(Lamps.L_LEFT_BANK_5, { x: 95, y: 335 });

        // Right target bank lamps
        positions.set(Lamps.L_RIGHT_BANK_1, { x: 705, y: 515 });
        positions.set(Lamps.L_RIGHT_BANK_2, { x: 705, y: 470 });
        positions.set(Lamps.L_RIGHT_BANK_3, { x: 705, y: 425 });
        positions.set(Lamps.L_RIGHT_BANK_4, { x: 705, y: 380 });
        positions.set(Lamps.L_RIGHT_BANK_5, { x: 705, y: 335 });

        // Center drops
        positions.set(Lamps.L_CENTER_DROP_1, { x: 360, y: 215 });
        positions.set(Lamps.L_CENTER_DROP_2, { x: 410, y: 215 });
        positions.set(Lamps.L_CENTER_DROP_3, { x: 460, y: 215 });

        // Scoop lamp
        positions.set(Lamps.L_SCOOP, { x: 150, y: 530 });

        // Ramp arrows
        positions.set(Lamps.L_LEFT_RAMP_ARROW, { x: 145, y: 670 });
        positions.set(Lamps.L_RIGHT_RAMP_ARROW, { x: 645, y: 670 });

        // Satellite area
        positions.set(Lamps.L_SATELLITE, { x: 400, y: 165 });
        positions.set(Lamps.L_SATELLITE_ENABLED, { x: 420, y: 165 });

        // Outlane/inlane lamps
        positions.set(Lamps.L_LEFT_OUTLANE, { x: 115, y: 1020 });
        positions.set(Lamps.L_RIGHT_OUTLANE, { x: 685, y: 1020 });
        positions.set(Lamps.L_LEFT_RETURN, { x: 175, y: 995 });
        positions.set(Lamps.L_RIGHT_RETURN, { x: 625, y: 995 });

        // Bonus multipliers (near bottom)
        positions.set(Lamps.L_BONUS_1X, { x: 300, y: 850 });
        positions.set(Lamps.L_BONUS_2X, { x: 340, y: 850 });
        positions.set(Lamps.L_BONUS_3X, { x: 380, y: 850 });
        positions.set(Lamps.L_BONUS_4X, { x: 420, y: 850 });
        positions.set(Lamps.L_BONUS_5X, { x: 460, y: 850 });

        // Special lamps
        positions.set(Lamps.L_JACKPOT, { x: 400, y: 250 });
        positions.set(Lamps.L_MULTIBALL_LIT, { x: 400, y: 400 });
        positions.set(Lamps.L_BALL_SAVE, { x: 400, y: 1100 });
        positions.set(Lamps.L_SHOOT_AGAIN, { x: 400, y: 1130 });
        positions.set(Lamps.L_EXTRA_BALL, { x: 200, y: 800 });
        positions.set(Lamps.L_LOCK_LIT, { x: 150, y: 680 });
        positions.set(Lamps.L_START_BUTTON, { x: 50, y: 1150 });

        // Tank area
        positions.set(Lamps.L_TANK_ENTRANCE, { x: 600, y: 565 });
        positions.set(Lamps.L_RIGHT_LOCK, { x: 640, y: 510 });

        return positions;
    }

    /**
     * Render frame
     * @param {number} alpha - Interpolation factor
     */
    render(alpha) {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.fillStyle = '#1a3a1a'; // Dark green playfield
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw layers in order
        this.drawPlayfield();
        this.drawLamps();
        this.drawCollisionZones();
        this.drawFlippers(alpha);
        this.drawBalls(alpha);
        this.drawPlunger();
        this.drawUI();

        if (this.showDebug) {
            this.drawDebugInfo();
        }
    }

    /**
     * Draw static playfield elements
     */
    drawPlayfield() {
        const ctx = this.ctx;

        // Playfield border
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 8;
        ctx.strokeRect(46, 46, this.width - 92, this.height - 92);

        // Shooter lane
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(720, 850, 50, 350);

        // Drain area
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(
            PlayfieldConfig.DRAIN.x,
            PlayfieldConfig.DRAIN.y,
            PlayfieldConfig.DRAIN.width,
            PlayfieldConfig.DRAIN.height
        );

        // Draw bumpers
        this.drawBumper(250, 280, '#FFD700');
        this.drawBumper(350, 350, '#FFD700');
        this.drawBumper(450, 280, '#FFD700');

        // Draw target banks
        this.drawTargetBank(70, 320, 5, true);   // Left bank
        this.drawTargetBank(712, 320, 5, false); // Right bank

        // Draw center drop targets
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(340 + i * 50, 200, 40, 15);
        }

        // Draw slingshots
        this.drawSlingshot(180, 950, 230, 880, true);
        this.drawSlingshot(620, 950, 570, 880, false);

        // Draw scoop
        ctx.fillStyle = '#9932CC';
        ctx.beginPath();
        ctx.arc(150, 550, 25, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(150, 550, 18, 0, Math.PI);
        ctx.fill();

        // Draw ramp entrances
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(120, 650, 50, 20);
        ctx.fillRect(370, 450, 60, 20);
        ctx.fillRect(620, 650, 50, 20);

        // Draw top lanes
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(200, 60, 60, 50);
        ctx.fillRect(300, 50, 60, 50);
        ctx.fillRect(400, 60, 60, 50);

        // Draw outlanes/inlanes
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(100, 1000, 30, 80);  // Left outlane
        ctx.fillRect(670, 1000, 30, 80); // Right outlane
        ctx.fillRect(160, 980, 30, 50);  // Left inlane
        ctx.fillRect(610, 980, 30, 50);  // Right inlane

        // Tank area
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(570, 450, 100, 120);
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 3;
        ctx.strokeRect(570, 450, 100, 120);

        // Satellite area (top center)
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.arc(400, 150, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a3a1a';
        ctx.beginPath();
        ctx.arc(400, 150, 25, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SATELLITE', 400, 155);
        ctx.fillText('SCOOP', 150, 580);
        ctx.fillText('TANK', 620, 530);
    }

    /**
     * Draw a bumper
     */
    drawBumper(x, y, color) {
        const ctx = this.ctx;
        // Outer ring
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
        // Inner cap
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 5, y - 5, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw a target bank
     */
    drawTargetBank(x, y, count, isLeft) {
        const ctx = this.ctx;
        for (let i = 0; i < count; i++) {
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(x, y + i * 45, 18, 35);
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y + i * 45, 18, 35);
        }
    }

    /**
     * Draw a slingshot
     */
    drawSlingshot(x1, y1, x2, y2, isLeft) {
        const ctx = this.ctx;
        ctx.fillStyle = '#4444FF';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(isLeft ? x1 + 50 : x1 - 50, y1 - 30);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2222AA';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Draw all lamps
     */
    drawLamps() {
        const ctx = this.ctx;
        const lampStates = lampMatrix.getAllStates();

        lampStates.forEach((lampData, lampId) => {
            const pos = this.lampPositions.get(lampId);
            if (!pos) return;

            ctx.save();

            if (lampData.isOn) {
                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = lampData.color;
                ctx.fillStyle = lampData.color;
            } else {
                ctx.fillStyle = '#333';
            }

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    /**
     * Draw collision zones (debug)
     */
    drawCollisionZones() {
        if (!this.showCollisionZones) return;

        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;

        for (const zone of CollisionZones) {
            switch (zone.type) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'rect':
                    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
                    break;
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(zone.x1, zone.y1);
                    ctx.lineTo(zone.x2, zone.y2);
                    ctx.stroke();
                    break;
            }
        }
    }

    /**
     * Draw flippers
     */
    drawFlippers(alpha) {
        const ctx = this.ctx;
        const leftFlipper = physicsEngine.leftFlipper;
        const rightFlipper = physicsEngine.rightFlipper;

        if (leftFlipper) {
            this.drawFlipper(leftFlipper, '#FF4444');
        }
        if (rightFlipper) {
            this.drawFlipper(rightFlipper, '#FF4444');
        }
    }

    /**
     * Draw single flipper
     */
    drawFlipper(flipper, color) {
        const ctx = this.ctx;
        const tip = flipper.getTipPosition();

        ctx.save();

        // Draw flipper body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#AA2222';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(flipper.x, flipper.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineWidth = flipper.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Pivot point
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(flipper.x, flipper.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw all balls
     */
    drawBalls(alpha) {
        const ctx = this.ctx;

        for (const ball of physicsEngine.balls) {
            if (!ball.active) continue;

            const pos = ball.getInterpolatedPosition(alpha);

            // Ball shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(pos.x + 3, pos.y + 3, ball.radius, ball.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ball body
            const gradient = ctx.createRadialGradient(
                pos.x - 3, pos.y - 3, 0,
                pos.x, pos.y, ball.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#c0c0c0');
            gradient.addColorStop(1, '#808080');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(pos.x - 3, pos.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw plunger
     */
    drawPlunger() {
        const ctx = this.ctx;
        const baseY = 1100;
        const pullAmount = physicsEngine.plungerPower * this.plungerMaxPull;

        // Plunger track
        ctx.fillStyle = '#333';
        ctx.fillRect(735, 950, 20, 150);

        // Plunger handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(730, baseY + pullAmount, 30, 40);

        // Plunger tip
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(737, baseY - 20 + pullAmount, 16, 25);

        // Power indicator
        if (physicsEngine.plungerCharging) {
            ctx.fillStyle = `rgb(${255 * physicsEngine.plungerPower}, ${255 * (1 - physicsEngine.plungerPower)}, 0)`;
            ctx.fillRect(770, baseY - physicsEngine.plungerPower * 80, 10, physicsEngine.plungerPower * 80);
        }
    }

    /**
     * Draw UI elements
     */
    drawUI() {
        // Flipper click zones (subtle indicators)
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(50, 900, this.width / 2 - 50, 300);
        ctx.fillRect(this.width / 2, 900, this.width / 2 - 50, 300);

        // Flipper labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LEFT FLIPPER (Z)', 200, 1180);
        ctx.fillText('RIGHT FLIPPER (X)', 600, 1180);
    }

    /**
     * Draw debug information
     */
    drawDebugInfo() {
        const debugState = document.getElementById('debug-state');
        const debugBalls = document.getElementById('debug-balls');
        const debugSwitch = document.getElementById('debug-switch');
        const debugFps = document.getElementById('debug-fps');

        if (debugState) {
            debugState.textContent = '-'; // Will be set by game logic
        }
        if (debugBalls) {
            debugBalls.textContent = physicsEngine.balls.filter(b => b.active).length;
        }
        if (debugFps) {
            // FPS set elsewhere
        }
    }

    /**
     * Update score display
     * @param {number} score
     */
    updateScore(score) {
        const scoreEl = document.getElementById('score-value');
        if (scoreEl) {
            scoreEl.textContent = score.toLocaleString();
        }
    }

    /**
     * Update ball display
     * @param {number} ballNum
     */
    updateBallNumber(ballNum) {
        const ballEl = document.getElementById('ball-number');
        if (ballEl) {
            ballEl.textContent = ballNum;
        }
    }

    /**
     * Update debug state display
     * @param {string} state
     */
    updateDebugState(state) {
        const el = document.getElementById('debug-state');
        if (el) el.textContent = state;
    }

    /**
     * Update debug switch display
     * @param {string} switchName
     */
    updateDebugSwitch(switchName) {
        const el = document.getElementById('debug-switch');
        if (el) el.textContent = switchName;
    }

    /**
     * Update debug FPS display
     * @param {number} fps
     */
    updateDebugFps(fps) {
        const el = document.getElementById('debug-fps');
        if (el) el.textContent = fps;
    }
}

// Export singleton
const renderer = new Renderer();
export default renderer;
export { Renderer };
