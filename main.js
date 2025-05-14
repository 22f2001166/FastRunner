const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gridSize = 8;
let tileSize = canvas.width / gridSize;

let player = { x: 0, y: 0 }; // Player's starting position
let tiles = [];
let currentLevel = 1; // Track current level
let trap = null;
let trapVisible = true; // Track the visibility of the trap
let levelStartTime;
let levelTimes = []; // Array to store time taken per level
let freezingTile = null; // Track the freezing tile
let isFrozen = false; // Track whether the player is frozen
let freezeTimer = null; // Timer for freezing effect
let magicTile = null;
let magicTileUsed = false; // To ensure it's only placed once

function updateLevelDisplay() {
  const levelDisplay = document.getElementById("levelDisplay");
  levelDisplay.textContent = `Level ${currentLevel}`; // Update the level text
}

function generateRandomLevel(levelNumber) {
  levelStartTime = Date.now(); // Start the timer
  gridSize = Math.min(8 + Math.floor(levelNumber / 3), 16);
  tileSize = canvas.width / gridSize;
  player = { x: 0, y: 0 };
  tiles = [];

  // Generate a random walk path from (0, 0) to (exitX, exitY)
  const path = [];
  const visited = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  function dfs(x, y) {
    if (x === gridSize - 1 && y === gridSize - 1) {
      path.push({ x, y });
      return true;
    }

    visited[y][x] = true;
    path.push({ x, y });

    const directions = [
      [1, 0], // right
      [0, 1], // down
      [-1, 0], // left
      [0, -1], // up
    ];

    // Shuffle directions to add randomness
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < gridSize &&
        ny < gridSize &&
        !visited[ny][nx]
      ) {
        if (dfs(nx, ny)) return true;
      }
    }

    // backtrack if dead end
    path.pop();
    return false;
  }

  dfs(0, 0); // Run DFS from top-left to bottom-right

  // Add walls avoiding path
  const wallCount = levelNumber * 5;
  let attempts = 0;
  while (tiles.filter(t => t.type === "wall").length < wallCount && attempts < wallCount * 10) {
    const wx = Math.floor(Math.random() * gridSize);
    const wy = Math.floor(Math.random() * gridSize);
    if (
      !(wx === 0 && wy === 0) &&
      !(wx === gridSize - 1 && wy === gridSize - 1) &&
      !path.some(p => p.x === wx && p.y === wy)
    ) {
      tiles.push({ x: wx, y: wy, type: "wall" });
    }
    attempts++;
  }

  // Place exit
  tiles.push({ x: gridSize - 1, y: gridSize - 1, type: "exit" });

  // Place the trap tile (that blinks)
  placeTrap();
  placeFreezingTile();

  // Function to get a random level between min and max
  function getRandomLevel(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  if (!magicTileUsed && currentLevel >= 16 && currentLevel <= 20 && currentLevel === getRandomLevel(16, 20)) {
    placeMagicTile();
    magicTileUsed = true;
  }

  drawGrid();
  updateLevelDisplay();
}

// For placing the magic tile 

function placeMagicTile() {
  let placed = false;
  while (!placed) {
    const mx = Math.floor(Math.random() * gridSize);
    const my = Math.floor(Math.random() * gridSize);

    if (
      !(mx === 0 && my === 0) && // Not on start
      !(mx === gridSize - 1 && my === gridSize - 1) && // Not on exit
      !tiles.some(t => t.x === mx && t.y === my)
    ) {
      magicTile = { x: mx, y: my, type: "magic" };
      tiles.push(magicTile);
      placed = true;
    }
  }
}

// Placing the freezing tile

function placeFreezingTile() {
  // Randomly place a freezing tile, ensuring it doesn't overlap with walls, exit, or trap
  let freezingPlaced = false;
  while (!freezingPlaced) {
    const fx = Math.floor(Math.random() * gridSize);
    const fy = Math.floor(Math.random() * gridSize);

    if (
      !(fx === 0 && fy === 0) && // Avoid starting tile
      !(fx === gridSize - 1 && fy === gridSize - 1) && // Avoid exit tile
      !tiles.some(t => t.type === "wall" && t.x === fx && t.y === fy) && // Avoid walls
      !tiles.some(t => t.x === fx && t.y === fy && t.type === "trap") // Avoid trap
    ) {
      freezingTile = { x: fx, y: fy, type: "freeze" };
      tiles.push(freezingTile);
      freezingPlaced = true;
    }
  }
}

