import * as THREE from 'three';

interface ParticleData {
    type: string;
    velocity: THREE.Vector2;
    life: number;
}

interface AsteroidData {
    type: string;
}

interface ProjectileData {
    type: string;
    velocity: THREE.Vector2;
}

interface Keys {
    ArrowLeft: boolean;
    ArrowRight: boolean;
    Space: boolean;
}

const loadingManager = new THREE.LoadingManager(
    () => {
        console.log('Assets loaded, starting game...');
        updateHUD();
        initStarfield();
        animate();
    },
    undefined,
    (url, itemsLoaded, itemsTotal) => {
        console.error(`Error loading ${url}. Loaded ${itemsLoaded}/${itemsTotal}`);
    }
);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    1,
    1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let score: number = 0;
let lives: number = 5;
const asteroids: THREE.Mesh[] = [];
const particles: THREE.Mesh[] = [];
const projectiles: THREE.Mesh[] = [];
let frames: number = 0;
let gameOver: boolean = false;
let playerVelocity: number = 0;
const playerSpeed: number = 10;
const damping: number = 0.8;
let canShoot: boolean = true;
const shootCooldown: number = 15;
let nextAsteroidSpawn: number = 30;
const baseSpawnInterval: number = 30;
const minSpawnInterval: number = 5;
const spawnDecayRate: number = 0.00005;

function updateHUD(): void {
    try {
        const scoreElement = document.getElementById('score-value') as HTMLElement | null;
        const livesContainer = document.getElementById('lives-container') as HTMLElement | null;
        if (!scoreElement || !livesContainer) {
            console.error('HUD elements not found');
            return;
        }
        scoreElement.textContent = score.toString();
        const lifeIcons = Array.from(livesContainer.children) as HTMLElement[];
        lifeIcons.forEach((icon, i) => {
            icon.classList.toggle('opacity-50', i >= lives);
        });
    } catch (error) {
        console.error('Error updating HUD:', error);
    }
}

const loader = new THREE.TextureLoader(loadingManager);
const spaceshipTexture = loader.load(
    '/assets/spaceship.png',
    undefined,
    undefined,
    () => {
        console.error('Failed to load spaceship texture, using fallback');
        playerMaterial.color = new THREE.Color(0xff0000);
    }
);
const asteroidTexture = loader.load(
    '/assets/asteroid.png',
    undefined,
    undefined,
    () => {
        console.error('Failed to load asteroid texture, using fallback');
    }
);
const particleTexture = loader.load(
    '/assets/particle.png',
    undefined,
    undefined,
    () => {
        console.error('Failed to load particle texture, using fallback');
    }
);
const projectileTexture = loader.load(
    '/assets/projectile.png',
    undefined,
    undefined,
    () => {
        console.error('Failed to load projectile texture, using fallback');
    }
);

