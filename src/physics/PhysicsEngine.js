/**
 * PhysicsEngine.js
 * Arcade-style physics simulation for pinball
 * Prioritizes fun and rule accuracy over realism
 */

import eventBus, { Events } from '../core/EventBus.js';
import { Physics, PlayfieldConfig, Coils } from '../config/HardwareConfig.js';
import { CollisionZones } from './CollisionSystem.js';

/**
 * Ball object
 */
export class Ball {
    constructor(x, y, id = 0) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = Physics.BALL_RADIUS;
        this.active = true;
        this.captured = false;  // True when in scoop, lock, etc.
        this.capturedBy = null;
    }

    /**
     * Update ball position
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.active || this.captured) return;

        // Store previous position for interpolation
        this.prevX = this.x;
        this.prevY = this.y;

        // Apply gravity (positive Y is down)
        this.vy += Physics.GRAVITY;

        // Apply friction
        this.vx *= Physics.BALL_FRICTION;
        this.vy *= Physics.BALL_FRICTION;

        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > Physics.MAX_VELOCITY) {
            const scale = Physics.MAX_VELOCITY / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;
    }

    /**
     * Apply impulse to ball
     * @param {number} ix - X impulse
     * @param {number} iy - Y impulse
     */
    applyImpulse(ix, iy) {
        this.vx += ix;
        this.vy += iy;
    }

    /**
     * Get interpolated position for smooth rendering
     * @param {number} alpha - Interpolation factor (0-1)
     * @returns {{x: number, y: number}}
     */
    getInterpolatedPosition(alpha) {
        return {
            x: this.prevX + (this.x - this.prevX) * alpha,
            y: this.prevY + (this.y - this.prevY) * alpha
        };
    }

    /**
     * Capture ball (in scoop, lock, etc.)
     * @param {string} captor - What captured the ball
     */
    capture(captor) {
        this.captured = true;
        this.capturedBy = captor;
        this.vx = 0;
        this.vy = 0;
    }

    /**
     * Release captured ball
     * @param {number} vx - Release velocity X
     * @param {number} vy - Release velocity Y
     */
    release(vx = 0, vy = 0) {
        this.captured = false;
        this.capturedBy = null;
        this.vx = vx;
        this.vy = vy;
    }
}

/**
 * Flipper object
 */
export class Flipper {
    constructor(x, y, isLeft = true) {
        this.x = x;
        this.y = y;
        this.isLeft = isLeft;
        this.length = Physics.FLIPPER_LENGTH;
        this.width = Physics.FLIPPER_WIDTH;

        // Angles in radians
        this.restAngle = isLeft
            ? (Physics.FLIPPER_REST_ANGLE * Math.PI / 180)
            : (Math.PI - Physics.FLIPPER_REST_ANGLE * Math.PI / 180);

        this.maxAngle = isLeft
            ? ((Physics.FLIPPER_REST_ANGLE + Physics.FLIPPER_MAX_ANGLE) * Math.PI / 180)
            : (Math.PI - (Physics.FLIPPER_REST_ANGLE + Physics.FLIPPER_MAX_ANGLE) * Math.PI / 180);

        this.angle = this.restAngle;
        this.targetAngle = this.restAngle;
        this.angularVelocity = 0;
        this.isPressed = false;
    }

    /**
     * Press flipper button
     */
    press() {
        this.isPressed = true;
        this.targetAngle = this.maxAngle;
    }

    /**
     * Release flipper button
     */
    release() {
        this.isPressed = false;
        this.targetAngle = this.restAngle;
    }

