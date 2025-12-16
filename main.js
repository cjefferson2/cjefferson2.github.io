import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- ASSET LOADING ---
let playerModelGeometry = null;
const loader = new GLTFLoader();
loader.load('models/x_space-flyer-chasing_dragons_triangle.glb', function (gltf) {
    playerModelGeometry = gltf.scene;
    playerModelGeometry.scale.set(1.5, 1.5, 1.5); 
    playerModelGeometry.rotation.y = -Math.PI / 2;
}, undefined, function (error) {
    console.error(error);
});

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- CAMERA POSITION ---
camera.position.set(0, 15, 25);
camera.lookAt(0, 0, 0);

// --- STARFIELD ---
const starGeometry = new THREE.BufferGeometry();
const starCount = 10000;
const starPositions = new Float32Array(starCount * 3);
for(let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 2000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// --- GAME STATE ---
let gameState = 'main_menu'; 
let prototypeMode = false;
let playerSpeed = 0;
const playerMaxSpeed = 25;
const playerAcceleration = 60;
const playerFriction = 40;

const keys = {};
let lastShotTime = 0;
let shootCooldown = 0.4;

let enemyDirection = 1;
let enemyMoveSpeed = 2;
const initialShootProbability = 0.1;
const enemyStepDown = 1.5;
const bounds = { left: -25, right: 25 };
let showCrosshair = false;
let coinCount = 0;
let directionChangeCount = 0;
let level = 1;
let speedMultiplier = 1.0;

let upgrades = {
    crosshair: 0,
    sideThrusters: 0,
    mainThruster: 0,
    reloadSpeed: 0,
    gunBarrel: 0,
};

const powerupDuration = 10;
let powerups = [];
let explosiveActive = false;
let explosiveTimer = 0;
let pierceActive = false;
let pierceTimer = 0;
let inkedActive = false;
let inkedTimer = 0;
let lives = 2;
let devMode = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let ufoActive = false;

// --- UI ELEMENTS ---
const gameOverUI = document.getElementById('game-over');
const youWinUI = document.getElementById('you-win');
const coinCounterUI = document.getElementById('coin-counter');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const livesCounter = document.getElementById('lives-counter');
const mainMenuUI = document.getElementById('main-menu');
const pauseMenuUI = document.getElementById('pause-menu');
const shopMenuUI = document.getElementById('shop-menu');
const startGameBtn = document.getElementById('start-game-btn');
const shopBtn = document.getElementById('shop-btn');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const prototypeModeCheckbox = document.getElementById('prototype-mode-checkbox');
const canvas = document.getElementById('game-canvas');
const explosiveHud = document.getElementById('explosive-hud');
const explosiveBar = document.getElementById('explosive-bar');
const pierceHud = document.getElementById('pierce-hud');
const pierceBar = document.getElementById('pierce-bar');
const inkedHud = document.getElementById('inked-hud');
const inkedBar = document.getElementById('inked-bar');
const devModeIndicator = document.getElementById('dev-mode-indicator');

const shopElements = {
    crosshair: { lvl: document.getElementById('crosshair-lvl'), btn: document.getElementById('buy-crosshair-btn') },
    sideThrusters: { lvl: document.getElementById('side-thrusters-lvl'), btn: document.getElementById('buy-side-thrusters-btn') },
    mainThruster: { lvl: document.getElementById('main-thruster-lvl'), btn: document.getElementById('buy-main-thruster-btn') },
    reloadSpeed: { lvl: document.getElementById('reload-speed-lvl'), btn: document.getElementById('buy-reload-speed-btn') },
    gunBarrel: { lvl: document.getElementById('gun-barrel-lvl'), btn: document.getElementById('buy-gun-barrel-btn') }
};

// --- GAME OBJECTS ---
let player, bullets, enemyBullets, enemyInkerBullets, enemies, coins, enemyGroup, crosshair, ufo;

// --- INITIALIZATION ---
function initGameObjects() {
    if (player) scene.remove(player);
    if (enemyGroup) scene.remove(enemyGroup);
    if (crosshair) scene.remove(crosshair);
    if (ufo) scene.remove(ufo);
    coins?.forEach(c => scene.remove(c));
    enemyBullets?.forEach(eb => scene.remove(eb));
    enemyInkerBullets?.forEach(eib => scene.remove(eib));
    bullets?.forEach(b => scene.remove(b));
    powerups?.forEach(p => scene.remove(p));

    player = createPlayer();
    bullets = [];
    enemyBullets = [];
    enemyInkerBullets = [];
    enemies = createEnemies();
    coins = [];
    powerups = [];
    enemyGroup = new THREE.Group();
    enemies.forEach(enemy => enemyGroup.add(enemy));
    crosshair = createCrosshair();
    crosshair.visible = (upgrades.crosshair > 0) && showCrosshair;

    scene.add(player, enemyGroup, crosshair);

    enemyMoveSpeed = 2;
    directionChangeCount = 0;
    enemyGroup.position.set(0, 0, 0);
    enemyDirection = 1;
    explosiveActive = false;
    explosiveTimer = 0;
    pierceActive = false;
    pierceTimer = 0;
    inkedActive = false;
    inkedTimer = 0;
    ufoActive = false;
    score = 0;
    
    explosiveHud.classList.add('hidden');
    pierceHud.classList.add('hidden');
    inkedHud.classList.add('hidden');
    lives = 2;
    livesCounter.textContent = `Lives: ${lives}`;
    scoreDisplay.textContent = `Score: ${score}`;
    highScoreDisplay.textContent = `High Score: ${highScore}`;
}

// --- FACTORIES ---
function createPlayer() {
    let playerMesh;
    if (playerModelGeometry && !prototypeMode) {
        playerMesh = playerModelGeometry.clone();
    } else {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        playerMesh = new THREE.Mesh(geometry, material);
    }
    playerMesh.position.y = 0;
    playerMesh.position.z = 15;
    return playerMesh;
}

function createBullet(origin) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(origin.position);
    bullet.position.z -= 2;
    bullet.userData.hits = 0;
    bullets.push(bullet);
    scene.add(bullet);
}

