# 3D Space Invaders Clone - Feature Summary

This document details the features implemented in the 3D Space Invaders clone.

## Core Gameplay

*   **Infinite Onslaught:** The game features infinite waves of enemies.
    *   **Level Transition:** Between waves, the player ship performs a warp-speed flyover animation.
    *   **Difficulty Scaling:** Each level increases overall enemy speed and firing rate by an additive 10%.
*   **Player Physics:**
    *   **Momentum:** The ship has weight, featuring acceleration and friction (drifting) rather than instant movement.
    *   **3D Model:** The player pilots a detailed 3D spaceship (`x_space-flyer` model), scaled to 1.5x its previous size.
    *   **Prototype Mode:** A toggle in the main menu allows switching between the 3D model and a simple hitbox primitive.
*   **Starfield:** A procedurally generated background with 10,000 stars provides depth.

## Enemies & AI

The enemy formation is randomized every level and is symmetrical, featuring distinct classes. The dimensions (rows and columns) are dynamically generated:
*   **Formation Scaling:** Starts with smaller formations (e.g., 3-9 range for rows/cols at Level 1), and progressively biases towards larger formations (e.g., 3-13 range at Level 10) as the game level increases. This ensures a gradual difficulty curve while still allowing for random "insane" waves to appear earlier.

1.  **Red Invader (Grunt):**
    *   Standard enemy type (10% smaller than original size).
    *   Worth **20 points**.
2.  **Blue Invader (Shooter):**
    *   Spawns exclusively in the **back ranks**.
    *   Fires lethal yellow projectiles directly down the player's lane.
    *   Firing rate increases with movement speed.
    *   Worth **40 points**.
3.  **Inker (Debuffer):**
    *   **Appearance:** Distinct purple enemies (30% smaller than original size).
    *   **Spawn:** Favors the **middle ranks** of the formation.
    *   **Attack:** Fires dark "ink" projectiles.
    *   **Effect:** Does **not damage** the player. Instead, applies an **"Inked" status effect** for 5 seconds, reducing player speed and acceleration by 70%.
    *   Worth **30 points**.
4.  **UFO (Mystery Ship):**
    *   Rare spawn (5% chance/sec) that flies across the top background.
    *   Worth **50, 100, or 150 points** when destroyed.

## Economy & Progression

*   **Coins:** Enemies drop coins that must be collected by the player.
*   **Shop System:** A comprehensive upgrade shop is available from the main menu.
    *   **Crosshair:** Purchasable visual aid (toggle with 'C').
    *   **Side Thrusters:** Upgrade handling (friction/braking).
    *   **Main Thruster:** Upgrade acceleration.
    *   **Reload Speed:** Reduce fire cooldown.
    *   **Gun Barrel:** Increase bullet flight speed.
    *   *Note: Upgrades are tiered (Lvl 1, 2, 3...) and costs increase by 5 coins per level.*

## Combat & Power-ups

*   **Lives System:** Player starts with 2 lives. Taking damage clears screen of projectiles and deducts a life.
*   **Scoring:** High scores are saved locally (`localStorage`) and displayed on the top-left section of the HUD.
*   **Bullet Range:** Player bullets travel further, allowing hits on the UFO and back-rank enemies in large formations.
*   **Power-up Drops:**
    *   **Drop Logic:** 25% chance to spawn from the **first enemy hit** by a bullet.
    *   **Explosive (Magenta):** Bullets destroy the target and all adjacent enemies in a '+' pattern.
    *   **Piercing (Cyan):** Bullets travel through enemies, destroying up to 3 targets.
    *   *Both effects can be active simultaneously.*

## Developer Tools

*   **Dev Mode:** Toggle with `~` (Tilde).
    *   `M`: Add 1000 coins.
    *   `P`: Force spawn a power-up.
    *   `U`: Force spawn a UFO.
    *   Forced 100% drop rate for power-ups on first hit.