    /**
     * Update flipper position
     * @param {number} dt
     */
    update(dt) {
        const angleDiff = this.targetAngle - this.angle;
        const angularSpeed = Physics.FLIPPER_ANGULAR_VEL * Math.PI / 180;

        if (Math.abs(angleDiff) < 0.01) {
            this.angle = this.targetAngle;
            this.angularVelocity = 0;
        } else if (angleDiff > 0) {
            this.angularVelocity = this.isLeft ? angularSpeed : -angularSpeed;
            this.angle += this.angularVelocity;
            if ((this.isLeft && this.angle > this.targetAngle) ||
                (!this.isLeft && this.angle < this.targetAngle)) {
                this.angle = this.targetAngle;
            }
        } else {
            this.angularVelocity = this.isLeft ? -angularSpeed * 0.6 : angularSpeed * 0.6;
            this.angle += this.angularVelocity;
            if ((this.isLeft && this.angle < this.targetAngle) ||
                (!this.isLeft && this.angle > this.targetAngle)) {
                this.angle = this.targetAngle;
            }
        }
    }

    /**
     * Get flipper tip position
     * @returns {{x: number, y: number}}
     */
    getTipPosition() {
        return {
            x: this.x + Math.cos(this.angle) * this.length,
            y: this.y + Math.sin(this.angle) * this.length
        };
    }

    /**
     * Check if flipper is moving up (for ball acceleration)
     * @returns {boolean}
     */
    isMovingUp() {
        return this.isLeft
            ? this.angularVelocity > 0.1
            : this.angularVelocity < -0.1;
    }
}

/**
 * Main Physics Engine
 */
class PhysicsEngine {
    constructor() {
        this.balls = [];
        this.leftFlipper = null;
        this.rightFlipper = null;
        this.collisionZones = [];

        // Playfield boundaries
        this.bounds = {
            left: 50,
            right: PlayfieldConfig.WIDTH - 50,
            top: 50,
            bottom: PlayfieldConfig.HEIGHT
        };

        // Shooter lane state
        this.plungerPower = 0;
        this.plungerCharging = false;

        // Subscribe to coil events for physical effects
        eventBus.on(Events.COIL_FIRED, this.handleCoilFired.bind(this));
    }

    /**
     * Initialize physics with playfield elements
     */
    initialize() {
        // Create flippers
        this.leftFlipper = new Flipper(
            PlayfieldConfig.LEFT_FLIPPER.x,
            PlayfieldConfig.LEFT_FLIPPER.y,
            true
        );

        this.rightFlipper = new Flipper(
            PlayfieldConfig.RIGHT_FLIPPER.x,
            PlayfieldConfig.RIGHT_FLIPPER.y,
            false
        );

        // Load collision zones
        this.collisionZones = CollisionZones;

        console.log('Physics engine initialized');
    }

    /**
     * Create a new ball
     * @param {number} x
     * @param {number} y
     * @returns {Ball}
     */
    createBall(x, y) {
        const ball = new Ball(x, y, this.balls.length);
        this.balls.push(ball);
        return ball;
    }

    /**
     * Create ball in shooter lane
     * @returns {Ball}
     */
    createBallInShooter() {
        const x = PlayfieldConfig.SHOOTER_LANE.x + PlayfieldConfig.SHOOTER_LANE.width / 2;
        const y = PlayfieldConfig.SHOOTER_LANE.y;
        return this.createBall(x, y);
    }

    /**
     * Remove a ball
     * @param {Ball} ball
     */
    removeBall(ball) {
        const index = this.balls.indexOf(ball);
        if (index > -1) {
            this.balls.splice(index, 1);
        }
    }

    /**
     * Get active (non-captured) balls
     * @returns {Ball[]}
     */
    getActiveBalls() {
        return this.balls.filter(b => b.active && !b.captured);
    }

