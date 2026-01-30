const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game State
let gameRunning = false;
let score = 0;
let kills = 0;
let lives = 3;
let lastScoreTime = 0;
let lastDifficultyIncrease = 0;
let alienSpawnRate = 2000;
let aliensPerSpawn = 1;
let alienShootFrequency = 2000;

// Arrays to hold game objects
let spaceship = null;
let aliens = [];
let bullets = [];
let enemyBullets = [];
let mysteryBoxes = [];
let particles = [];

// Active effects
let activeEffects = [];

// Spaceship Class
class Spaceship {
    constructor() {
        this.width = 40;
        this.height = 30;
        this.x = 100;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.gravity = 0.5;
        this.jumpStrength = -8;
        this.lastShot = 0;
        this.shootInterval = 400;
        this.invincible = false;
    }

    update(deltaTime) {
        // Apply gravity
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Boundary check - top
        if (this.y < 0) {
            if (!this.invincible) {
                loseLife();
            }
            this.y = 0;
            this.velocity = 0;
        }
        
        // Boundary check - bottom
        if (this.y + this.height > canvas.height) {
            if (!this.invincible) {
                loseLife();
            }
            this.y = canvas.height - this.height;
            this.velocity = 0;
        }

        // Auto shoot
        this.lastShot += deltaTime;
        if (this.lastShot >= this.shootInterval) {
            this.shoot();
            this.lastShot = 0;
        }
    }

    jump() {
        this.velocity = this.jumpStrength;
    }

    shoot() {
        bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2, 1));
    }

    draw() {
        // Simple pixel art spaceship
        ctx.fillStyle = this.invincible ? '#ffff00' : '#00d4ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 25, this.y + 10, 10, 10);
        
        // Wings
        ctx.fillStyle = this.invincible ? '#ffdd00' : '#00a8cc';
        ctx.fillRect(this.x, this.y - 5, 15, 5);
        ctx.fillRect(this.x, this.y + this.height, 15, 5);
        
        // Engine glow
        if (!this.invincible) {
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(this.x - 5, this.y + 12, 5, 6);
        }
    }
}

// Alien Class
class Alien {
    constructor() {
        this.width = 35;
        this.height = 35;
        this.x = canvas.width;
        this.y = Math.random() * (canvas.height - this.height - 100) + 50;
        this.speed = 2 + Math.random() * 2;
        this.lastShot = Math.random() * alienShootFrequency;
    }

    update(deltaTime) {
        this.x -= this.speed;

        // Shoot at spaceship
        this.lastShot += deltaTime;
        if (this.lastShot >= alienShootFrequency && this.x < canvas.width - 100 && this.x > 100) {
            this.shoot();
            this.lastShot = 0;
        }
    }

    shoot() {
        enemyBullets.push(new Bullet(this.x, this.y + this.height / 2, -1));
    }

    draw() {
        // Simple pixel art alien
        ctx.fillStyle = '#ff006e';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 8, this.y + 10, 8, 8);
        ctx.fillRect(this.x + 20, this.y + 10, 8, 8);
        
        // Pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 10, this.y + 12, 4, 4);
        ctx.fillRect(this.x + 22, this.y + 12, 4, 4);
        
