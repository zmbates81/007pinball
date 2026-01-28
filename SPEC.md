# GoldenEye 007 Pinball Simulation - Technical Specification

**Version:** 1.0
**Status:** APPROVED
**Date:** 2026-01-28

### Approved Design Decisions
- **Physics**: Arcade-style (rule accuracy prioritized over realistic simulation)
- **Modes**: 4 core modes for MVP (Runway, Facility, Train, Tank)
- **Input**: Keyboard + Mouse (click-and-drag plunger, clickable flippers)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Hardware Emulation Layer](#3-hardware-emulation-layer)
4. [State Machine Design](#4-state-machine-design)
5. [Game Rules Implementation](#5-game-rules-implementation)
6. [Physics Engine](#6-physics-engine)
7. [Rendering Layer](#7-rendering-layer)
8. [File Structure](#8-file-structure)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Project Overview

### 1.1 Objective
Create a browser-based, functional replica of the **1996 Sega GoldenEye 007** pinball machine with emphasis on **accurate game rule emulation** over physics fidelity.

### 1.2 Design Philosophy
- **Logic First**: ROM logic (rules, modes, scoring) takes priority over physics simulation
- **Decoupled Architecture**: Physical playfield and game logic communicate only via Event Bus
- **Hardware Accurate**: Switch/Lamp/Coil addressing mirrors original Sega documentation

### 1.3 Tech Stack
- **Rendering**: HTML5 Canvas (2D Context)
- **Language**: Vanilla JavaScript (ES6+)
- **State Management**: Custom Hierarchical State Machine
- **Communication**: Centralized Event Bus (Pub/Sub)

---

## 2. Architecture

### 2.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER WINDOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  INPUT HANDLER  │    │   GAME LOOP     │    │    RENDERER     │ │
│  │  (Keyboard/     │    │  (60fps tick)   │    │  (Canvas 2D)    │ │
│  │   Touch)        │    │                 │    │                 │ │
│  └────────┬────────┘    └────────┬────────┘    └────────▲────────┘ │
│           │                      │                      │          │
│           ▼                      ▼                      │          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                        EVENT BUS                              │ │
│  │    (Pub/Sub: switch.*, lamp.*, coil.*, game.*, physics.*)     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│           │                      │                      │          │
│           ▼                      ▼                      ▼          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ SWITCH MATRIX   │    │   GAME LOGIC    │    │  LAMP MATRIX    │ │
│  │ (Input Layer)   │◄───│ (State Machine) │───►│ (Output Layer)  │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘ │
│                                  │                                 │
│                                  ▼                                 │
│                         ┌─────────────────┐                        │
│                         │ SOLENOID DRIVER │                        │
│                         │ (Coil Control)  │                        │
│                         └────────┬────────┘                        │
│                                  │                                 │
│                                  ▼                                 │
│                         ┌─────────────────┐                        │
│                         │ PHYSICS ENGINE  │                        │
│                         │ (Ball/Flipper)  │                        │
│                         └─────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Dependencies

| Module | Depends On | Publishes Events | Subscribes To |
|--------|------------|------------------|---------------|
| InputHandler | EventBus | `input.*` | - |
| SwitchMatrix | EventBus, HardwareConfig | `switch.activated`, `switch.deactivated` | `physics.collision` |
| GameLogic | EventBus, HardwareConfig | `game.*`, `lamp.set`, `coil.fire` | `switch.*`, `game.*` |
| LampMatrix | EventBus, HardwareConfig | `lamp.stateChanged` | `lamp.set` |
| SolenoidDriver | EventBus, HardwareConfig | `coil.fired` | `coil.fire` |
| PhysicsEngine | EventBus | `physics.collision`, `physics.ballPosition` | `coil.fired` |
| Renderer | EventBus | - | `lamp.stateChanged`, `physics.ballPosition` |

---

## 3. Hardware Emulation Layer

### 3.1 Switch Matrix Definition

All switches use the format `SW_XX` where XX is the switch number (1-64).

#### Column 1: System Switches (SW_01 - SW_08)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 01 | `SW_PLUMB_TILT` | Plumb Bob Tilt | NC (Normally Closed) |
| 02 | `SW_SLAM_TILT` | Slam Tilt | NO |
| 03 | `SW_START_BUTTON` | Start Button | NO |
| 04 | `SW_COIN_1` | Left Coin Slot | NO |
| 05 | `SW_COIN_2` | Center Coin Slot | NO |
| 06 | `SW_COIN_3` | Right Coin Slot | NO |
| 07 | `SW_SERVICE_ENTER` | Service Enter | NO |
| 08 | `SW_SERVICE_ESC` | Service Escape | NO |

#### Column 2: Trough & Shooter (SW_09 - SW_16)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 09 | `SW_TROUGH_1` | Trough Opto #1 (Rightmost) | Opto |
| 10 | `SW_TROUGH_2` | Trough Opto #2 | Opto |
| 11 | `SW_TROUGH_3` | Trough Opto #3 | Opto |
| 12 | `SW_TROUGH_4` | Trough Opto #4 | Opto |
| 13 | `SW_TROUGH_5` | Trough Opto #5 (Leftmost) | Opto |
| 14 | `SW_TROUGH_STACK` | Stacking Opto | Opto |
| 15 | `SW_TROUGH_VUK` | Trough VUK Opto | Opto |
| 16 | `SW_SHOOTER_LANE` | Shooter Lane | NO |

#### Column 3: Ramps & Satellite (SW_17 - SW_24)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 17 | `SW_RIGHT_RAMP_EXIT` | Right Ramp Exit | NO |
| 18 | `SW_CENTER_RAMP_EXIT` | Center Ramp Exit | NO |
| 19 | `SW_RIGHT_RAMP_ENTER` | Right Ramp Entrance | NO |
| 20 | `SW_SATELLITE_HOME` | Satellite Dish Home Position | Opto |
| 21 | `SW_SATELLITE_UP` | Satellite Dish Up Position | Opto |
| 22 | `SW_LEFT_RAMP_ENTER` | Left Ramp Entrance | NO |
| 23 | `SW_LEFT_ORBIT` | Left Orbit Pass | NO |
| 24 | `SW_RIGHT_ORBIT` | Right Orbit Pass | NO |

#### Column 4: Left Playfield (SW_25 - SW_32)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 25 | `SW_LEFT_BANK_1` | Left 5-Bank Target #1 (Bottom) | NO |
| 26 | `SW_LEFT_BANK_2` | Left 5-Bank Target #2 | NO |
| 27 | `SW_LEFT_BANK_3` | Left 5-Bank Target #3 | NO |
| 28 | `SW_LEFT_BANK_4` | Left 5-Bank Target #4 (Top) | NO |
| 29 | `SW_LEFT_BANK_5` | Left 5-Bank Target #5 | NO |
| 30 | `SW_LEFT_STANDUP` | Left Standup Target | NO |
| 31 | `SW_LEFT_LOCK` | Left Ball Lock | NO |
| 32 | `SW_LEFT_RAMP_MADE` | Left Ramp Made (Exit) | NO |

#### Column 5: Center Playfield (SW_33 - SW_40)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 33 | `SW_CENTER_TARGET_1` | Center Drop Target #1 | NO |
| 34 | `SW_CENTER_TARGET_2` | Center Drop Target #2 | NO |
| 35 | `SW_CENTER_TARGET_3` | Center Drop Target #3 | NO |
| 36 | `SW_TANK_ENTRANCE` | Tank Entrance | NO |
| 37 | `SW_TANK_LOCK_1` | Tank Lock #1 | NO |
| 38 | `SW_TANK_LOCK_2` | Tank Lock #2 | NO |
| 39 | `SW_CENTER_STANDUP` | Center Standup | NO |
| 40 | `SW_SPINNER` | Spinner | NO |

#### Column 6: Bumpers & Right Targets (SW_41 - SW_48)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 41 | `SW_BUMPER_LEFT` | Left Turbo Bumper | NO |
| 42 | `SW_BUMPER_BOTTOM` | Bottom Turbo Bumper | NO |
| 43 | `SW_BUMPER_RIGHT` | Right Turbo Bumper | NO |
| 44 | `SW_RIGHT_BANK_1` | Right 5-Bank Target #1 (Bottom) | NO |
| 45 | `SW_RIGHT_BANK_2` | Right 5-Bank Target #2 | NO |
| 46 | `SW_RIGHT_BANK_3` | Right 5-Bank Target #3 | NO |
| 47 | `SW_RIGHT_BANK_4` | Right 5-Bank Target #4 | NO |
| 48 | `SW_RIGHT_BANK_5` | Right 5-Bank Target #5 (Top) | NO |

#### Column 7: Upper Playfield & Scoop (SW_49 - SW_56)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 49 | `SW_UPPER_LOOP` | Upper Loop | NO |
| 50 | `SW_SCOOP` | Scoop (Mode Start) | NO |
| 51 | `SW_TOP_LANE_R` | Top Lane Right | NO |
| 52 | `SW_TOP_LANE_M` | Top Lane Middle | NO |
| 53 | `SW_TOP_LANE_L` | Top Lane Left | NO |
| 54 | `SW_CENTER_RAMP_ENTER` | Center Ramp Entrance | NO |
| 55 | `SW_SATELLITE_SHOT` | Satellite Dish Shot | NO |
| 56 | `SW_SATELLITE_LOCK` | Satellite Lock | NO |

#### Column 8: Lower Playfield (SW_57 - SW_64)
| ID | Constant Name | Description | Type |
|----|---------------|-------------|------|
| 57 | `SW_LEFT_OUTLANE` | Left Outlane | NO |
| 58 | `SW_RIGHT_OUTLANE` | Right Outlane | NO |
| 59 | `SW_LEFT_RETURN` | Left Return Lane (Inlane) | NO |
| 60 | `SW_RIGHT_RETURN` | Right Return Lane (Inlane) | NO |
| 61 | `SW_LEFT_SLING` | Left Slingshot | NO |
| 62 | `SW_RIGHT_SLING` | Right Slingshot | NO |
| 63 | `SW_LEFT_FLIPPER_EOS` | Left Flipper End-of-Stroke | NO |
| 64 | `SW_RIGHT_FLIPPER_EOS` | Right Flipper End-of-Stroke | NO |

---

### 3.2 Lamp Matrix Definition

All lamps use the format `L_XX` where XX is the lamp number (1-64).

#### Row 1: Mode Status Lamps (L_01 - L_08)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 01 | `L_EJECT_HURRY` | Eject/Hurry Up | Red |
| 02 | `L_JACKPOT` | Jackpot Indicator | Yellow |
| 03 | `L_SCOOP` | Scoop Lit | White |
| 04 | `L_LEFT_STANDUP` | Left Standup Lit | Green |
| 05 | `L_RIGHT_RAMP` | Right Ramp Arrow | Orange |
| 06 | `L_SATELLITE` | Satellite/Nerve Gas | Blue |
| 07 | `L_LOCK_LIT` | Lock Lit | Red |
| 08 | `L_START_BUTTON` | Start Button | Green |

#### Row 2: Multipliers & Combo (L_09 - L_16)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 09 | `L_BONUS_1X` | 1X Bonus | White |
| 10 | `L_BONUS_2X` | 2X Bonus | White |
| 11 | `L_BONUS_3X` | 3X Bonus | White |
| 12 | `L_BONUS_4X` | 4X Bonus | White |
| 13 | `L_BONUS_5X` | 5X Bonus | White |
| 14 | `L_COMBO_2X` | 2X Combo | Yellow |
| 15 | `L_COMBO_3X` | 3X Combo | Yellow |
| 16 | `L_SATELLITE_ENABLED` | Satellite Enabled | Blue |

#### Row 3: Left Target Bank (L_17 - L_24)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 17 | `L_LEFT_BANK_1` | Left Bank Target #1 | Red |
| 18 | `L_LEFT_BANK_2` | Left Bank Target #2 | Red |
| 19 | `L_LEFT_BANK_3` | Left Bank Target #3 | Red |
| 20 | `L_LEFT_BANK_4` | Left Bank Target #4 | Red |
| 21 | `L_LEFT_BANK_5` | Left Bank Target #5 | Red |
| 22 | `L_LEFT_RAMP_ARROW` | Left Ramp Arrow | Green |
| 23 | `L_LEFT_ORBIT_ARROW` | Left Orbit Arrow | Green |
| 24 | `L_LEFT_LOCK` | Left Lock | Orange |

#### Row 4: Right Target Bank (L_25 - L_32)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 25 | `L_RIGHT_BANK_1` | Right Bank Target #1 | Red |
| 26 | `L_RIGHT_BANK_2` | Right Bank Target #2 | Red |
| 27 | `L_RIGHT_BANK_3` | Right Bank Target #3 | Red |
| 28 | `L_RIGHT_BANK_4` | Right Bank Target #4 | Red |
| 29 | `L_RIGHT_BANK_5` | Right Bank Target #5 | Red |
| 30 | `L_RIGHT_RAMP_ARROW` | Right Ramp Arrow | Green |
| 31 | `L_RIGHT_ORBIT_ARROW` | Right Orbit Arrow | Green |
| 32 | `L_RIGHT_LOCK` | Right Lock (Tank) | Orange |

#### Row 5: Top Lanes & Bumpers (L_33 - L_40)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 33 | `L_TOP_LANE_L` | Top Lane Left | White |
| 34 | `L_TOP_LANE_M` | Top Lane Middle | White |
| 35 | `L_TOP_LANE_R` | Top Lane Right | White |
| 36 | `L_BUMPER_L` | Left Bumper | Yellow |
| 37 | `L_BUMPER_B` | Bottom Bumper | Yellow |
| 38 | `L_BUMPER_R` | Right Bumper | Yellow |
| 39 | `L_SPINNER_VALUE` | Spinner Value Lit | Orange |
| 40 | `L_SUPER_SPINNER` | Super Spinner | Orange |

#### Row 6: 007 Mode Lamps (L_41 - L_48)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 41 | `L_MODE_RUNWAY` | Runway (Arkangelsk) | Blue |
| 42 | `L_MODE_FACILITY` | Facility | Blue |
| 43 | `L_MODE_SILO` | Silo | Blue |
| 44 | `L_MODE_TRAIN` | Train | Blue |
| 45 | `L_MODE_STATUE` | Statue Park | Blue |
| 46 | `L_MODE_ARCHIVES` | Archives | Blue |
| 47 | `L_MODE_TANK` | Tank Chase | Blue |
| 48 | `L_MODE_CRADLE` | Cradle | Blue |

#### Row 7: Outlanes & GI (L_49 - L_56)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 49 | `L_LEFT_OUTLANE` | Left Outlane Special | Red |
| 50 | `L_RIGHT_OUTLANE` | Right Outlane Special | Red |
| 51 | `L_LEFT_RETURN` | Left Return Lane | White |
| 52 | `L_RIGHT_RETURN` | Right Return Lane | White |
| 53 | `L_EXTRA_BALL` | Extra Ball Lit | Yellow |
| 54 | `L_SHOOT_AGAIN` | Shoot Again | Yellow |
| 55 | `L_MAGNA_SAVE` | Magna-Save Ready | Purple |
| 56 | `L_BALL_SAVE` | Ball Save Active | Yellow |

#### Row 8: Playfield Inserts (L_57 - L_64)
| ID | Constant Name | Description | Color |
|----|---------------|-------------|-------|
| 57 | `L_CENTER_DROP_1` | Center Drop #1 | White |
| 58 | `L_CENTER_DROP_2` | Center Drop #2 | White |
| 59 | `L_CENTER_DROP_3` | Center Drop #3 | White |
| 60 | `L_TANK_ENTRANCE` | Tank Entrance | Red |
| 61 | `L_MULTIBALL_LIT` | Multiball Lit | Red |
| 62 | `L_SUPER_JACKPOT` | Super Jackpot | Yellow |
| 63 | `L_GI_ZONE_1` | General Illumination 1 | White |
| 64 | `L_GI_ZONE_2` | General Illumination 2 | White |

### 3.3 Lamp States
```javascript
const LampState = {
    OFF: 0,
    ON: 1,
    BLINK_SLOW: 2,    // 500ms interval
    BLINK_FAST: 3,    // 150ms interval
    BLINK_SUPERFAST: 4 // 75ms interval (hurry-up)
};
```

---

### 3.4 Solenoid/Coil Definition

All coils use the format `C_XX` where XX is the coil number.

| ID | Constant Name | Description | Type | Pulse (ms) |
|----|---------------|-------------|------|------------|
| 01 | `C_TROUGH_EJECT` | Trough Up-Kicker | Pulse | 30 |
| 02 | `C_AUTO_LAUNCH` | Auto Launch / Plunger | Pulse | 50 |
| 03 | `C_SCOOP_EJECT` | Scoop Eject | Pulse | 40 |
| 04 | `C_POWER_SCOOP` | Power Scoop (Strong) | Pulse | 60 |
| 05 | `C_LEFT_RAMP_DIVERTER` | Left Ramp Diverter | Hold | - |
| 06 | `C_CENTER_RAMP_DIVERTER` | Center Ramp Diverter | Hold | - |
| 07 | `C_CENTER_DROP_RESET` | Center Drop Bank Reset | Pulse | 75 |
| 08 | `C_TANK_TRAP_RELEASE` | Tank Ball Release | Pulse | 35 |
| 09 | `C_BUMPER_LEFT` | Left Turbo Bumper | Pulse | 20 |
| 10 | `C_BUMPER_BOTTOM` | Bottom Turbo Bumper | Pulse | 20 |
| 11 | `C_BUMPER_RIGHT` | Right Turbo Bumper | Pulse | 20 |
| 12 | `C_SLING_LEFT` | Left Slingshot | Pulse | 25 |
| 13 | `C_SLING_RIGHT` | Right Slingshot | Pulse | 25 |
| 14 | `C_FLIPPER_LEFT_MAIN` | Left Flipper Main | Hold | - |
| 15 | `C_FLIPPER_LEFT_HOLD` | Left Flipper Hold | Hold | - |
| 16 | `C_FLIPPER_RIGHT_MAIN` | Right Flipper Main | Hold | - |
| 17 | `C_FLIPPER_RIGHT_HOLD` | Right Flipper Hold | Hold | - |
| 18 | `C_SATELLITE_MOTOR` | Satellite Dish Motor | Hold | - |
| 19 | `C_SATELLITE_RAMP_UP` | Satellite Ramp Raise | Pulse | 100 |
| 20 | `C_SATELLITE_MAGNET` | Satellite Magnet (Magna-Save) | Pulse | 150 |
| 21 | `C_KNOCKER` | Knocker (Award Sound) | Pulse | 30 |
| 22 | `C_TANK_TRAP_DOOR` | Tank Trap Door | Hold | - |

---

## 4. State Machine Design

### 4.1 Hierarchical State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROOT STATE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   ATTRACT   │◄───────►│    GAME     │────────►│   TILT      │           │
│  │    MODE     │ START   │   ACTIVE    │ TILT    │   STATE     │           │
│  └──────┬──────┘         └──────┬──────┘         └─────────────┘           │
│         │                       │                                           │
│         ▼                       ▼                                           │
│  ┌─────────────┐         ┌─────────────────────────────────────┐           │
│  │ - Lamp Show │         │           GAME ACTIVE               │           │
│  │ - High Score│         ├─────────────────────────────────────┤           │
│  │ - Wait for  │         │                                     │           │
│  │   Start     │         │  ┌──────────┐    ┌──────────────┐   │           │
│  └─────────────┘         │  │  BALL    │───►│   BALL       │   │           │
│                          │  │ IN PLAY  │    │   DRAINED    │   │           │
│                          │  └────┬─────┘    └──────┬───────┘   │           │
│                          │       │                 │           │           │
│                          │       ▼                 ▼           │           │
│                          │  ┌─────────────────────────┐        │           │
│                          │  │     BALL IN PLAY        │        │           │
│                          │  ├─────────────────────────┤        │           │
│                          │  │ ┌─────────┐ ┌────────┐  │        │           │
│                          │  │ │ SKILL   │ │ NORMAL │  │        │           │
│                          │  │ │  SHOT   │►│  PLAY  │  │        │           │
│                          │  │ └─────────┘ └───┬────┘  │        │           │
│                          │  │                 │       │        │           │
│                          │  │                 ▼       │        │           │
│                          │  │          ┌──────────┐   │        │           │
│                          │  │          │  MODE    │   │        │           │
│                          │  │          │  ACTIVE  │   │        │           │
│                          │  │          └──────────┘   │        │           │
│                          │  └─────────────────────────┘        │           │
│                          │                                     │           │
│                          │  ┌────────────────────────────────┐ │           │
│                          │  │       MULTIBALL STATES         │ │           │
│                          │  │  ┌─────────┐   ┌───────────┐   │ │           │
│                          │  │  │SATELLITE│   │   TANK    │   │ │           │
│                          │  │  │   MB    │   │    MB     │   │ │           │
│                          │  │  └─────────┘   └───────────┘   │ │           │
│                          │  └────────────────────────────────┘ │           │
│                          └─────────────────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 State Definitions

#### 4.2.1 Root States
| State | Description | Entry Action | Exit Action |
|-------|-------------|--------------|-------------|
| `ATTRACT` | Machine idle, waiting for game | Start lamp show | Stop lamp show |
| `GAME_ACTIVE` | Game in progress | Initialize player data | Save scores |
| `TILT_WARNING` | Tilt detected, temporary | Flash GI | - |
| `TILTED` | Game tilted, ball forfeit | Kill flippers, drain all | - |

#### 4.2.2 Game Active Sub-States
| State | Description | Entry Action | Exit Action |
|-------|-------------|--------------|-------------|
| `BALL_LAUNCH` | Preparing ball for play | Eject from trough | - |
| `SKILL_SHOT` | Awaiting skill shot | Enable skill shot lamps | Clear skill shot |
| `NORMAL_PLAY` | Standard gameplay | Enable scoring | - |
| `MODE_ACTIVE` | 007 Mode running | Start mode timer | Award mode bonus |
| `MULTIBALL` | Multiple balls in play | Track ball count | Single ball transition |
| `BALL_DRAINED` | Ball lost | Start ball save timer | Next ball or game over |
| `BALL_SAVE` | Ball save active | Re-serve ball | - |

### 4.3 State Transition Table

| From State | Event | To State | Condition |
|------------|-------|----------|-----------|
| `ATTRACT` | `switch.start` | `GAME_ACTIVE` | Credits > 0 |
| `ATTRACT` | `switch.coin` | `ATTRACT` | Add credit |
| `GAME_ACTIVE` | `switch.plumb_tilt` | `TILT_WARNING` | warnings < 3 |
| `TILT_WARNING` | timeout(3s) | `GAME_ACTIVE` | - |
| `GAME_ACTIVE` | `switch.plumb_tilt` | `TILTED` | warnings >= 3 |
| `BALL_LAUNCH` | `switch.shooter_lane` | `SKILL_SHOT` | ball in shooter |
| `SKILL_SHOT` | `switch.top_lane_*` | `NORMAL_PLAY` | skill shot attempt |
| `NORMAL_PLAY` | `switch.scoop` | `MODE_ACTIVE` | scoop lit |
| `NORMAL_PLAY` | `switch.satellite_shot` | `MULTIBALL` | satellite ready |
| `NORMAL_PLAY` | `switch.outlane` | `BALL_DRAINED` | - |
| `BALL_DRAINED` | ball_save_active | `BALL_SAVE` | timer > 0 |
| `BALL_DRAINED` | game.ball_ended | `BALL_LAUNCH` | balls_remaining > 0 |
| `BALL_DRAINED` | game.game_over | `ATTRACT` | balls_remaining == 0 |

---

## 5. Game Rules Implementation

### 5.1 Skill Shot System

#### Selection (Pre-Launch)
- Flipper buttons cycle selection: `POINTS` → `POPS` → `MODE_LITE` → `2X_SCORING`
- Display shows current selection
- Selection locked when ball leaves shooter lane

#### Awards
| Selection | Target | Award |
|-----------|--------|-------|
| POINTS | Top Lane L | 500,000 |
| POINTS | Top Lane M | 750,000 |
| POINTS | Top Lane R | 1,000,000 |
| POPS | Any Bumper | 100,000 + Super Pops (10s) |
| MODE_LITE | Scoop | Scoop lit for free mode start |
| 2X_SCORING | Any switch | 2X playfield for 30 seconds |

### 5.2 007 Modes (Encounters)

Started by shooting lit Scoop (SW_50). One mode available at start; complete modes to unlock more.

| Mode | Shots Required | Time Limit | Jackpot |
|------|----------------|------------|---------|
| Runway | 3 Ramp Shots | 30s | 1,000,000 |
| Facility | 5 Target Bank hits | 25s | 1,500,000 |
| Silo | 2 Loops + Scoop | 35s | 2,000,000 |
| Train | 4 Spinner Spins (50+) | 20s | 2,500,000 |
| Statue | Left Ramp 3X | 30s | 3,000,000 |
| Archives | Complete both Target Banks | 40s | 3,500,000 |
| Tank | Tank Entrance + 2 Locks | 45s | 4,000,000 |
| Cradle (Wizard) | Satellite Shot | 60s | 10,000,000 |

### 5.3 Combo System

Combos are time-limited shot sequences (2.5 second window).

| Combo Name | Sequence | Multiplier | Points |
|------------|----------|------------|--------|
| Left Orbit | Left Ramp → Left Orbit | 2X | Base × 2 |
| Right Orbit | Right Ramp → Right Orbit | 2X | Base × 2 |
| Super Combo | L Ramp → R Ramp → Scoop | 4X | Base × 4 |
| Satellite Combo | Center Ramp → Satellite | 3X | Base × 3 |

### 5.4 Satellite Multiball Sequence

```
1. Complete Left Target Bank (5 targets) → Light Lock at Left Ramp
2. Shoot Left Ramp → Ball #1 Locked
3. Complete Left Target Bank again → Relight Lock
4. Shoot Left Ramp → Ball #2 Locked
5. Shoot Center Target Bank → Light Satellite Ramp
6. Shoot Left Ramp → Raises Satellite Ramp (C_SATELLITE_RAMP_UP)
7. Shoot Satellite Dish → 5-BALL MULTIBALL STARTS
   - All balls ejected
   - Satellite Jackpot: 1M base, +250K per hit
   - Super Jackpot: Complete targets during MB → 5M at Satellite
```

### 5.5 Tank Multiball Sequence

```
1. Shoot Tank Entrance (SW_36) → Opens Tank Trap Door (C_TANK_TRAP_DOOR)
2. Ball enters Tank → Lock #1 (SW_37)
3. Shoot Tank Entrance again → Lock #2 (SW_38)
4. Shoot Center Target → Light Right Ramp
5. Shoot Right Ramp → 3-BALL MULTIBALL STARTS
   - Tank Jackpot: 750K base at Tank Entrance
   - Double Jackpot: Both locks + Entrance in sequence
```

### 5.6 Satellite Magnet (Magna-Save)

Special mechanic triggered by specific switch sequence near left outlane.

```javascript
// Trigger Condition:
// Ball passes SW_LEFT_RETURN → SW_LEFT_SLING → approaching SW_LEFT_OUTLANE
// If Magna-Save is lit (L_MAGNA_SAVE) and player presses BOTH flippers:
//   Fire C_SATELLITE_MAGNET for 150ms
//   Ball is "caught" and redirected toward flipper
//   Costs 1 Magna-Save charge (max 3 stored)
```

---

## 6. Physics Engine

### 6.1 Scope (Simplified)

This is a **Logic First** simulation. Physics is simplified to:

1. Ball position tracking (X, Y coordinates)
2. Ball velocity (Vx, Vy)
3. Collision detection with playfield elements
4. Flipper rotation and ball deflection
5. Gravity simulation

### 6.2 Physics Constants

```javascript
const Physics = {
    GRAVITY: 0.15,           // pixels/frame² (downward)
    BALL_RADIUS: 12,         // pixels
    FLIPPER_LENGTH: 60,      // pixels
    FLIPPER_ANGULAR_VEL: 15, // degrees/frame (when activated)
    BALL_FRICTION: 0.995,    // velocity multiplier per frame
    BOUNCE_DAMPING: 0.7,     // velocity retention on bounce
    BUMPER_KICK: 8,          // velocity boost from bumpers
    SLING_KICK: 6,           // velocity boost from slingshots
    MAX_VELOCITY: 25         // speed cap
};
```

### 6.3 Collision Zones

Each switch has an associated collision zone:

```javascript
// Example collision zone definition
const CollisionZones = {
    SW_SCOOP: { type: 'circle', x: 150, y: 200, radius: 20, capturesBall: true },
    SW_LEFT_BANK_1: { type: 'rect', x: 50, y: 300, w: 15, h: 30, normal: { x: 1, y: 0 } },
    SW_BUMPER_LEFT: { type: 'circle', x: 200, y: 180, radius: 25, kicks: true },
    // ... etc
};
```

---

## 7. Rendering Layer

### 7.1 Canvas Setup

- **Resolution**: 800 × 1400 pixels (portrait, ~2:3.5 ratio mimicking playfield)
- **Frame Rate**: 60 FPS (requestAnimationFrame)
- **Layers**:
  1. Background (static playfield art)
  2. Lamps (insert overlays)
  3. Ball(s)
  4. Flippers
  5. UI Overlay (score, ball count)

### 7.2 Visual Placeholders

| Element | Shape | Color | Size |
|---------|-------|-------|------|
| Ball | Circle | Silver (#C0C0C0) | r=12px |
| Bumper | Circle | Yellow (#FFD700) | r=25px |
| Target | Rectangle | Green (#32CD32) | 15×30px |
| Flipper | Rounded Rect | Red (#FF4444) | 60×15px |
| Slingshot | Triangle | Blue (#4444FF) | 30×40px |
| Ramp Entrance | Arc | Orange (#FFA500) | 40×20px |
| Scoop | Semi-circle | Purple (#9932CC) | r=20px |
| Outlane | Rectangle | Dark Red (#8B0000) | 20×60px |

### 7.3 Lamp Rendering

```javascript
// Lamps rendered as colored circles with glow effect
function renderLamp(ctx, lamp, state) {
    ctx.save();
    if (state === LampState.ON || isBlinkOn(lamp, state)) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = lamp.color;
        ctx.fillStyle = lamp.color;
    } else {
        ctx.fillStyle = '#333'; // dim
    }
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
```

---

## 8. File Structure

```
/007pinball
├── index.html              # Entry point
├── SPEC.md                 # This specification document
├── README.md               # Project readme
│
├── /src
│   ├── main.js             # Bootstrap and initialization
│   │
│   ├── /config
│   │   └── HardwareConfig.js   # Switch/Lamp/Coil constants
│   │
│   ├── /core
│   │   ├── EventBus.js         # Pub/Sub event system
│   │   ├── GameLoop.js         # Main loop (tick/render)
│   │   └── StateMachine.js     # Hierarchical state machine
│   │
│   ├── /hardware
│   │   ├── SwitchMatrix.js     # Switch input handling
│   │   ├── LampMatrix.js       # Lamp output control
│   │   └── SolenoidDriver.js   # Coil control
│   │
│   ├── /logic
│   │   ├── GameLogic.js        # Main game rules controller
│   │   ├── ModeManager.js      # 007 mode handling
│   │   ├── MultiBall.js        # Multiball logic
│   │   ├── ComboTracker.js     # Combo detection
│   │   └── ScoreManager.js     # Score and bonus calculation
│   │
│   ├── /physics
│   │   ├── PhysicsEngine.js    # Ball physics simulation
│   │   ├── Flipper.js          # Flipper mechanics
│   │   └── CollisionSystem.js  # Collision detection
│   │
│   └── /render
│       ├── Renderer.js         # Main rendering controller
│       ├── PlayfieldRenderer.js# Static playfield drawing
│       ├── LampRenderer.js     # Lamp overlay rendering
│       └── UIRenderer.js       # Score/status display
│
└── /assets
    └── (placeholder - no assets required for MVP)
```

---

## 9. Implementation Phases

### Phase A: Core Engine (Estimated: Foundation)
- [ ] Set up project structure and index.html
- [ ] Implement EventBus (pub/sub)
- [ ] Implement GameLoop (60fps tick)
- [ ] Implement basic StateMachine framework
- [ ] Create HardwareConfig.js with all constants

### Phase B: Hardware Emulation
- [ ] Implement SwitchMatrix (event generation)
- [ ] Implement LampMatrix (state management, blink timers)
- [ ] Implement SolenoidDriver (pulse timing)
- [ ] Wire hardware events through EventBus

### Phase C: Physics/Collision Mockup
- [ ] Implement basic ball physics (gravity, velocity)
- [ ] Implement flipper rotation mechanics
- [ ] Implement collision detection for all zones
- [ ] Map collisions to switch activations

### Phase D: Game Rules
- [ ] Implement Attract mode with lamp show
- [ ] Implement Game Start / Ball Launch sequence
- [ ] Implement Skill Shot system
- [ ] Implement basic scoring (targets, bumpers, ramps)
- [ ] Implement 007 Mode system (at least 3 modes)
- [ ] Implement Combo detection
- [ ] Implement Satellite Multiball
- [ ] Implement Tank Multiball
- [ ] Implement Magna-Save mechanic
- [ ] Implement Ball Save / Extra Ball
- [ ] Implement Bonus countdown and multipliers

### Phase E: Polish (Stretch)
- [ ] Sound effects (Web Audio API)
- [ ] DMD-style display simulation
- [ ] High score persistence (localStorage)
- [ ] Mobile touch controls

---

## Design Decisions (Approved)

| Question | Decision |
|----------|----------|
| Physics Fidelity | **Arcade-style** - Ball moves predictably, always triggers correct switches, forgiving physics. Rule accuracy prioritized over realistic feel. |
| Mode Completeness | **4 Core Modes for MVP** - Runway, Facility, Train, Tank. Remaining modes (Silo, Statue, Archives, Cradle) added in future iteration. |
| Input Method | **Keyboard + Mouse** - Z/X or Shift for flippers, click-and-drag plunger, clickable flipper buttons for mouse-only play. |

---

**SPEC STATUS: APPROVED**

*Implementation may begin.*