function createEnemies() {
    const levelFactor = 3 + (level * 0.4);
    const staticVariance = 4;
    const rollRows = 3 + Math.floor(Math.random() * levelFactor) + Math.floor(Math.random() * staticVariance);
    const rollCols = 3 + Math.floor(Math.random() * levelFactor) + Math.floor(Math.random() * staticVariance);
    
    const rows = rollRows;
    const cols = rollCols;
    const spacingX = 4;
    const spacingZ = 3;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -15;

    const enemyGrid = [];

    for (let row = 0; row < rows; row++) {
        const isBackRow = row === (rows - 1);
        let type = 'red';
        let color = 0xff0000;
        let size = 1.8; 

        if (isBackRow) {
            type = 'blue';
            color = 0x0000ff;
        } else {
            const middleRow = rows / 2;
            const distFromMiddle = Math.abs(row - middleRow);
            const inkerChance = 0.6 - (distFromMiddle * 0.2); 
            if (Math.random() < inkerChance) {
                type = 'inker';
                color = 0x4b0082; 
                size = 1.4;
            }
        }

        for (let col = 0; col < cols; col++) {
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({ color });
            const enemy = new THREE.Mesh(geometry, material);
            enemy.position.set(startX + col * spacingX, 0, startZ + row * -spacingZ);
            enemy.userData.type = type;
            enemyGrid.push(enemy);
        }
    }
    return enemyGrid;
}