        // Antennae
        ctx.fillStyle = '#ff006e';
        ctx.fillRect(this.x + 12, this.y - 5, 3, 5);
        ctx.fillRect(this.x + 20, this.y - 5, 3, 5);
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, direction) {
        this.width = 10;
        this.height = 4;
        this.x = x;
        this.y = y;
        this.speed = 8;
        this.direction = direction; // 1 for player, -1 for enemy
    }

    update() {
        this.x += this.speed * this.direction;
    }

    draw() {
        ctx.fillStyle = this.direction === 1 ? '#00ff00' : '#ff0000';
        ctx.fillRect(this.x, this.y - this.height / 2, this.width, this.height);
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.direction === 1 ? '#00ff00' : '#ff0000';
        ctx.fillRect(this.x, this.y - this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// Mystery Box Class
class MysteryBox {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (canvas.width - 200) + 100;
        this.y = -this.height;
        this.velocity = 0;
        this.gravity = 0.3;
        this.rotation = 0;
        this.effects = [
            { type: 'good', name: '❤️ Extra Life', action: () => gainLife() },
            { type: 'good', name: '🛡️ Shield', action: () => activateShield() },
            { type: 'good', name: '⚡ Rapid Fire', action: () => activateRapidFire() },
            { type: 'bad', name: '💔 Lose Life', action: () => loseLife() },
            { type: 'bad', name: '🔄 Reverse Controls', action: () => activateReverseControls() },
            { type: 'bad', name: '⚓ Heavy Ship', action: () => activateHeavyShip() }
        ];
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.rotation += 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Mystery box with question mark
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Border
        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.restore();
        
        // Question mark (doesn't rotate)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', this.x + this.width / 2, this.y + this.height / 2);
    }

    activate() {
        const effect = this.effects[Math.floor(Math.random() * this.effects.length)];
        showEffect(effect.name, effect.type);
        effect.action();
        createParticles(this.x + this.width / 2, this.y + this.height / 2, effect.type);
    }
}

// Particle Class for explosions
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 1;
        this.decay = 0.02;
        this.size = Math.random() * 3 + 2;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Collision Detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Lives System
function loseLife() {
    if (spaceship.invincible) return;
    
    lives--;
    updateLivesDisplay();
    createParticles(spaceship.x + spaceship.width / 2, spaceship.y + spaceship.height / 2, '#ff0000');
    
    if (lives <= 0) {
        endGame();
    } else {
        // Temporary invincibility
        spaceship.invincible = true;
        setTimeout(() => {
            spaceship.invincible = false;
        }, 2000);
    }
}

function gainLife() {
    if (lives < 3) {
        lives++;
        updateLivesDisplay();
    }
}

function updateLivesDisplay() {
    const hearts = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    document.getElementById('lives').textContent = `Lives: ${hearts}`;
}

// Mystery Box Effects
function activateShield() {
    spaceship.invincible = true;
    addTimedEffect('🛡️ Shield', 5000, () => {
        spaceship.invincible = false;
    });
}

function activateRapidFire() {
    const originalInterval = spaceship.shootInterval;
    spaceship.shootInterval = 150;
    addTimedEffect('⚡ Rapid Fire', 5000, () => {
        spaceship.shootInterval = originalInterval;
    });
}

function activateReverseControls() {
    const originalJump = spaceship.jumpStrength;
    spaceship.jumpStrength = -originalJump;
    addTimedEffect('🔄 Reverse', 5000, () => {
        spaceship.jumpStrength = originalJump;
    });
}

function activateHeavyShip() {
    const originalGravity = spaceship.gravity;
    spaceship.gravity = originalGravity * 2;
    addTimedEffect('⚓ Heavy', 5000, () => {
        spaceship.gravity = originalGravity;
    });
}

function addTimedEffect(name, duration, callback) {
    activeEffects.push({ name, endTime: Date.now() + duration });
    setTimeout(() => {
        callback();
        activeEffects = activeEffects.filter(e => e.name !== name);
    }, duration);
}

function showEffect(name, type) {
    const effectDiv = document.createElement('div');
    effectDiv.textContent = name;
    effectDiv.style.position = 'absolute';
    effectDiv.style.top = '150px';
    effectDiv.style.left = '50%';
    effectDiv.style.transform = 'translateX(-50%)';
    effectDiv.style.fontSize = '28px';
    effectDiv.style.fontWeight = 'bold';
    effectDiv.style.color = type === 'good' ? '#00ff00' : '#ff0000';
    effectDiv.style.textShadow = '2px 2px 8px rgba(0,0,0,0.8)';
    effectDiv.style.transition = 'all 2s';
    effectDiv.style.zIndex = '200';
    document.getElementById('gameContainer').appendChild(effectDiv);
    
    setTimeout(() => {
        effectDiv.style.opacity = '0';
        effectDiv.style.top = '100px';
    }, 100);
    
    setTimeout(() => {
        effectDiv.remove();
    }, 2100);
}

function createParticles(x, y, type) {
    const color = type === 'good' ? '#ffd700' : '#ff0000';
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Spawn Functions
let lastAlienSpawn = 0;

function spawnAliens(deltaTime) {
    lastAlienSpawn += deltaTime;
    if (lastAlienSpawn >= alienSpawnRate) {
        for (let i = 0; i < aliensPerSpawn; i++) {
            aliens.push(new Alien());
        }
        lastAlienSpawn = 0;
    }
}

function spawnMysteryBox() {
    mysteryBoxes.push(new MysteryBox());
}

// Difficulty Increase
function increaseDifficulty(currentTime) {
    if (currentTime - lastDifficultyIncrease >= 30000) {
        alienSpawnRate = Math.max(500, alienSpawnRate * 0.85);
        aliensPerSpawn = Math.min(5, aliensPerSpawn + 1);
        alienShootFrequency = Math.max(800, alienShootFrequency * 0.9);
        lastDifficultyIncrease = currentTime;
        
        // Show difficulty increase notification
        showEffect('⬆️ Difficulty Up!', 'bad');
    }
}

// Score Update
function updateScore(currentTime) {
    if (currentTime - lastScoreTime >= 10000) {
        score += 5;
        document.getElementById('score').textContent = `Score: ${score}`;
        lastScoreTime = currentTime;
    }
}

// Main Game Loop
let lastTime = 0;

function gameLoop(currentTime) {
    if (!gameRunning) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stars background
    drawStars();

    // Update spaceship
    spaceship.update(deltaTime);

    // Spawn aliens
    spawnAliens(deltaTime);

    // Update and draw aliens
    aliens = aliens.filter(alien => {
        alien.update(deltaTime);
        alien.draw();
        
        // Check collision with spaceship
        if (!spaceship.invincible && checkCollision(spaceship, alien)) {
            loseLife();
            createParticles(alien.x + alien.width / 2, alien.y + alien.height / 2, '#ff006e');
            return false;
        }
        
        return alien.x + alien.width > 0;
    });

    // Update and draw bullets
    bullets = bullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        
        // Check collision with aliens
        for (let i = aliens.length - 1; i >= 0; i--) {
            if (checkCollision(bullet, aliens[i])) {
                createParticles(aliens[i].x + aliens[i].width / 2, aliens[i].y + aliens[i].height / 2, '#ff006e');
                aliens.splice(i, 1);
                kills++;
                score += 2;
                document.getElementById('kills').textContent = `Kills: ${kills}`;
                document.getElementById('score').textContent = `Score: ${score}`;
                
                // Check for mystery box drop
                if (kills % 10 === 0) {
                    spawnMysteryBox();
                }
                
                return false;
            }
        }
        
        return bullet.x < canvas.width;
    });

    // Update and draw enemy bullets
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        
        // Check collision with spaceship
        if (!spaceship.invincible && checkCollision(spaceship, bullet)) {
            loseLife();
            return false;
        }
        
        return bullet.x > 0;
    });

    // Update and draw mystery boxes
    mysteryBoxes = mysteryBoxes.filter(box => {
        box.update();
        box.draw();
        
        // Check collision with spaceship
        if (checkCollision(spaceship, box)) {
            box.activate();
            return false;
        }
        
        return box.y < canvas.height;
    });

    // Update and draw particles
    particles = particles.filter(particle => {
        particle.update();
        particle.draw();
        return particle.life > 0;
    });

    // Draw spaceship
    spaceship.draw();

    // Draw active effects
    drawActiveEffects();

    // Update score and difficulty
    updateScore(currentTime);
    increaseDifficulty(currentTime);

    requestAnimationFrame(gameLoop);
}