    /**
     * Update physics simulation
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        // Update flippers
        if (this.leftFlipper) this.leftFlipper.update(dt);
        if (this.rightFlipper) this.rightFlipper.update(dt);

        // Update plunger charging
        if (this.plungerCharging) {
            this.plungerPower = Math.min(1, this.plungerPower + 0.02);
        }

        // Update each ball
        for (const ball of this.balls) {
            if (!ball.active || ball.captured) continue;

            ball.update(dt);

            // Check collisions
            this.checkBoundaryCollision(ball);
            this.checkFlipperCollision(ball, this.leftFlipper);
            this.checkFlipperCollision(ball, this.rightFlipper);
            this.checkZoneCollisions(ball);

            // Check for drain
            this.checkDrain(ball);

            // Emit position update
            eventBus.emit(Events.PHYSICS_BALL_POSITION, {
                ballId: ball.id,
                x: ball.x,
                y: ball.y,
                vx: ball.vx,
                vy: ball.vy
            });
        }
    }

    /**
     * Check boundary collisions
     * @param {Ball} ball
     */
    checkBoundaryCollision(ball) {
        // Left wall
        if (ball.x - ball.radius < this.bounds.left) {
            ball.x = this.bounds.left + ball.radius;
            ball.vx = Math.abs(ball.vx) * Physics.BOUNCE_DAMPING;
        }

        // Right wall (except shooter lane area)
        if (ball.x + ball.radius > this.bounds.right) {
            if (ball.y < PlayfieldConfig.SHOOTER_LANE.y - 100) {
                ball.x = this.bounds.right - ball.radius;
                ball.vx = -Math.abs(ball.vx) * Physics.BOUNCE_DAMPING;
            }
        }

        // Top wall
        if (ball.y - ball.radius < this.bounds.top) {
            ball.y = this.bounds.top + ball.radius;
            ball.vy = Math.abs(ball.vy) * Physics.BOUNCE_DAMPING;
        }
    }

    /**
     * Check flipper collision
     * @param {Ball} ball
     * @param {Flipper} flipper
     */
    checkFlipperCollision(ball, flipper) {
        if (!flipper) return;

        // Simple line-circle collision
        const tip = flipper.getTipPosition();

        // Vector from pivot to tip
        const dx = tip.x - flipper.x;
        const dy = tip.y - flipper.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Normalized direction
        const nx = dx / len;
        const ny = dy / len;

        // Vector from pivot to ball
        const bx = ball.x - flipper.x;
        const by = ball.y - flipper.y;

        // Project ball onto flipper line
        const proj = bx * nx + by * ny;

        // Clamp to flipper length
        const clampedProj = Math.max(0, Math.min(len, proj));

        // Closest point on flipper
        const closestX = flipper.x + nx * clampedProj;
        const closestY = flipper.y + ny * clampedProj;

        // Distance from ball to closest point
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const dist = Math.sqrt(distX * distX + distY * distY);

        // Check collision
        const collisionDist = ball.radius + flipper.width / 2;
        if (dist < collisionDist) {
            // Push ball out
            const overlap = collisionDist - dist;
            const pushX = (distX / dist) * overlap;
            const pushY = (distY / dist) * overlap;
            ball.x += pushX;
            ball.y += pushY;

            // Calculate bounce
            const normalX = distX / dist;
            const normalY = distY / dist;

            // Reflect velocity
            const dot = ball.vx * normalX + ball.vy * normalY;
            ball.vx -= 2 * dot * normalX;
            ball.vy -= 2 * dot * normalY;

            // Apply damping
            ball.vx *= Physics.BOUNCE_DAMPING;
            ball.vy *= Physics.BOUNCE_DAMPING;

            // Add flipper kick if moving up
            if (flipper.isMovingUp()) {
                const kickStrength = Physics.FLIPPER_KICK;
                // Kick direction is perpendicular to flipper, upward
                const kickX = -ny * kickStrength * (flipper.isLeft ? 0.3 : -0.3);
                const kickY = -Math.abs(nx) * kickStrength;
                ball.applyImpulse(kickX, kickY);
            }

            // Emit flipper event
            eventBus.emit(Events.PHYSICS_FLIPPER_MOVE, {
                flipper: flipper.isLeft ? 'left' : 'right',
                hit: true
            });
        }
    }

    /**
     * Check collisions with playfield zones
     * @param {Ball} ball
     */
    checkZoneCollisions(ball) {
        for (const zone of this.collisionZones) {
            if (this.checkZoneCollision(ball, zone)) {
                this.handleZoneHit(ball, zone);
            }
        }
    }