const playerGeometry = new THREE.BoxGeometry(100, 100, 0);
const playerMaterial = new THREE.MeshBasicMaterial({
    map: spaceshipTexture,
    transparent: true,
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(player);
player.position.set(0, -window.innerHeight / 3, 0);

function createAsteroid(): void {
    try {
        const asteroidGeometry = new THREE.CircleGeometry(50, 32);
        const asteroidMaterial = new THREE.MeshBasicMaterial({
            map: asteroidTexture,
            transparent: true,
        });
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        asteroid.position.set(
            (Math.random() - 0.5) * window.innerWidth,
            window.innerHeight / 2,
            0
        );
        asteroid.userData = { type: 'asteroid' } as AsteroidData;
        asteroids.push(asteroid);
        scene.add(asteroid);
    } catch (error) {
        console.error('Error creating asteroid:', error);
    }
}

function createParticle(x: number, y: number): void {
    try {
        const particleGeometry = new THREE.CircleGeometry(5, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            map: particleTexture,
            transparent: true,
            color: 0xff4500,
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(x, y, 0);
        particle.userData = {
            type: 'particle',
            velocity: new THREE.Vector2((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
            life: 30,
        } as ParticleData;
        particles.push(particle);
        scene.add(particle);
    } catch (error) {
        console.error('Error creating particle:', error);
    }
}

function createProjectile(): void {
    try {
        const projectileGeometry = new THREE.BoxGeometry(15, 30, 0);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            map: projectileTexture,
            transparent: true,
            color: 0xffffff,
            emissive: 0x333333,
        });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.set(player.position.x, player.position.y + 50, 0);
        projectile.userData = { type: 'projectile', velocity: new THREE.Vector2(0, 10) } as ProjectileData;
        projectiles.push(projectile);
        scene.add(projectile);
    } catch (error) {
        console.error('Error creating projectile:', error);
    }
}

function updateAsteroids(): void {
    if (gameOver) return;
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.position.y -= 5;

        const distance = asteroid.position.distanceTo(player.position);
        if (distance < 75) {
            scene.remove(asteroid);
            asteroids.splice(i, 1);
            for (let j = 0; j < 5; j++) {
                createParticle(asteroid.position.x, asteroid.position.y);
            }
            lives -= 1;
            updateHUD();

            if (lives <= 0) {
                gameOver = true;
                try {
                    const hudElement = document.getElementById('hud') as HTMLElement | null;
                    const gameOverElement = document.getElementById('game-over') as HTMLElement | null;
                    const gameScoreElement = document.getElementById('game-score') as HTMLElement | null;
                    if (!hudElement || !gameOverElement || !gameScoreElement) {
                        console.error('Game over elements not found');
                        return;
                    }
                    hudElement.classList.add('hidden');
                    gameOverElement.classList.remove('hidden');
                    gameScoreElement.textContent = score.toString();
                } catch (error) {
                    console.error('Error displaying game over:', error);
                }
            }
            continue;
        }

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            const projDistance = asteroid.position.distanceTo(projectile.position);
            if (projDistance < 60) {
                scene.remove(asteroid);
                asteroids.splice(i, 1);
                scene.remove(projectile);
                projectiles.splice(j, 1);
                for (let k = 0; k < 5; k++) {
                    createParticle(asteroid.position.x, asteroid.position.y);
                }
                score += 10;
                updateHUD();
                break;
            }
        }

        if (asteroid.position.y < -window.innerHeight / 2) {
            scene.remove(asteroid);
            asteroids.splice(i, 1);
            if (!gameOver) {
                score += 1;
                updateHUD();
            }
        }
    }
}

function updateParticles(): void {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const userData = particle.userData as ParticleData;
        particle.position.x += userData.velocity.x;
        particle.position.y += userData.velocity.y;
        userData.life -= 1;
        (particle.material as THREE.MeshBasicMaterial).opacity = userData.life / 30;

        if (userData.life <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }
}

function updateProjectiles(): void {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        const userData = projectile.userData as ProjectileData;
        projectile.position.y += userData.velocity.y;
        if (projectile.position.y > window.innerHeight / 2) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }
}