// Placing the trap 

function placeTrap() {
  // Randomly place a trap, ensuring it doesn't overlap with walls or exit
  let trapPlaced = false;
  while (!trapPlaced) {
    const tx = Math.floor(Math.random() * gridSize);
    const ty = Math.floor(Math.random() * gridSize);

    if (
      !(tx === 0 && ty === 0) && // Avoid starting tile
      !(tx === gridSize - 1 && ty === gridSize - 1) && // Avoid exit tile
      !tiles.some(t => t.type === "wall" && t.x === tx && t.y === ty) && // Avoid walls
      !tiles.some(t => t.x === tx && t.y === ty && t.type === "trap") // Avoid existing trap
    ) {
      trap = { x: tx, y: ty, type: "trap" };
      trapPlaced = true;

      // Start the blinking effect
      setInterval(() => {
        trapVisible = !trapVisible; // Toggle visibility
        drawGrid(); // Re-render the grid to reflect visibility change
      }, 1500); // Toggle every 1.5 seconds
    }
  }
}

// grid draw 

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw tiles
  for (const tile of tiles) {
    let color = "#0f0"; // fallback

    switch (tile.type) {
      case "wall":
        color = "#555";
        break;
      case "exit": // Exit tile
        color = "#f00";
        break;
      case "trap": // Trap tile
        color = trapVisible ? "#ff0" : "#fff"; // Only show trap if it's visible
        break;
      case "freeze": // Freezing tile
        color = "#00f"; // Blue for freeze
        break;
      case "magic":
        color = "#ff69b4"; // Pink color for magic tile
        break;
    }

    ctx.fillStyle = color;
    ctx.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
  }

  // Draw grid
  ctx.strokeStyle = "#0f0";
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // Draw player
  ctx.fillStyle = "#0f0";
  ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
}

function isBlocked(x, y) {
  return tiles.some(t => (t.type === "wall" || (t.type === "trap" && !trapVisible) || (t.type === "freeze" && isFrozen)) && t.x === x && t.y === y);
}

let messageLocked = false; // Global flag to prevent overwriting important messages

const magicParagraphs = [
  "The quick brown fox jumps over the lazy dog",
  "Pack my box with five dozen liquor jugs",
  "Sphinx of black quartz, judge my vow",
  "How vexingly quick daft zebras jump",
  "The five boxing wizards jump quickly"
];

let currentMagicParagraph = ""; // To store the current one for comparison
let magicTileActivated = false;

// moving the player 

function movePlayer(dx, dy) {
  if (isFrozen) return; // Prevent movement if frozen

  const nx = player.x + dx;
  const ny = player.y + dy;

  if (
    nx >= 0 && nx < gridSize &&
    ny >= 0 && ny < gridSize &&
    !isBlocked(nx, ny)
  ) {
    player.x = nx;
    player.y = ny;

    // Check if player reaches exit
    checkLevelCompletion();

    if (magicTile && player.x === magicTile.x && player.y === magicTile.y && !magicTileActivated) {
      magicTileActivated = true; // Prevent repeated prompts

      // Choose a new random sentence each time
      currentMagicParagraph = magicParagraphs[Math.floor(Math.random() * magicParagraphs.length)];

      const userInput = prompt(
        "You've stepped on the Magic Tile!\nType this paragraph to finish the game:\n\n'" + currentMagicParagraph + "'"
      );

      if (userInput && userInput.trim() === currentMagicParagraph) {
        alert("Correct! You've unlocked the magic ending. Game over.");

        const totalTime = (Date.now() - levelStartTime) / 1000;
        levelTimes.push(totalTime);

        const totalElapsedTime = levelTimes.reduce((acc, t) => acc + t, 0).toFixed(2);
        const previousBest = sessionStorage.getItem("minTotalTime");

        if (!previousBest || totalElapsedTime < parseFloat(previousBest)) {
          sessionStorage.setItem("minTotalTime", totalElapsedTime);
        }
        location.reload();
      } else {
        alert("Incorrect! You must continue playing.");
      }
    }

    // Check if player hits the trap
    if (trap && player.x === trap.x && player.y === trap.y && trapVisible) {
      player.x = 0;
      player.y = 0; // Instantly send player back to start
      const terminal = document.getElementById("terminal");
      terminal.textContent = "You are trapped!";
      messageLocked = true;

      drawGrid(); // Show player reset immediately

      setTimeout(() => {
        terminal.textContent = ""; // Clear message after 1 second
        messageLocked = false; // Allow other messages again
      }, 1000);
    }

    // Check if player steps on the freeze tile
    if (freezingTile && player.x === freezingTile.x && player.y === freezingTile.y) {
      const terminal = document.getElementById("terminal");
      terminal.textContent = "You are frozen for 2 seconds!";
      messageLocked = true; // Lock terminal message
      triggerFreeze();
    }

    // Nearby trap warning — only if message not locked
    if (!messageLocked && trap && Math.abs(player.x - trap.x) <= 1 && Math.abs(player.y - trap.y) <= 1 && trapVisible) {
      const terminal = document.getElementById("terminal");
      terminal.textContent = "Warning: A trap is near you!";
    }

    if (!messageLocked && (!trap || !trapVisible || Math.abs(player.x - trap.x) > 1 || Math.abs(player.y - trap.y) > 1)) {
      const terminal = document.getElementById("terminal");
      terminal.textContent = "";
    }
  }

  drawGrid();
}