    /**
     * Check single zone collision
     * @param {Ball} ball
     * @param {Object} zone
     * @returns {boolean}
     */
    checkZoneCollision(ball, zone) {
        switch (zone.type) {
            case 'circle':
                return this.checkCircleCollision(ball, zone);
            case 'rect':
                return this.checkRectCollision(ball, zone);
            case 'line':
                return this.checkLineCollision(ball, zone);
            default:
                return false;
        }
    }

    /**
     * Check circle collision
     * @param {Ball} ball
     * @param {Object} zone
     * @returns {boolean}
     */
    checkCircleCollision(ball, zone) {
        const dx = ball.x - zone.x;
        const dy = ball.y - zone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.radius + zone.radius;

        if (dist < minDist) {
            // Push ball out
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect velocity
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx;
            ball.vy -= 2 * dot * ny;
            ball.vx *= Physics.BOUNCE_DAMPING;
            ball.vy *= Physics.BOUNCE_DAMPING;

            // Apply kick if bumper
            if (zone.kicks) {
                ball.vx += nx * zone.kickStrength;
                ball.vy += ny * zone.kickStrength;
            }

            return true;
        }
        return false;
    }

    /**
     * Check rectangle collision
     * @param {Ball} ball
     * @param {Object} zone
     * @returns {boolean}
     */
    checkRectCollision(ball, zone) {
        // Find closest point on rect to ball
        const closestX = Math.max(zone.x, Math.min(ball.x, zone.x + zone.w));
        const closestY = Math.max(zone.y, Math.min(ball.y, zone.y + zone.h));

        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ball.radius) {
            // Push ball out
            const overlap = ball.radius - dist;
            const nx = dist > 0 ? dx / dist : zone.normal?.x || 0;
            const ny = dist > 0 ? dy / dist : zone.normal?.y || -1;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect velocity
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx;
            ball.vy -= 2 * dot * ny;
            ball.vx *= Physics.BOUNCE_DAMPING;
            ball.vy *= Physics.BOUNCE_DAMPING;

            return true;
        }
        return false;
    }

    /**
     * Check line collision
     * @param {Ball} ball
     * @param {Object} zone
     * @returns {boolean}
     */
    checkLineCollision(ball, zone) {
        // Line from (x1,y1) to (x2,y2)
        const dx = zone.x2 - zone.x1;
        const dy = zone.y2 - zone.y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Normalized direction
        const nx = dx / len;
        const ny = dy / len;

        // Vector from line start to ball
        const bx = ball.x - zone.x1;
        const by = ball.y - zone.y1;

        // Project onto line
        const proj = bx * nx + by * ny;
        const clampedProj = Math.max(0, Math.min(len, proj));

        // Closest point
        const closestX = zone.x1 + nx * clampedProj;
        const closestY = zone.y1 + ny * clampedProj;

        // Distance to ball
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < ball.radius) {
            // Push out
            const overlap = ball.radius - dist;
            const pnx = distX / dist;
            const pny = distY / dist;
            ball.x += pnx * overlap;
            ball.y += pny * overlap;

            // Reflect
            const dot = ball.vx * pnx + ball.vy * pny;
            ball.vx -= 2 * dot * pnx;
            ball.vy -= 2 * dot * pny;
            ball.vx *= Physics.BOUNCE_DAMPING;
            ball.vy *= Physics.BOUNCE_DAMPING;

            return true;
        }
        return false;
    }

    /**
     * Handle zone hit (trigger switch, apply effects)
     * @param {Ball} ball
     * @param {Object} zone
     */
    handleZoneHit(ball, zone) {
        // Emit collision event with switch ID
        eventBus.emit(Events.PHYSICS_COLLISION, {
            switchId: zone.switchId,
            zoneType: zone.type,
            zoneName: zone.name,
            position: { x: ball.x, y: ball.y },
            velocity: { x: ball.vx, y: ball.vy }
        });

        // Handle ball capture
        if (zone.capturesBall) {
            ball.capture(zone.name);
            ball.x = zone.x;
            ball.y = zone.y;
        }
    }

    /**
     * Check if ball drained
     * @param {Ball} ball
     */
    checkDrain(ball) {
        const drain = PlayfieldConfig.DRAIN;
        if (ball.x > drain.x &&
            ball.x < drain.x + drain.width &&
            ball.y > drain.y) {
            ball.active = false;
            eventBus.emit(Events.BALL_DRAINED, { ballId: ball.id });
        }
    }

    /**
     * Handle coil fired events
     * @param {Object} data
     */
    handleCoilFired(data) {
        switch (data.coilId) {
            case Coils.C_AUTO_LAUNCH:
                this.launchBall();
                break;
            case Coils.C_TROUGH_EJECT:
                // Ball will be created by game logic
                break;
            case Coils.C_SCOOP_EJECT:
            case Coils.C_POWER_SCOOP:
                this.ejectCapturedBall('scoop', data.coilId === Coils.C_POWER_SCOOP);
                break;
            case Coils.C_BUMPER_LEFT:
            case Coils.C_BUMPER_BOTTOM:
            case Coils.C_BUMPER_RIGHT:
                // Kick already applied in collision
                break;
        }
    }

    /**
     * Launch ball from shooter lane
     */
    launchBall() {
        const shooterBall = this.balls.find(b =>
            b.active &&
            b.x > PlayfieldConfig.SHOOTER_LANE.x - 20 &&
            b.y > PlayfieldConfig.SHOOTER_LANE.y - 50
        );

        if (shooterBall) {
            const power = Physics.LAUNCH_VELOCITY_MIN +
                (Physics.LAUNCH_VELOCITY_MAX - Physics.LAUNCH_VELOCITY_MIN) * this.plungerPower;
            shooterBall.vy = -power;
            shooterBall.vx = -2; // Slight left curve
            this.plungerPower = 0;
        }
    }

    /**
     * Start charging plunger
     */
    startPlungerCharge() {
        this.plungerCharging = true;
        this.plungerPower = 0;
    }

    /**
     * Release plunger
     */
    releasePlunger() {
        this.plungerCharging = false;
        this.launchBall();
    }

    /**
     * Eject captured ball
     * @param {string} captor
     * @param {boolean} power
     */
    ejectCapturedBall(captor, power = false) {
        const ball = this.balls.find(b => b.captured && b.capturedBy === captor);
        if (ball) {
            const ejectSpeed = power ? 15 : 10;
            ball.release(0, -ejectSpeed);
        }
    }

    /**
     * Press left flipper
     */
    pressLeftFlipper() {
        if (this.leftFlipper) {
            this.leftFlipper.press();
        }
    }

    /**
     * Release left flipper
     */
    releaseLeftFlipper() {
        if (this.leftFlipper) {
            this.leftFlipper.release();
        }
    }

    /**
     * Press right flipper
     */
    pressRightFlipper() {
        if (this.rightFlipper) {
            this.rightFlipper.press();
        }
    }

    /**
     * Release right flipper
     */
    releaseRightFlipper() {
        if (this.rightFlipper) {
            this.rightFlipper.release();
        }
    }

    /**
     * Reset physics state
     */
    reset() {
        this.balls = [];
        this.plungerPower = 0;
        this.plungerCharging = false;
        if (this.leftFlipper) this.leftFlipper.release();
        if (this.rightFlipper) this.rightFlipper.release();
    }

    /**
     * Get debug state
     * @returns {Object}
     */
    getDebugState() {
        return {
            ballCount: this.balls.length,
            activeBalls: this.getActiveBalls().length,
            plungerPower: this.plungerPower,
            leftFlipperAngle: this.leftFlipper?.angle,
            rightFlipperAngle: this.rightFlipper?.angle
        };
    }
}

// Export singleton
const physicsEngine = new PhysicsEngine();
export default physicsEngine;
export { PhysicsEngine, Ball, Flipper };
