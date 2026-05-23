const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 24;
const COLORS = {
  I: "#4cc9f0",
  J: "#4361ee",
  L: "#f8961e",
  O: "#ffd166",
  S: "#19c37d",
  T: "#b517ff",
  Z: "#ff5c8a"
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

const boardCanvas = document.querySelector("#board");
const boardContext = boardCanvas.getContext("2d");
const nextCanvas = document.querySelector("#next");
const nextContext = nextCanvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const linesElement = document.querySelector("#lines");
const levelElement = document.querySelector("#level");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const pauseButton = document.querySelector("#pauseButton");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");

let grid = createGrid();
let piece = null;
let nextPiece = randomPiece();
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 900;
let lastTime = 0;
let running = false;
let paused = false;
let gameOver = false;

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const matrix = SHAPES[type].map((row) => [...row]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0
  };
}

function drawCell(context, x, y, size, color) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
  context.strokeStyle = "rgba(255,255,255,0.2)";
  context.lineWidth = 2;
  context.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawGrid() {
  boardContext.fillStyle = "#11181b";
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  boardContext.strokeStyle = "#2d373c";
  boardContext.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    boardContext.beginPath();
    boardContext.moveTo(x * BLOCK, 0);
    boardContext.lineTo(x * BLOCK, boardCanvas.height);
    boardContext.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    boardContext.beginPath();
    boardContext.moveTo(0, y * BLOCK);
    boardContext.lineTo(boardCanvas.width, y * BLOCK);
    boardContext.stroke();
  }
}

function drawMatrix(context, matrix, offsetX, offsetY, size, color) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(context, x + offsetX, y + offsetY, size, color);
      }
    });
  });
}

function drawBoard() {
  drawGrid();
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) {
        drawCell(boardContext, x, y, BLOCK, color);
      }
    });
  });

  if (piece) {
    drawMatrix(boardContext, piece.matrix, piece.x, piece.y, BLOCK, COLORS[piece.type]);
  }
}

function drawNext() {
  nextContext.fillStyle = "#12191c";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const matrix = nextPiece.matrix;
  const offsetX = Math.floor((5 - matrix[0].length) / 2);
  const offsetY = Math.floor((5 - matrix.length) / 2);
  drawMatrix(nextContext, matrix, offsetX, offsetY, NEXT_BLOCK, COLORS[nextPiece.type]);
}

function collides(target) {
  return target.matrix.some((row, y) => row.some((value, x) => {
    if (!value) return false;
    const nextX = target.x + x;
    const nextY = target.y + y;
    return nextX < 0 || nextX >= COLS || nextY >= ROWS || Boolean(grid[nextY]?.[nextX]);
  }));
}

function mergePiece() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        grid[piece.y + y][piece.x + x] = COLORS[piece.type];
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  grid = grid.filter((row) => {
    const full = row.every(Boolean);
    if (full) cleared += 1;
    return !full;
  });

  while (grid.length < ROWS) {
    grid.unshift(Array(COLS).fill(null));
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 900 - (level - 1) * 70);
    updateStats();
  }
}

function rotate(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function rotatePiece() {
  if (!canControl()) return;
  const original = piece.matrix;
  const rotated = rotate(piece.matrix);
  piece.matrix = rotated;

  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    piece.x += kick;
    if (!collides(piece)) {
      drawBoard();
      return;
    }
    piece.x -= kick;
  }

  piece.matrix = original;
}

function movePiece(direction) {
  if (!canControl()) return;
  piece.x += direction;
  if (collides(piece)) {
    piece.x -= direction;
  }
  drawBoard();
}

function dropPiece() {
  if (!canControl()) return;
  piece.y += 1;
  if (collides(piece)) {
    piece.y -= 1;
    mergePiece();
    clearLines();
    spawnPiece();
  }
  dropCounter = 0;
  drawBoard();
}

function hardDrop() {
  if (!canControl()) return;
  while (!collides(piece)) {
    piece.y += 1;
  }
  piece.y -= 1;
  mergePiece();
  clearLines();
  spawnPiece();
  dropCounter = 0;
  drawBoard();
}

function spawnPiece() {
  piece = nextPiece;
  piece.x = Math.floor((COLS - piece.matrix[0].length) / 2);
  piece.y = 0;
  nextPiece = randomPiece();
  drawNext();

  if (collides(piece)) {
    endGame();
  }
}

function updateStats() {
  scoreElement.textContent = score;
  linesElement.textContent = lines;
  levelElement.textContent = level;
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add("is-visible");
}

function hideOverlay() {
  overlay.classList.remove("is-visible");
}

function canControl() {
  return running && !paused && !gameOver && piece;
}

function startGame() {
  if (running && !gameOver) {
    paused = false;
    hideOverlay();
    return;
  }

  grid = createGrid();
  piece = null;
  nextPiece = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 900;
  dropCounter = 0;
  lastTime = 0;
  running = true;
  paused = false;
  gameOver = false;
  updateStats();
  spawnPiece();
  hideOverlay();
  requestAnimationFrame(update);
}

function restartGame() {
  startGame();
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    showOverlay("已暫停", "按 P 或暫停按鈕繼續。");
  } else {
    hideOverlay();
    lastTime = performance.now();
    requestAnimationFrame(update);
  }
}

function endGame() {
  running = false;
  gameOver = true;
  showOverlay("遊戲結束", `得分 ${score}，按「重新開始」再玩一次。`);
}

function update(time = 0) {
  if (!running || paused || gameOver) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    dropPiece();
  }

  drawBoard();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (!running || gameOver)) startGame();
  if (event.key === "p" || event.key === "P") togglePause();
  if (event.key === "ArrowLeft") movePiece(-1);
  if (event.key === "ArrowRight") movePiece(1);
  if (event.key === "ArrowDown") dropPiece();
  if (event.key === "ArrowUp" || event.key === " ") {
    event.preventDefault();
    rotatePiece();
  }
  if (event.key === "Shift") hardDrop();
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "left") movePiece(-1);
    if (action === "right") movePiece(1);
    if (action === "down") dropPiece();
    if (action === "rotate") rotatePiece();
  });
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);

drawBoard();
drawNext();