function saveScore(): void {
    try {
        const playerNameInput = document.getElementById('player-name') as HTMLInputElement | null;
        const playerName = playerNameInput?.value.toUpperCase().slice(0, 3) || 'AAA';
        let leaderboard: { name: string; score: number }[] = [];
        try {
            const stored = localStorage.getItem('leaderboard') || '[]';
            leaderboard = JSON.parse(stored);
            if (!Array.isArray(leaderboard)) leaderboard = [];
        } catch (error) {
            console.error('Error parsing leaderboard:', error);
            leaderboard = [];
        }
        leaderboard.push({ name: playerName, score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard.splice(5);
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

function displayLeaderboard(): void {
    try {
        const list = document.getElementById('leaderboard-list') as HTMLElement | null;
        if (!list) {
            console.error('Leaderboard list element not found');
            return;
        }
        let leaderboard: { name: string; score: number }[] = [];
        try {
            const stored = localStorage.getItem('leaderboard') || '[]';
            leaderboard = JSON.parse(stored);
            if (!Array.isArray(leaderboard)) leaderboard = [];
        } catch (error) {
            console.error('Error parsing leaderboard:', error);
            leaderboard = [];
        }
        list.innerHTML = leaderboard.length
            ? leaderboard
                .map((entry, i) => `<li class="my-2">${i + 1}. ${entry.name} - ${entry.score}</li>`)
                .join('')
            : '<li class="my-2">No scores yet</li>';
    } catch (error) {
        console.error('Error displaying leaderboard:', error);
    }
}

function resetGame(): void {
    try {
        saveScore();
        score = 0;
        lives = 5;
        asteroids.forEach((asteroid) => scene.remove(asteroid));
        asteroids.length = 0;
        particles.forEach((particle) => scene.remove(particle));
        particles.length = 0;
        projectiles.forEach((projectile) => scene.remove(projectile));
        projectiles.length = 0;
        gameOver = false;
        player.position.set(0, -window.innerHeight / 3, 0);
        playerVelocity = 0;
        canShoot = true;
        frames = 0;
        nextAsteroidSpawn = baseSpawnInterval;
        updateHUD();

        const gameOverElement = document.getElementById('game-over') as HTMLElement | null;
        const hudElement = document.getElementById('hud') as HTMLElement | null;
        if (!gameOverElement || !hudElement) {
            console.error('Game over or HUD elements not found');
            return;
        }
        gameOverElement.classList.add('hidden');
        hudElement.classList.remove('hidden');

        const playerNameInput = document.getElementById('player-name') as HTMLInputElement | null;
        if (playerNameInput) playerNameInput.value = '';
    } catch (error) {
        console.error('Error resetting game:', error);
    }
}

function initStarfield(): void {
    try {
        const canvas = document.getElementById('starfield') as HTMLCanvasElement | null;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            console.error('Starfield canvas or context not available');
            return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        interface Star {
            x: number;
            y: number;
            radius: number;
            opacity: number;
        }

        const stars: Star[] = [];
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1,
                opacity: Math.random() * 0.7 + 0.3,
            });
        }

        function drawStars(): void {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            stars.forEach((star) => {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
            });
        }

        drawStars();
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawStars();
        });
    } catch (error) {
        console.error('Error initializing starfield:', error);
    }
}

const keys: Keys = { ArrowLeft: false, ArrowRight: false, Space: false };
window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!gameOver) {
        if (event.key === 'ArrowLeft') keys.ArrowLeft = true;
        if (event.key === 'ArrowRight') keys.ArrowRight = true;
        if (event.key === ' ' && canShoot) {
            event.preventDefault();
            keys.Space = true;
            createProjectile();
            canShoot = false;
            setTimeout(() => {
                canShoot = true;
            }, (shootCooldown * 1000) / 60);
        }
    }
});

window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') keys.ArrowLeft = false;
    if (event.key === 'ArrowRight') keys.ArrowRight = false;
    if (event.key === ' ') keys.Space = false;
});

window.addEventListener('resize', () => {
    try {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    } catch (error) {
        console.error('Error handling resize:', error);
    }
});

document.getElementById('restart-button')?.addEventListener('click', resetGame);
document.getElementById('leaderboard-button')?.addEventListener('click', () => {
    try {
        const modal = document.getElementById('leaderboard-modal') as HTMLElement | null;
        if (!modal) {
            console.error('Leaderboard modal not found');
            return;
        }
        modal.classList.remove('hidden');
        displayLeaderboard();
    } catch (error) {
        console.error('Error opening leaderboard:', error);
    }
});
document.getElementById('close-leaderboard')?.addEventListener('click', () => {
    try {
        const modal = document.getElementById('leaderboard-modal') as HTMLElement | null;
        if (!modal) {
            console.error('Leaderboard modal not found');
            return;
        }
        modal.classList.add('hidden');
    } catch (error) {
        console.error('Error closing leaderboard:', error);
    }
});

function animate(): void {
    if (!gameOver) {
        requestAnimationFrame(animate);
    } else {
        return;
    }

    frames++;

    if (frames >= nextAsteroidSpawn) {
        createAsteroid();
        const currentInterval = baseSpawnInterval * Math.exp(-spawnDecayRate * frames);
        nextAsteroidSpawn = frames + Math.max(minSpawnInterval, Math.round(currentInterval));
    }

    playerVelocity = 0;
    if (keys.ArrowLeft) playerVelocity -= playerSpeed;
    if (keys.ArrowRight) playerVelocity += playerSpeed;
    player.position.x += playerVelocity;
    playerVelocity *= damping;
    player.position.x = Math.max(
        -window.innerWidth / 2 + 50,
        Math.min(window.innerWidth / 2 - 50, player.position.x)
    );

    updateAsteroids();
    updateParticles();
    updateProjectiles();
    renderer.render(scene, camera);
}
