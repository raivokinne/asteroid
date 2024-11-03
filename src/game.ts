import * as THREE from "three";

const loadingManager = new THREE.LoadingManager(() => {
  updateHUD();
  animate();
});

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2,
  window.innerWidth / 2,
  window.innerHeight / 2,
  window.innerHeight / -2,
  1,
  1000,
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let score = 0;
let lives = 5;
const asteroids: THREE.Mesh[] = [];
let frames = 0;
let gameOver = false;

function updateHUD() {
  const scoreElement = document.getElementById("score-value") as HTMLElement;
  const livesContainer = document.getElementById(
    "lives-container",
  ) as HTMLElement;

  scoreElement.textContent = score.toString();
  const lifeIcons = Array.from(livesContainer.children) as HTMLElement[];

  lifeIcons.forEach((icon, i) => {
    icon.classList.toggle("opacity-50", i >= lives);
  });
}

const loader = new THREE.TextureLoader(loadingManager);
const spaceshipTexture = loader.load("/assets/spaceship.png");
const asteroidTexture = loader.load("/assets/asteroid.png");

const playerGeometry = new THREE.BoxGeometry(100, 100, 0);
const playerMaterial = new THREE.MeshBasicMaterial({
  map: spaceshipTexture,
  transparent: true,
});
const player = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(player);
player.position.set(0, -window.innerHeight / 3, 0);

function createAsteroid() {
  const asteroidGeometry = new THREE.CircleGeometry(50, 32);
  const asteroidMaterial = new THREE.MeshBasicMaterial({
    map: asteroidTexture,
    transparent: true,
  });
  const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
  asteroid.position.set(
    (Math.random() - 0.5) * window.innerWidth,
    window.innerHeight / 2,
    0,
  );
  asteroids.push(asteroid);
  scene.add(asteroid);
}

function updateAsteroids() {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    asteroids[i].position.y -= 5;

    if (asteroids[i].position.distanceTo(player.position) < 75) {
      scene.remove(asteroids[i]);
      asteroids.splice(i, 1);
      lives -= 1;
      updateHUD();

      if (lives <= 0) {
        gameOver = true;
        const hudElement = document.getElementById("hud") as HTMLElement;
        hudElement.classList.add("hidden");

        const gameOverElement = document.getElementById(
          "game-over",
        ) as HTMLElement;
        gameOverElement.classList.remove("hidden");

        const gameScoreElement = document.getElementById(
          "game-score",
        ) as HTMLElement;
        gameScoreElement.textContent = score.toString();
      }
      continue;
    }

    if (asteroids[i].position.y < -window.innerHeight / 2) {
      scene.remove(asteroids[i]);
      asteroids.splice(i, 1);
      if (!gameOver) {
        score += 1;
        updateHUD();
      }
    }
  }
}

function resetGame() {
  score = 0;
  lives = 5;
  asteroids.forEach((asteroid) => scene.remove(asteroid));
  asteroids.length = 0;
  gameOver = false;
  updateHUD();

  const gameOverElement = document.getElementById("game-over") as HTMLElement;
  gameOverElement.classList.add("hidden");

  const livesContainer = document.getElementById(
    "lives-container",
  ) as HTMLElement;
  livesContainer.classList.remove("hidden");
}

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (!gameOver) {
    if (event.key === "ArrowLeft" && player.position.x > -window.innerWidth / 2)
      player.position.x -= 25;
    if (event.key === "ArrowRight" && player.position.x < window.innerWidth / 2)
      player.position.x += 25;
  }
});

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.left = width / -2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = height / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

document.getElementById("restart-button")?.addEventListener("click", () => {
  resetGame();
});

function animate() {
  requestAnimationFrame(animate);
  frames++;

  if (frames % 50 === 0) createAsteroid();
  updateAsteroids();
  renderer.render(scene, camera);
}
