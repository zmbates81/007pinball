/**
 * GameLogic.js
 * Main game rules controller
 * Implements GoldenEye 007 pinball rules using state machine
 */

import eventBus, { Events } from '../core/EventBus.js';
import stateMachine, { State } from '../core/StateMachine.js';
import {
    Switches, SwitchGroups, SwitchNames,
    Lamps, LampState, LampGroups,
    Coils, Scoring, GameSettings
} from '../config/HardwareConfig.js';
import lampMatrix from '../hardware/LampMatrix.js';
import solenoidDriver from '../hardware/SolenoidDriver.js';
import switchMatrix from '../hardware/SwitchMatrix.js';
import physicsEngine from '../physics/PhysicsEngine.js';
import renderer from '../render/Renderer.js';

/**
 * Player data
 */
class Player {
    constructor(number) {
        this.number = number;
        this.score = 0;
        this.bonusMultiplier = 1;
        this.bonus = 0;
        this.ballsRemaining = GameSettings.BALLS_PER_GAME;
        this.extraBalls = 0;

        // Progress tracking
        this.leftBankHits = [false, false, false, false, false];
        this.rightBankHits = [false, false, false, false, false];
        this.centerDropsDown = [false, false, false];
        this.topLanesLit = [true, true, true];
        this.modesCompleted = [];
        this.currentMode = null;

        // Multiball progress
        this.satelliteLocks = 0;
        this.tankLocks = 0;
        this.magnaSaveCharges = 1;
    }

    addScore(points) {
        this.score += points;
        renderer.updateScore(this.score);
        eventBus.emit(Events.SCORE_CHANGED, { player: this.number, score: this.score });
    }

    reset() {
        this.score = 0;
        this.bonusMultiplier = 1;
        this.bonus = 0;
        this.ballsRemaining = GameSettings.BALLS_PER_GAME;
        this.extraBalls = 0;
        this.leftBankHits = [false, false, false, false, false];
        this.rightBankHits = [false, false, false, false, false];
        this.centerDropsDown = [false, false, false];
        this.topLanesLit = [true, true, true];
        this.modesCompleted = [];
        this.currentMode = null;
        this.satelliteLocks = 0;
        this.tankLocks = 0;
        this.magnaSaveCharges = 1;
    }
}

/**
 * Game Logic Controller
 */
class GameLogic {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.ballInPlay = false;
        this.ballSaveActive = false;
        this.ballSaveTimer = null;
        this.modeTimer = null;
        this.comboTimer = null;
        this.lastShot = null;

        // Skill shot state
        this.skillShotActive = false;
        this.skillShotSelection = 0; // 0=POINTS, 1=POPS, 2=MODE_LITE, 3=2X

        // Multiball state
        this.multiballActive = false;
        this.multiballType = null; // 'satellite' or 'tank'
        this.multiballJackpot = 1000000;