function createUFO() {
    const geometry = new THREE.BoxGeometry(5, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    ufo = new THREE.Mesh(geometry, material);
    const startLeft = Math.random() < 0.5;
    ufo.position.set(startLeft ? -40 : 40, 0, -35);
    ufo.userData.direction = startLeft ? 1 : -1;
    scene.add(ufo);
    ufoActive = true;
}

function createEnemyBullet(origin) {
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(origin);
    bullet.userData.velocity = new THREE.Vector3(0, 0, 1);
    enemyBullets.push(bullet);
    scene.add(bullet);
}

function createInkerBullet(origin) {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(origin);
    bullet.userData.velocity = new THREE.Vector3(0, 0, 1);
    enemyInkerBullets.push(bullet);
    scene.add(bullet);
}

function createCoin(position) {
    const geometry = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const coin = new THREE.Mesh(geometry, material);
    coin.position.copy(position);
    coin.rotation.x = Math.PI / 2;
    coins.push(coin);
    scene.add(coin);
}

function createPowerup(position, type) {
    const color = type === 'explosive' ? 0xff00ff : 0x00ffff;
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({ color, emissive: color });
    const powerup = new THREE.Mesh(geometry, material);
    powerup.position.copy(position);
    powerup.userData.type = type;
    powerups.push(powerup);
    scene.add(powerup);
}

function createCrosshair() {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -30)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.position.y = 0.5;
    return line;
}

function createFloatingText(text, position3D, color) {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = 'floating-text';
    div.style.color = color;
    const vector = position3D.clone();
    vector.project(camera);
    const x = (vector.x * .5 + .5) * window.innerWidth;
    const y = (-(vector.y * .5) + .5) * window.innerHeight;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    document.getElementById('game-ui-container').appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

// --- SHOP LOGIC ---
function calculateCost(level) { return 10 + level * 5; }

function updateShopItemUI(upgradeKey, baseText) {
    const level = upgrades[upgradeKey];
    const cost = calculateCost(level);
    const ui = shopElements[upgradeKey];
    ui.lvl.textContent = `${baseText} - Lvl ${level}`;
    ui.btn.textContent = `Buy (${cost} Coins)`;
    ui.btn.disabled = coinCount < cost;
}

function purchaseUpgrade(upgradeKey) {
    const isCrosshair = upgradeKey === 'crosshair';
    const currentLevel = upgrades[upgradeKey];
    const cost = isCrosshair ? 10 : calculateCost(currentLevel);
    if (coinCount >= cost) {
        if (isCrosshair && currentLevel > 0) return;
        coinCount -= cost;
        upgrades[upgradeKey]++;
        coinCounterUI.textContent = `Coins: ${coinCount}`;
        showShopMenu();
    }
}

// --- MENU & GAME FLOW ---
function showMainMenu() {
    gameState = 'main_menu';
    mainMenuUI.classList.remove('hidden');
    shopMenuUI.classList.add('hidden');
    pauseMenuUI.classList.add('hidden');
    gameOverUI.classList.add('hidden');
    youWinUI.classList.add('hidden');
    canvas.classList.add('hidden');
}

function showShopMenu() {
    gameState = 'shop';
    shopMenuUI.classList.remove('hidden');
    mainMenuUI.classList.add('hidden');
    if (upgrades.crosshair > 0) {
        shopElements.crosshair.btn.textContent = 'Owned';
        shopElements.crosshair.btn.disabled = true;
    } else {
        const cost = 10;
        shopElements.crosshair.btn.textContent = `Buy (${cost} Coins)`;
        shopElements.crosshair.btn.disabled = coinCount < cost;
    }
    updateShopItemUI('sideThrusters', 'Side Thrusters (Handling)');
    updateShopItemUI('mainThruster', 'Main Thruster (Power)');
    updateShopItemUI('reloadSpeed', 'Reload Speed (Fire Rate)');
    updateShopItemUI('gunBarrel', 'Gun Barrel Length');
}

function startGame() {
    gameState = 'playing';
    mainMenuUI.classList.add('hidden');
    pauseMenuUI.classList.add('hidden');
    canvas.classList.remove('hidden');
    initGameObjects();
}

function pauseGame() {
    gameState = 'paused';
    pauseMenuUI.classList.remove('hidden');
}

function resumeGame() {
    gameState = 'playing';
    pauseMenuUI.classList.add('hidden');
}

function startNextLevel() {
    level++;
    speedMultiplier += 0.1;
    bullets.forEach(b => scene.remove(b));
    bullets.length = 0;
    enemyBullets.forEach(eb => scene.remove(eb));
    enemyBullets.length = 0;
    enemyInkerBullets.forEach(eib => scene.remove(eib));
    enemyInkerBullets.length = 0;
    powerups.forEach(p => scene.remove(p));
    powerups.length = 0;
    playLevelTransition();
}

function playLevelTransition() {
    gameState = 'transition';
}

function addScore(points) {
    score += points;
    scoreDisplay.textContent = `Score: ${score}`;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }
}