// To freeze the player 

function triggerFreeze() {
  if (isFrozen) return;
  isFrozen = true;

  setTimeout(() => {
    isFrozen = false;
    messageLocked = false; // Unlock terminal message
    const terminal = document.getElementById("terminal");
    terminal.textContent = ""; // Clear frozen message
    drawGrid();
  }, 2000);
}

// If level is completed

function checkLevelCompletion() {
  const exitTile = tiles.find(t => t.type === "exit");
  if (exitTile && player.x === exitTile.x && player.y === exitTile.y) {
    const timeTaken = (Date.now() - levelStartTime) / 1000; // Time in seconds with decimal places
    levelTimes.push(timeTaken); // Save the time

    // Update UI
    updateTimeList();

    if (currentLevel >= 20) {
      const totalTime = levelTimes.reduce((acc, time) => acc + time, 0);

      alert(`Congratulations! You've completed all levels in ${totalTime.toFixed(2)} seconds!`);

      let minTotalTime = sessionStorage.getItem("minTotalTime");
      if (!minTotalTime || totalTime < parseFloat(minTotalTime)) {
        sessionStorage.setItem("minTotalTime", totalTime.toFixed(2)); // Store the minimum total time
      }
      
      location.reload();
    } else {
      currentLevel++;
      generateRandomLevel(currentLevel);
      document.getElementById("levelDisplay").textContent = `Level ${currentLevel}`;
    }
  }
}

// Update time for a level

function updateTimeList() {
  const list = document.getElementById("timeList");
  list.innerHTML = ""; // Clear previous entries

  const minTotalTime = sessionStorage.getItem("minTotalTime");
  if (minTotalTime) {
    const minTimeLi = document.createElement("li");
    minTimeLi.innerHTML = `<strong>Best Time: ${minTotalTime} seconds</strong>`;
    list.appendChild(minTimeLi);
  }
  
  let total = 0;
  levelTimes.forEach((time, index) => {
    const li = document.createElement("li");
    li.textContent = `Level ${index + 1}: ${time.toFixed(2)} seconds`; // Show time with 2 decimal places
    list.appendChild(li);
    total += time;
  });

  if (levelTimes.length === 20) {
    const totalLi = document.createElement("li");
    totalLi.innerHTML = `<strong>Total Time: ${total.toFixed(2)} seconds</strong>`; // Show total time with 2 decimal places
    list.appendChild(totalLi);
  }
}

// Checking for traps nearby

function checkTrapProximity() {
  // Check if player is near the trap (within 1 tile distance)
  if (trap) {
    const dx = Math.abs(player.x - trap.x);
    const dy = Math.abs(player.y - trap.y);
    if (dx <= 1 && dy <= 1) {
      console.log("Trap is nearby! Be careful!");
    }
  }
}

// making player move

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") movePlayer(0, -1);
  if (e.key === "ArrowDown") movePlayer(0, 1);
  if (e.key === "ArrowLeft") movePlayer(-1, 0);
  if (e.key === "ArrowRight") movePlayer(1, 0);
});

// Load the first level at startup
window.onload = function () {
  const startGame = confirm("Are you ready to start the game?");
  if (startGame) {
    generateRandomLevel(currentLevel);
  } else {
    alert("Come back when you're ready!");
  }
};