        this.setupStateMachine();
        this.setupEventListeners();
    }

    /**
     * Get current player
     */
    get currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Set up game state machine
     */
    setupStateMachine() {
        // Attract State
        const attractState = new State('attract', stateMachine);
        attractState.onEnter = () => {
            console.log('Entering Attract mode');
            lampMatrix.startShow('attract');
            lampMatrix.setLamp(Lamps.L_START_BUTTON, LampState.BLINK_SLOW);
            renderer.updateScore(0);
            renderer.updateBallNumber(1);
            renderer.updateDebugState('ATTRACT');
        };
        attractState.onExit = () => {
            lampMatrix.stopShow();
            lampMatrix.setLamp(Lamps.L_START_BUTTON, LampState.OFF);
        };
        attractState.onEvent = (event, data) => {
            if (event === 'startGame') {
                stateMachine.transition('game');
                return true;
            }
            return false;
        };

        // Game State
        const gameState = new State('game', stateMachine);

        // Game sub-states
        const ballLaunchState = new State('ballLaunch', stateMachine);
        ballLaunchState.onEnter = () => {
            console.log('Ball Launch');
            renderer.updateDebugState('BALL_LAUNCH');
            this.prepareBallLaunch();
        };
        ballLaunchState.onEvent = (event, data) => {
            if (event === 'ballLaunched') {
                stateMachine.transition('game.skillShot');
                return true;
            }
            return false;
        };

        const skillShotState = new State('skillShot', stateMachine);
        skillShotState.onEnter = () => {
            console.log('Skill Shot active');
            renderer.updateDebugState('SKILL_SHOT');
            this.skillShotActive = true;
            this.skillShotSelection = 0;
            this.updateSkillShotLamps();
        };
        skillShotState.onExit = () => {
            this.skillShotActive = false;
            lampMatrix.setGroup('TOP_LANES', LampState.OFF);
        };
        skillShotState.onEvent = (event, data) => {
            if (event === 'skillShotComplete' || event === 'skillShotMissed') {
                stateMachine.transition('game.normalPlay');
                return true;
            }
            if (event === 'cycleSkillShot') {
                this.skillShotSelection = (this.skillShotSelection + 1) % 4;
                this.updateSkillShotLamps();
                return true;
            }
            return false;
        };

        const normalPlayState = new State('normalPlay', stateMachine);
        normalPlayState.onEnter = () => {
            console.log('Normal Play');
            renderer.updateDebugState('NORMAL_PLAY');
            this.ballInPlay = true;
            this.startBallSave();
            this.updatePlayfieldLamps();
        };
        normalPlayState.onUpdate = (dt) => {
            // Check for mode/combo timers
        };
        normalPlayState.onEvent = (event, data) => {
            if (event === 'ballDrained') {
                if (this.ballSaveActive) {
                    this.saveBall();
                    return true;
                }
                stateMachine.transition('game.ballEnd');
                return true;
            }
            if (event === 'startMode') {
                stateMachine.transition('game.modeActive');
                return true;
            }
            if (event === 'startMultiball') {
                stateMachine.transition('game.multiball');
                return true;
            }
            return false;
        };

        const modeActiveState = new State('modeActive', stateMachine);
        modeActiveState.onEnter = (params) => {
            console.log('Mode Active:', params?.mode);
            renderer.updateDebugState('MODE: ' + (params?.mode || 'UNKNOWN'));
            this.startMode(params?.mode);
        };
        modeActiveState.onExit = () => {
            this.endMode();
        };
        modeActiveState.onEvent = (event, data) => {
            if (event === 'modeComplete' || event === 'modeTimeout') {
                stateMachine.transition('game.normalPlay');
                return true;
            }
            if (event === 'ballDrained') {
                // During mode, ball drain ends mode but may save ball
                if (this.ballSaveActive) {
                    this.saveBall();
                    return true;
                }
                stateMachine.transition('game.ballEnd');
                return true;
            }
            return false;
        };

        const multiballState = new State('multiball', stateMachine);
        multiballState.onEnter = (params) => {
            console.log('Multiball!');
            renderer.updateDebugState('MULTIBALL');
            this.startMultiball(params?.type || 'satellite');
        };
        multiballState.onExit = () => {
            this.endMultiball();
        };
        multiballState.onEvent = (event, data) => {
            if (event === 'multiballEnd') {
                stateMachine.transition('game.normalPlay');
                return true;
            }
            if (event === 'ballDrained') {
                // Check if multiball should end
                const activeBalls = physicsEngine.getActiveBalls().length;
                if (activeBalls <= 1) {
                    stateMachine.transition('game.normalPlay');
                }
                return true;
            }
            return false;
        };

        const ballEndState = new State('ballEnd', stateMachine);
        ballEndState.onEnter = () => {
            console.log('Ball End');
            renderer.updateDebugState('BALL_END');
            this.endBall();
        };
        ballEndState.onEvent = (event, data) => {
            if (event === 'nextBall') {
                stateMachine.transition('game.ballLaunch');
                return true;
            }
            if (event === 'gameOver') {
                stateMachine.transition('attract');
                return true;
            }
            return false;
        };

        // Build hierarchy
        gameState.addChild(ballLaunchState);
        gameState.addChild(skillShotState);
        gameState.addChild(normalPlayState);
        gameState.addChild(modeActiveState);
        gameState.addChild(multiballState);
        gameState.addChild(ballEndState);

        gameState.onEnter = () => {
            console.log('Game Starting');
            this.startNewGame();
            gameState.enterChild('ballLaunch');
        };
        gameState.onExit = () => {
            console.log('Game Over');
            this.endGame();
        };

        // Add states to machine
        stateMachine.addState(attractState);
        stateMachine.addState(gameState);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Switch events
        eventBus.on(Events.SWITCH_ACTIVATED, this.handleSwitch.bind(this));

        // Input events
        eventBus.on(Events.INPUT_START, (data) => {
            if (data.pressed) {
                if (stateMachine.isInState('attract')) {
                    stateMachine.sendEvent('startGame');
                }
            }
        });

        eventBus.on(Events.INPUT_FLIPPER_LEFT, (data) => {
            if (data.pressed && this.skillShotActive) {
                stateMachine.sendEvent('cycleSkillShot');
            }
        });

        eventBus.on(Events.INPUT_FLIPPER_RIGHT, (data) => {
            if (data.pressed && this.skillShotActive) {
                stateMachine.sendEvent('cycleSkillShot');
            }
        });

        eventBus.on(Events.INPUT_LAUNCH, (data) => {
            if (!data.pressed && stateMachine.isInState('ballLaunch')) {
                // Ball launched
                setTimeout(() => {
                    stateMachine.sendEvent('ballLaunched');
                }, 500);
            }
        });

        // Ball drained event
        eventBus.on(Events.BALL_DRAINED, () => {
            stateMachine.sendEvent('ballDrained');
        });
    }

    /**
     * Handle switch activation
     */
    handleSwitch(data) {
        const { switchId, switchName } = data;

        renderer.updateDebugSwitch(switchName);

        // Don't process during attract
        if (stateMachine.isInState('attract')) return;

        // Score switches
        this.scoreSwitch(switchId);

        // Skill shot handling
        if (this.skillShotActive) {
            if (SwitchGroups.TOP_LANES.includes(switchId)) {
                this.handleSkillShot(switchId);
            } else if (SwitchGroups.BUMPERS.includes(switchId)) {
                // Skill shot missed - hit bumper first
                stateMachine.sendEvent('skillShotMissed');
            }
        }

        // Target bank handling
        if (SwitchGroups.LEFT_BANK.includes(switchId)) {
            this.handleLeftBankHit(switchId);
        }
        if (SwitchGroups.RIGHT_BANK.includes(switchId)) {
            this.handleRightBankHit(switchId);
        }

        // Center drops
        if (SwitchGroups.CENTER_TARGETS.includes(switchId)) {
            this.handleCenterDrop(switchId);
        }

        // Scoop (mode start)
        if (switchId === Switches.SW_SCOOP) {
            this.handleScoop();
        }

        // Bumpers
        if (SwitchGroups.BUMPERS.includes(switchId)) {
            this.handleBumper(switchId);
        }

        // Slingshots
        if (SwitchGroups.SLINGSHOTS.includes(switchId)) {
            this.handleSlingshot(switchId);
        }

        // Ramps
        if (switchId === Switches.SW_LEFT_RAMP_MADE) {
            this.handleLeftRamp();
        }
        if (switchId === Switches.SW_RIGHT_RAMP_EXIT) {
            this.handleRightRamp();
        }
        if (switchId === Switches.SW_CENTER_RAMP_EXIT) {
            this.handleCenterRamp();
        }

        // Tank area
        if (switchId === Switches.SW_TANK_ENTRANCE) {
            this.handleTankEntrance();
        }
        if (switchId === Switches.SW_TANK_LOCK_1 || switchId === Switches.SW_TANK_LOCK_2) {
            this.handleTankLock(switchId);
        }

        // Satellite
        if (switchId === Switches.SW_SATELLITE_SHOT) {
            this.handleSatelliteShot();
        }
        if (switchId === Switches.SW_SATELLITE_LOCK) {
            this.handleSatelliteLock();
        }

        // Combo tracking
        this.trackCombo(switchId);
    }

    /**
     * Score points for a switch hit
     */
    scoreSwitch(switchId) {
        if (!this.currentPlayer) return;

        let points = 0;

        if (SwitchGroups.BUMPERS.includes(switchId)) {
            points = Scoring.BUMPER_HIT;
        } else if (SwitchGroups.LEFT_BANK.includes(switchId) ||
                   SwitchGroups.RIGHT_BANK.includes(switchId)) {
            points = Scoring.TARGET_HIT;
        } else if (SwitchGroups.CENTER_TARGETS.includes(switchId)) {
            points = Scoring.TARGET_HIT;
        } else if (SwitchGroups.TOP_LANES.includes(switchId)) {
            points = Scoring.TOP_LANE;
        } else if (SwitchGroups.INLANES.includes(switchId)) {
            points = Scoring.INLANE;
        } else if (switchId === Switches.SW_SPINNER) {
            points = Scoring.SPINNER_SPIN;
        } else if (switchId === Switches.SW_LEFT_STANDUP ||
                   switchId === Switches.SW_CENTER_STANDUP) {
            points = Scoring.STANDUP_HIT;
        }

        if (points > 0) {
            this.currentPlayer.addScore(points);
        }
    }

    /**
     * Start a new game
     */
    startNewGame() {
        // Create player
        this.players = [new Player(1)];
        this.currentPlayerIndex = 0;

        // Reset hardware
        lampMatrix.allOff();
        physicsEngine.reset();

        // Flash lamps
        lampMatrix.startShow('gameStart');
        setTimeout(() => {
            lampMatrix.stopShow();
        }, 1000);

        renderer.updateScore(0);
        renderer.updateBallNumber(1);
    }

    /**
     * End the game
     */
    endGame() {
        this.ballInPlay = false;
        this.clearAllTimers();
        lampMatrix.allOff();
        physicsEngine.reset();
    }

    /**
     * Prepare ball for launch
     */
    prepareBallLaunch() {
        // Create ball in shooter lane
        physicsEngine.createBallInShooter();

        // Update ball display
        const ballNum = GameSettings.BALLS_PER_GAME - this.currentPlayer.ballsRemaining + 1;
        renderer.updateBallNumber(ballNum);
    }

    /**
     * Update skill shot lamps
     */
    updateSkillShotLamps() {
        // Flash selected skill shot indicator
        const topLaneLamps = LampGroups.TOP_LANES;

        topLaneLamps.forEach((lamp, i) => {
            if (i === this.skillShotSelection % 3) {
                lampMatrix.setLamp(lamp, LampState.BLINK_FAST);
            } else {
                lampMatrix.setLamp(lamp, LampState.ON);
            }
        });
    }

    /**
     * Handle skill shot
     */
    handleSkillShot(switchId) {
        const laneIndex = SwitchGroups.TOP_LANES.indexOf(switchId);

        if (laneIndex === this.skillShotSelection % 3) {
            // Skill shot made!
            const points = Scoring.SKILL_SHOT_BASE * (laneIndex + 1);
            this.currentPlayer.addScore(points);
            console.log('SKILL SHOT! +' + points);
            lampMatrix.startShow('jackpot');
            setTimeout(() => lampMatrix.stopShow(), 1500);
        }

        stateMachine.sendEvent('skillShotComplete');
    }

    /**
     * Start ball save
     */
    startBallSave() {
        this.ballSaveActive = true;
        lampMatrix.setLamp(Lamps.L_BALL_SAVE, LampState.ON);

        this.ballSaveTimer = setTimeout(() => {
            this.ballSaveActive = false;
            lampMatrix.setLamp(Lamps.L_BALL_SAVE, LampState.OFF);
        }, GameSettings.BALL_SAVE_TIME);
    }

    /**
     * Save the ball (re-launch)
     */
    saveBall() {
        console.log('Ball Saved!');
        lampMatrix.setLamp(Lamps.L_SHOOT_AGAIN, LampState.BLINK_FAST);

        setTimeout(() => {
            lampMatrix.setLamp(Lamps.L_SHOOT_AGAIN, LampState.OFF);
            physicsEngine.createBallInShooter();
            solenoidDriver.autoLaunch(0.8);
        }, 1000);
    }

    /**
     * End current ball
     */
    endBall() {
        this.ballInPlay = false;
        this.clearAllTimers();

        // Count down bonus
        const bonus = this.currentPlayer.bonus * this.currentPlayer.bonusMultiplier;
        this.currentPlayer.addScore(bonus);
        this.currentPlayer.bonus = 0;

        // Check for more balls
        this.currentPlayer.ballsRemaining--;

        if (this.currentPlayer.ballsRemaining > 0 || this.currentPlayer.extraBalls > 0) {
            if (this.currentPlayer.extraBalls > 0) {
                this.currentPlayer.extraBalls--;
                lampMatrix.setLamp(Lamps.L_SHOOT_AGAIN, LampState.BLINK_SLOW);
            }

            setTimeout(() => {
                lampMatrix.setLamp(Lamps.L_SHOOT_AGAIN, LampState.OFF);
                stateMachine.sendEvent('nextBall');
            }, 2000);
        } else {
            setTimeout(() => {
                stateMachine.sendEvent('gameOver');
            }, 3000);
        }
    }

    /**
     * Update playfield lamps based on game state
     */
    updatePlayfieldLamps() {
        const player = this.currentPlayer;
        if (!player) return;

        // Left bank lamps
        player.leftBankHits.forEach((hit, i) => {
            lampMatrix.setLamp(LampGroups.LEFT_BANK[i], hit ? LampState.ON : LampState.OFF);
        });

        // Right bank lamps
        player.rightBankHits.forEach((hit, i) => {
            lampMatrix.setLamp(LampGroups.RIGHT_BANK[i], hit ? LampState.ON : LampState.OFF);
        });

        // Center drops
        player.centerDropsDown.forEach((down, i) => {
            lampMatrix.setLamp(LampGroups.CENTER_DROPS[i], down ? LampState.ON : LampState.OFF);
        });

        // Bonus multiplier
        LampGroups.BONUS_MULTIPLIERS.forEach((lamp, i) => {
            lampMatrix.setLamp(lamp, i < player.bonusMultiplier ? LampState.ON : LampState.OFF);
        });

        // Scoop lit if modes available
        const scoopLit = player.modesCompleted.length < 4;
        lampMatrix.setLamp(Lamps.L_SCOOP, scoopLit ? LampState.BLINK_SLOW : LampState.OFF);

        // Lock lamps
        if (player.leftBankHits.every(h => h)) {
            lampMatrix.setLamp(Lamps.L_LEFT_LOCK, LampState.BLINK_FAST);
        }

        // GI on
        lampMatrix.setGroup('GI', LampState.ON);
    }

    /**
     * Handle left target bank hit
     */
    handleLeftBankHit(switchId) {
        const index = SwitchGroups.LEFT_BANK.indexOf(switchId);
        if (index >= 0 && this.currentPlayer) {
            this.currentPlayer.leftBankHits[index] = true;
            this.currentPlayer.bonus += Scoring.BONUS_PER_TARGET;

            // Check completion
            if (this.currentPlayer.leftBankHits.every(h => h)) {
                console.log('Left bank complete!');
                this.currentPlayer.leftBankHits = [false, false, false, false, false];
                this.currentPlayer.bonusMultiplier = Math.min(5, this.currentPlayer.bonusMultiplier + 1);

                // Light lock if not in multiball
                if (!this.multiballActive) {
                    lampMatrix.setLamp(Lamps.L_LEFT_LOCK, LampState.BLINK_FAST);
                }
            }

            this.updatePlayfieldLamps();
        }
    }

    /**
     * Handle right target bank hit
     */
    handleRightBankHit(switchId) {
        const index = SwitchGroups.RIGHT_BANK.indexOf(switchId);
        if (index >= 0 && this.currentPlayer) {
            this.currentPlayer.rightBankHits[index] = true;
            this.currentPlayer.bonus += Scoring.BONUS_PER_TARGET;

            // Check completion
            if (this.currentPlayer.rightBankHits.every(h => h)) {
                console.log('Right bank complete!');
                this.currentPlayer.rightBankHits = [false, false, false, false, false];
                this.currentPlayer.bonusMultiplier = Math.min(5, this.currentPlayer.bonusMultiplier + 1);
            }

            this.updatePlayfieldLamps();
        }
    }

    /**
     * Handle center drop target
     */
    handleCenterDrop(switchId) {
        const index = SwitchGroups.CENTER_TARGETS.indexOf(switchId);
        if (index >= 0 && this.currentPlayer) {
            this.currentPlayer.centerDropsDown[index] = true;

            // Check completion
            if (this.currentPlayer.centerDropsDown.every(d => d)) {
                console.log('Center drops complete!');
                this.currentPlayer.addScore(Scoring.MODE_COMPLETION);
                this.currentPlayer.centerDropsDown = [false, false, false];

                // Reset drops after delay
                setTimeout(() => {
                    solenoidDriver.resetCenterDrops();
                }, 1000);
            }

            this.updatePlayfieldLamps();
        }
    }

    /**
     * Handle scoop shot
     */
    handleScoop() {
        if (!stateMachine.isInState('normalPlay')) return;

        const player = this.currentPlayer;
        const availableModes = ['runway', 'facility', 'train', 'tank']
            .filter(m => !player.modesCompleted.includes(m));

        if (availableModes.length > 0) {
            const mode = availableModes[0];
            stateMachine.sendEvent('startMode', { mode });
        } else {
            // All modes complete - wizard mode!
            this.currentPlayer.addScore(Scoring.JACKPOT_BASE);
            solenoidDriver.ejectFromScoop();
        }
    }

    /**
     * Handle bumper hit
     */
    handleBumper(switchId) {
        // Fire bumper coil
        const coilMap = {
            [Switches.SW_BUMPER_LEFT]: Coils.C_BUMPER_LEFT,
            [Switches.SW_BUMPER_BOTTOM]: Coils.C_BUMPER_BOTTOM,
            [Switches.SW_BUMPER_RIGHT]: Coils.C_BUMPER_RIGHT
        };

        solenoidDriver.fire(coilMap[switchId]);
    }

    /**
     * Handle slingshot hit
     */
    handleSlingshot(switchId) {
        const coil = switchId === Switches.SW_LEFT_SLING
            ? Coils.C_SLING_LEFT
            : Coils.C_SLING_RIGHT;
        solenoidDriver.fire(coil);
    }

    /**
     * Handle left ramp complete
     */
    handleLeftRamp() {
        this.currentPlayer.addScore(Scoring.RAMP_SHOT);
        this.currentPlayer.bonus += Scoring.BONUS_PER_RAMP;

        // Check for lock
        if (lampMatrix.isOn(Lamps.L_LEFT_LOCK) && !this.multiballActive) {
            this.handleSatelliteLock();
        }

        this.lastShot = 'leftRamp';
    }

    /**
     * Handle right ramp complete
     */
    handleRightRamp() {
        this.currentPlayer.addScore(Scoring.RAMP_SHOT);
        this.currentPlayer.bonus += Scoring.BONUS_PER_RAMP;

        // Check for tank multiball start
        if (this.currentPlayer.tankLocks >= 2 && !this.multiballActive) {
            stateMachine.sendEvent('startMultiball', { type: 'tank' });
        }

        this.lastShot = 'rightRamp';
    }

    /**
     * Handle center ramp complete
     */
    handleCenterRamp() {
        this.currentPlayer.addScore(Scoring.RAMP_SHOT);
        this.lastShot = 'centerRamp';

        // Combo check
        this.checkCombo('centerRamp');
    }

    /**
     * Handle tank entrance
     */
    handleTankEntrance() {
        if (!this.multiballActive && this.currentPlayer.tankLocks < 2) {
            solenoidDriver.setTankTrapDoor(true);
            setTimeout(() => {
                solenoidDriver.setTankTrapDoor(false);
            }, 2000);
        }
    }

    /**
     * Handle tank lock
     */
    handleTankLock(switchId) {
        if (this.multiballActive) return;

        this.currentPlayer.tankLocks++;
        lampMatrix.setLamp(Lamps.L_RIGHT_LOCK, LampState.BLINK_FAST);

        if (this.currentPlayer.tankLocks >= 2) {
            lampMatrix.setLamp(Lamps.L_RIGHT_RAMP_ARROW, LampState.BLINK_SUPERFAST);
        }
    }

    /**
     * Handle satellite shot
     */
    handleSatelliteShot() {
        if (this.multiballActive && this.multiballType === 'satellite') {
            // Jackpot!
            this.currentPlayer.addScore(this.multiballJackpot);
            this.multiballJackpot += 250000;
            lampMatrix.startShow('jackpot');
            setTimeout(() => lampMatrix.stopShow(), 1500);
        } else if (this.currentPlayer.satelliteLocks >= 2) {
            // Start satellite multiball
            stateMachine.sendEvent('startMultiball', { type: 'satellite' });
        }
    }

    /**
     * Handle satellite lock
     */
    handleSatelliteLock() {
        if (this.multiballActive) return;

        this.currentPlayer.satelliteLocks++;
        lampMatrix.setLamp(Lamps.L_SATELLITE_ENABLED,
            this.currentPlayer.satelliteLocks >= 2 ? LampState.BLINK_FAST : LampState.ON);

        if (this.currentPlayer.satelliteLocks >= 2) {
            lampMatrix.setLamp(Lamps.L_SATELLITE, LampState.BLINK_SUPERFAST);
        }
    }

    /**
     * Start a mode
     */
    startMode(mode) {
        this.currentPlayer.currentMode = mode;
        lampMatrix.setLamp(Lamps[`L_MODE_${mode.toUpperCase()}`], LampState.BLINK_FAST);

        // Eject ball from scoop
        setTimeout(() => {
            solenoidDriver.ejectFromScoop();
        }, 1500);

        // Mode timer
        this.modeTimer = setTimeout(() => {
            stateMachine.sendEvent('modeTimeout');
        }, GameSettings.MODE_TIME_DEFAULT);
    }

    /**
     * End current mode
     */
    endMode() {
        if (this.modeTimer) {
            clearTimeout(this.modeTimer);
            this.modeTimer = null;
        }

        const mode = this.currentPlayer.currentMode;
        if (mode) {
            this.currentPlayer.modesCompleted.push(mode);
            lampMatrix.setLamp(Lamps[`L_MODE_${mode.toUpperCase()}`], LampState.ON);
            this.currentPlayer.currentMode = null;
        }

        this.updatePlayfieldLamps();
    }

    /**
     * Start multiball
     */
    startMultiball(type) {
        this.multiballActive = true;
        this.multiballType = type;
        this.multiballJackpot = Scoring.JACKPOT_BASE;

        lampMatrix.startShow('multiball');

        // Launch extra balls
        const ballCount = type === 'satellite' ? 5 : 3;
        for (let i = 0; i < ballCount - 1; i++) {
            setTimeout(() => {
                physicsEngine.createBallInShooter();
                solenoidDriver.autoLaunch(0.9);
            }, 1000 * (i + 1));
        }

        // Extended ball save
        this.ballSaveActive = true;
        if (this.ballSaveTimer) clearTimeout(this.ballSaveTimer);
        this.ballSaveTimer = setTimeout(() => {
            this.ballSaveActive = false;
        }, GameSettings.MULTIBALL_BALL_SAVE);
    }

    /**
     * End multiball
     */
    endMultiball() {
        this.multiballActive = false;
        this.multiballType = null;
        lampMatrix.stopShow();
        this.updatePlayfieldLamps();
    }

    /**
     * Track combo shots
     */
    trackCombo(switchId) {
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
        }

        this.comboTimer = setTimeout(() => {
            this.lastShot = null;
        }, GameSettings.COMBO_WINDOW);
    }

    /**
     * Check for combo completion
     */
    checkCombo(shot) {
        if (this.lastShot === 'leftRamp' && shot === 'rightRamp') {
            // L-R Combo
            this.currentPlayer.addScore(Scoring.COMBO_RAMP);
            lampMatrix.setLamp(Lamps.L_COMBO_2X, LampState.BLINK_FAST);
        } else if (this.lastShot === 'centerRamp' && shot === 'satellite') {
            // Satellite combo
            this.currentPlayer.addScore(Scoring.COMBO_RAMP * 2);
        }
    }

    /**
     * Clear all timers
     */
    clearAllTimers() {
        if (this.ballSaveTimer) {
            clearTimeout(this.ballSaveTimer);
            this.ballSaveTimer = null;
        }
        if (this.modeTimer) {
            clearTimeout(this.modeTimer);
            this.modeTimer = null;
        }
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
            this.comboTimer = null;
        }
    }

    /**
     * Initialize game logic
     */
    initialize() {
        console.log('Game Logic initialized');
    }

    /**
     * Update (called from game loop)
     */
    update(dt) {
        stateMachine.update(dt);
        lampMatrix.update(dt);
    }
}

// Export singleton
const gameLogic = new GameLogic();
export default gameLogic;
export { GameLogic, Player };