// --- EVENT LISTENERS ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
        devMode = !devMode;
        devMode ? devModeIndicator.classList.remove('hidden') : devModeIndicator.classList.add('hidden');
    }
    if (devMode) {
        if (e.code === 'KeyM') { coinCount += 1000; coinCounterUI.textContent = `Coins: ${coinCount}`; }
        if (e.code === 'KeyP') {
            const type = Math.random() < 0.5 ? 'explosive' : 'pierce';
            const spawnPos = player.position.clone();
            spawnPos.y = 0; spawnPos.z -= 20;
            createPowerup(spawnPos, type);
        }
        if (e.code === 'KeyU' && !ufoActive) createUFO();
    }
    if (e.code === 'Escape' && gameState === 'playing') pauseGame();
    if (gameState === 'playing') {
        keys[e.code] = true;
        if (e.code === 'Space') {
            const currentCooldown = shootCooldown / (1 + upgrades.reloadSpeed * 0.2);
            const now = clock.getElapsedTime();
            if (now - lastShotTime > currentCooldown) { createBullet(player); lastShotTime = now; }
        } else if (e.code === 'KeyC' && upgrades.crosshair > 0) {
            showCrosshair = !showCrosshair;
            crosshair.visible = showCrosshair;
        }
    } else if (gameState === 'game_over' || gameState === 'win') {
        if (e.code === 'Enter' || e.code === 'Space') showMainMenu();
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('resize', onWindowResize);

startGameBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', resumeGame);
quitBtn.addEventListener('click', showMainMenu);
shopBtn.addEventListener('click', showShopMenu);
backToMenuBtn.addEventListener('click', showMainMenu);
prototypeModeCheckbox.addEventListener('change', (e) => { prototypeMode = e.target.checked; });

shopElements.crosshair.btn.addEventListener('click', () => purchaseUpgrade('crosshair'));
shopElements.sideThrusters.btn.addEventListener('click', () => purchaseUpgrade('sideThrusters'));
shopElements.mainThruster.btn.addEventListener('click', () => purchaseUpgrade('mainThruster'));
shopElements.reloadSpeed.btn.addEventListener('click', () => purchaseUpgrade('reloadSpeed'));
shopElements.gunBarrel.btn.addEventListener('click', () => purchaseUpgrade('gunBarrel'));

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- GAME LOGIC ---
function updatePlayer(delta) {
    if (!player) return;
    let currentFriction = playerFriction * (1 + upgrades.sideThrusters * 0.25);
    let currentAcceleration = playerAcceleration * (1 + upgrades.mainThruster * 0.15);
    let currentMaxSpeed = playerMaxSpeed;
    if (inkedActive) { currentFriction *= 0.3; currentAcceleration *= 0.3; currentMaxSpeed *= 0.3; }

    const leftPressed = keys['ArrowLeft'] || keys['KeyA'];
    const rightPressed = keys['ArrowRight'] || keys['KeyD'];

    if (!leftPressed && !rightPressed) {
        if (playerSpeed > 0) { playerSpeed -= currentFriction * delta; playerSpeed = Math.max(0, playerSpeed); }
        else if (playerSpeed < 0) { playerSpeed += currentFriction * delta; playerSpeed = Math.min(0, playerSpeed); }
    }
    if (leftPressed) playerSpeed -= currentAcceleration * delta;
    if (rightPressed) playerSpeed += currentAcceleration * delta;
    
    playerSpeed = THREE.MathUtils.clamp(playerSpeed, -currentMaxSpeed, currentMaxSpeed);
    player.position.x += playerSpeed * delta;
    player.position.x = Math.max(bounds.left, Math.min(bounds.right, player.position.x));
    if (crosshair) crosshair.position.copy(player.position);
}

function updateBullets(delta) {
    if (!bullets) return;
    const baseBulletSpeed = 50;
    const currentBulletSpeed = baseBulletSpeed * (1 + upgrades.gunBarrel * 0.15);
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.z -= currentBulletSpeed * delta;
        if (bullet.position.z < -60) { scene.remove(bullet); bullets.splice(i, 1); }
    }
}

