# 3D Space Invaders Clone - Feature Summary

This document summarizes the current features implemented in the 3D Space Invaders clone.

## Core Gameplay Mechanics

*   **3D Environment:** The game is built using `THREE.js`, rendering a space environment with 3D models for all entities.
*   **Player Ship:**
    *   Controlled by the player (represented as a green cube).
    *   Movable left and right across the bottom of the screen.
    *   Fires white spherical bullets upwards.
*   **Enemy Invaders:**
    *   Primary enemies are red cubes, moving in a grid formation.
    *   Move side-to-side and periodically advance downwards towards the player.
    *   **New Enemy Type:** The back rank of the enemy formation is replaced by blue cubes.
        *   Blue enemies shoot yellow spherical bullets directly towards the player's line of movement.
        *   Their bullets pass through other enemies and only collide with the player.
*   **Game Objectives:**
    *   **Win Condition:** Destroy all enemy invaders.
    *   **Lose Condition:** Player loses all lives, or enemies reach the player's line.

## User Interface & Game Flow

*   **Main Menu:**
    *   Appears on game launch or when quitting from an in-game menu.
    *   Options: "Start Game" and "Shop".
*   **Pause Menu:**
    *   Accessible by pressing the `Escape` key during gameplay.
    *   Options: "Resume" game or "Quit to Main Menu".
*   **Game Over/You Win Screens:** Display appropriate messages and return to the Main Menu upon user input.
*   **Persistent HUD:**
    *   **Coin Counter:** Displays the player's current coin balance (top-left, always visible).
    *   **Lives Counter:** Displays remaining player lives (bottom-left).
    *   **Power-up Indicators:** Bars show active power-ups and their remaining duration.

## Difficulty & Progression

*   **Enemy Advancement:** Enemies advance towards the player three times further with each downward step.
*   **Dynamic Enemy Speed:** Enemies' side-to-side movement speed increases by 1.17x every three times they change horizontal direction (hit a boundary).
*   **Linked Firing Rate:** The firing rate of blue enemies is directly proportional to their current side-to-side movement speed, with a doubled base rate compared to initial settings.

## Economy & Upgrades

*   **Coin System:**
    *   Enemies drop golden cylindrical coins upon destruction.
    *   Coins fall towards the player and are collected on collision.
    *   Collected coins are added to the player's total.
*   **Shop:**
    *   Accessible from the Main Menu.
    *   **Crosshair Aim-Assist:** A purchasable upgrade for 10 coins.
        *   Activates a green aiming line from the player's ship.
        *   Toggleable with the 'C' key after purchase.
        *   The purchase is permanent across game restarts.

## Power-up System

*   **Power-up Drops:**
    *   Enemies have a 10% chance to drop a power-up upon destruction.
    *   Only the first enemy hit by a player's bullet can trigger a power-up drop (subsequent hits from piercing/explosive effects do not).
    *   Power-ups fall towards the player and are collected on collision.
    *   Each power-up lasts for 10 seconds.
*   **Types of Power-ups:**
    *   **Explosive Bullets (Magenta Icon):** Player bullets explode on impact, destroying the hit enemy and any other enemies within a 1-Manhattan distance ('+' shape) around it.
    *   **Piercing Bullets (Cyan Icon):** Player bullets can pierce through up to 2 enemies, hitting a total of 3 targets before being destroyed.
*   **Combinable Effects:** Both Explosive and Piercing power-ups can be active simultaneously.

## Player Survivability

*   **Lives System:**
    *   Player starts with 2 lives.
    *   Losing a life occurs when hit by an enemy bullet or when enemies reach the player's line.
    *   Upon losing a life, all enemy bullets on screen are cleared, providing a brief moment of relief.
    *   The game ends only when all lives are depleted.