// Background stars
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    });
}

function drawActiveEffects() {
    if (activeEffects.length > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Courier New';
        ctx.textAlign = 'left';
        let yPos = 100;
        activeEffects.forEach(effect => {
            const timeLeft = Math.ceil((effect.endTime - Date.now()) / 1000);
            ctx.fillText(`${effect.name}: ${timeLeft}s`, 10, yPos);
            yPos += 25;
        });
    }
}

// Game Control Functions
function startGame() {
    // Reset game state
    gameRunning = true;
    score = 0;
    kills = 0;
    lives = 3;
    lastScoreTime = Date.now();
    lastDifficultyIncrease = Date.now();
    alienSpawnRate = 2000;
    aliensPerSpawn = 1;
    alienShootFrequency = 2000;
    
    // Clear arrays
    aliens = [];
    bullets = [];
    enemyBullets = [];
    mysteryBoxes = [];
    activeEffects = [];
    particles = [];
    
    // Initialize stars
    initStars();
    
    // Create spaceship
    spaceship = new Spaceship();
    
    // Update UI
    document.getElementById('score').textContent = `Score: 0`;
    document.getElementById('kills').textContent = `Kills: 0`;
    updateLivesDisplay();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    
    // Start game loop
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
    if (gameRunning && (e.code === 'Space' || e.code === 'ArrowUp')) {
        e.preventDefault();
        spaceship.jump();
    }
});

canvas.addEventListener('click', () => {
    if (gameRunning) {
        spaceship.jump();
    }
});

// Prevent scrolling on space bar
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
    }
});

// Initialize stars on load
initStars();