function updateCoins(delta) {
    if (!coins || !player) return;
    const coinFallSpeed = 10;
    const playerBox = new THREE.Box3().setFromObject(player);
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.position.z += coinFallSpeed * delta;
        const coinBox = new THREE.Box3().setFromObject(coin);
        if (coinBox.intersectsBox(playerBox)) {
            scene.remove(coin); coins.splice(i, 1);
            coinCount++; coinCounterUI.textContent = `Coins: ${coinCount}`;
            continue;
        }
        if (coin.position.z > player.position.z + 5) { scene.remove(coin); coins.splice(i, 1); }
    }
}

function updatePowerups(delta) {
    if (!powerups || !player) return;
    const powerupFallSpeed = 8;
    const playerBox = new THREE.Box3().setFromObject(player);
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.position.z += powerupFallSpeed * delta;
        const powerupBox = new THREE.Box3().setFromObject(powerup);
        if (powerupBox.intersectsBox(playerBox)) {
            if (powerup.userData.type === 'explosive') { explosiveActive = true; explosiveTimer = powerupDuration; explosiveHud.classList.remove('hidden'); }
            else if (powerup.userData.type === 'pierce') { pierceActive = true; pierceTimer = powerupDuration; pierceHud.classList.remove('hidden'); }
            scene.remove(powerup); powerups.splice(i, 1); continue;
        }
        if (powerup.position.z > player.position.z + 5) { scene.remove(powerup); powerups.splice(i, 1); }
    }
}

function updatePowerupTimers(delta) {
    if (explosiveActive) {
        explosiveTimer -= delta; explosiveBar.style.width = `${(explosiveTimer / powerupDuration) * 100}%`;
        if (explosiveTimer <= 0) { explosiveActive = false; explosiveHud.classList.add('hidden'); }
    }
    if (pierceActive) {
        pierceTimer -= delta; pierceBar.style.width = `${(pierceTimer / powerupDuration) * 100}%`;
        if (pierceTimer <= 0) { pierceActive = false; pierceHud.classList.add('hidden'); }
    }
    if (inkedActive) {
        inkedTimer -= delta; inkedBar.style.width = `${(inkedTimer / 5.0) * 100}%`;
        if (inkedTimer <= 0) { inkedActive = false; inkedHud.classList.add('hidden'); }
    }
}

function updateEnemyShooting(delta) {
    if (!enemyGroup) return;
    const currentSpeed = enemyMoveSpeed * speedMultiplier;
    const speedMultiplierForShooting = currentSpeed / 2;
    const currentShootProbability = initialShootProbability * speedMultiplierForShooting;
    enemyGroup.children.forEach(enemy => {
        if (enemy.userData.type === 'blue' || enemy.userData.type === 'inker') {
            if (Math.random() < currentShootProbability * delta) {
                const enemyWorldPos = new THREE.Vector3(); enemy.getWorldPosition(enemyWorldPos);
                if (enemy.userData.type === 'blue') createEnemyBullet(enemyWorldPos);
                else createInkerBullet(enemyWorldPos);
            }
        }
    });
}

function updateEnemyBullets(delta) {
    if (!enemyBullets) return;
    const bulletSpeed = 15;
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.position.addScaledVector(bullet.userData.velocity, bulletSpeed * delta);
        if (bullet.position.z > player.position.z + 10 || Math.abs(bullet.position.x) > bounds.right + 10) { scene.remove(bullet); enemyBullets.splice(i, 1); }
    }
}

function updateInkerBullets(delta) {
    if (!enemyInkerBullets || !player) return;
    const bulletSpeed = 12;
    const playerBox = new THREE.Box3().setFromObject(player);
    for (let i = enemyInkerBullets.length - 1; i >= 0; i--) {
        const bullet = enemyInkerBullets[i];
        bullet.position.addScaledVector(bullet.userData.velocity, bulletSpeed * delta);
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        if (bulletBox.intersectsBox(playerBox)) {
            scene.remove(bullet); enemyInkerBullets.splice(i, 1);
            inkedActive = true; inkedTimer = 5.0; inkedHud.classList.remove('hidden'); continue;
        }
        if (bullet.position.z > player.position.z + 10 || Math.abs(bullet.position.x) > bounds.right + 10) { scene.remove(bullet); enemyInkerBullets.splice(i, 1); }
    }
}

function updateEnemies(delta) {
    if (!enemyGroup) return;
    const currentSpeed = enemyMoveSpeed * speedMultiplier;
    enemyGroup.position.x += enemyDirection * currentSpeed * delta;
    let hitBounds = false;
    enemyGroup.children.forEach(enemy => {
        const enemyWorldPos = new THREE.Vector3(); enemy.getWorldPosition(enemyWorldPos);
        if (enemyWorldPos.x > bounds.right || enemyWorldPos.x < bounds.left) hitBounds = true;
    });
    if (hitBounds) {
        enemyDirection *= -1; enemyGroup.position.z += enemyStepDown;
        directionChangeCount++;
        if (directionChangeCount % 3 === 0) enemyMoveSpeed *= 1.17;
    }
}

function updateUFO(delta) {
    if (!ufoActive) {
        if (Math.random() < 0.05 * delta) createUFO();
    } else {
        if (!ufo) return;
        ufo.position.x += ufo.userData.direction * 10 * delta;
        if (Math.abs(ufo.position.x) > 50) { scene.remove(ufo); ufoActive = false; }
    }
}

function checkCollisions() {
    if (!enemyGroup || !player) return;
    const playerBox = new THREE.Box3().setFromObject(player);

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue;
        const bulletBox = new THREE.Box3().setFromObject(bullet);

        for (let j = enemyGroup.children.length - 1; j >= 0; j--) {
            const enemy = enemyGroup.children[j];
            if (!enemy) continue;
            const enemyBox = new THREE.Box3().setFromObject(enemy);

            if (bulletBox.intersectsBox(enemyBox)) {
                let enemiesToDestroy = [enemy];
                let bulletDestroyed = true;
                if (typeof bullet.userData.hits === 'undefined') bullet.userData.hits = 0;

                if (bullet.userData.hits === 0 && (devMode || Math.random() < 0.25)) {
                    const type = Math.random() < 0.5 ? 'explosive' : 'pierce';
                    createPowerup(enemy.getWorldPosition(new THREE.Vector3()), type);
                }

                if (explosiveActive) {
                    const explosionRadiusX = 4.5; const explosionRadiusZ = 3.5;
                    enemyGroup.children.forEach(otherEnemy => {
                        if (otherEnemy !== enemy) {
                            const distZ = Math.abs(otherEnemy.position.z - enemy.position.z);
                            const distX = Math.abs(otherEnemy.position.x - enemy.position.x);
                            if ((distX < explosionRadiusX && distZ < 1) || (distZ < explosionRadiusZ && distX < 1)) {
                                if (!enemiesToDestroy.includes(otherEnemy)) enemiesToDestroy.push(otherEnemy);
                            }
                        }
                    });
                }
                
                if (pierceActive) { bullet.userData.hits++; if (bullet.userData.hits < 3) bulletDestroyed = false; }
                
                enemiesToDestroy.forEach(e => {
                    const indexInGroup = enemyGroup.children.indexOf(e);
                    if (indexInGroup > -1) {
                        const enemyWorldPos = new THREE.Vector3(); e.getWorldPosition(enemyWorldPos);
                        if (e.userData.type === 'red') { addScore(20); createFloatingText("+20", enemyWorldPos, '#ff0000'); }
                        else if (e.userData.type === 'inker') { addScore(30); createFloatingText("+30", enemyWorldPos, '#d000ff'); }
                        else if (e.userData.type === 'blue') { addScore(40); createFloatingText("+40", enemyWorldPos, '#0000ff'); }
                        enemyGroup.remove(e); createCoin(enemyWorldPos);
                    }
                });

                if (bulletDestroyed) { scene.remove(bullet); bullets.splice(i, 1); break; }
            }
        }
        
        if (ufoActive && ufo) {
            const ufoBox = new THREE.Box3().setFromObject(ufo);
            if (bulletBox.intersectsBox(ufoBox)) {
                scene.remove(ufo); ufoActive = false; scene.remove(bullet); bullets.splice(i, 1);
                const bonus = [50, 100, 150][Math.floor(Math.random() * 3)];
                addScore(bonus); createFloatingText("+" + bonus, ufo.position, '#ffffff');
                continue;
            }
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        if (bulletBox.intersectsBox(playerBox)) { scene.remove(bullet); enemyBullets.splice(i, 1); loseLife(); return; }
    }

    for (let i = enemyGroup.children.length - 1; i >= 0; i--) {
        const enemy = enemyGroup.children[i];
        const enemyBox = new THREE.Box3().setFromObject(enemy);
        if (enemyBox.intersectsBox(playerBox)) { loseLife(); return; }
        const enemyWorldPos = new THREE.Vector3(); enemy.getWorldPosition(enemyWorldPos);
        if (enemyWorldPos.z > player.position.z) { loseLife(); return; }
    }
}

function checkWinCondition() {
    if (gameState === 'playing' && enemyGroup && enemyGroup.children.length === 0) startNextLevel();
}

function loseLife() {
    if (gameState !== 'playing') return;
    lives--; livesCounter.textContent = `Lives: ${lives}`;
    enemyBullets.forEach(eb => scene.remove(eb)); enemyBullets.length = 0;
    enemyInkerBullets.forEach(eib => scene.remove(eib)); enemyInkerBullets.length = 0;
    if (lives <= 0) setGameOver();
}

function setGameOver() {
    gameState = 'game_over'; gameOverUI.classList.remove('hidden'); scene.remove(player);
}

// --- RENDER LOOP ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (gameState === 'playing') {
        updatePlayer(delta); updateBullets(delta); updateEnemyBullets(delta); updateInkerBullets(delta);
        updateCoins(delta); updatePowerups(delta); updatePowerupTimers(delta);
        updateEnemyShooting(delta); updateEnemies(delta); updateUFO(delta);
        checkCollisions(); checkWinCondition();
    }
    if (gameState === 'transition') {
        player.position.z -= 60 * delta;
        if (crosshair) crosshair.position.copy(player.position);
        if (player.position.z < -50) {
            gameState = 'playing'; player.position.set(0, 0, 15);
            if (crosshair) crosshair.position.copy(player.position);
            enemies = createEnemies();
            enemies.forEach(enemy => enemyGroup.add(enemy));
            enemyGroup.position.set(0, 0, 0); enemyDirection = 1; directionChangeCount = 0; enemyMoveSpeed = 2; 
        }
    }
    if (gameState !== 'main_menu' && gameState !== 'shop') renderer.render(scene, camera);
}

showMainMenu();
animate();
