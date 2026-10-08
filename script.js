// Fruit 2048 Game Logic
// Inspired by classic 2048 but tiles show fruit images.

const GRID_SIZE = 4;
const START_TILES = 2;
const SCORE_ELEMENT = document.getElementById('score');
const GRID_ELEMENT = document.getElementById('grid');
const NEW_GAME_BUTTON = document.getElementById('new-game');

let grid = [];
let score = 0;

// Initialize game
function init() {
  grid = createEmptyGrid();
  score = 0;
  updateScore();
  for (let i = 0; i < START_TILES; i++) addRandomTile();
  render();
}

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function addRandomTile() {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length === 0) return;
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  // New tile is 2 (fruit) 90% chance, 4 (bigger fruit) 10% chance
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function render() {
  GRID_ELEMENT.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      const value = grid[r][c];
      if (value !== 0) {
        cell.dataset.value = value.toString();
      }
      GRID_ELEMENT.appendChild(cell);
    }
  }
}

function updateScore() {
  SCORE_ELEMENT.textContent = score.toString();
}

function slide(row) {
  // compress non‑zero numbers
  let arr = row.filter(v => v !== 0);
  // merge identical neighbours
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr[i + 1] = 0;
      i++; // skip next
    }
  }
  // second compression
  arr = arr.filter(v => v !== 0);
  while (arr.length < GRID_SIZE) arr.push(0);
  return arr;
}

function move(direction) {
  let moved = false;
  const original = JSON.stringify(grid);

  // Helper to set row/col based on direction
  const getLine = (index) => {
    switch (direction) {
      case 'ArrowLeft':
        return grid[index].slice();
      case 'ArrowRight':
        return grid[index].slice().reverse();
      case 'ArrowUp':
        return grid.map(row => row[index]);
      case 'ArrowDown':
        return grid.map(row => row[index]).reverse();
    }
  };

  const setLine = (index, newLine) => {
    switch (direction) {
      case 'ArrowLeft':
        grid[index] = newLine;
        break;
      case 'ArrowRight':
        grid[index] = newLine.reverse();
        break;
      case 'ArrowUp':
        for (let r = 0; r < GRID_SIZE; r++) grid[r][index] = newLine[r];
        break;
      case 'ArrowDown':
        for (let r = 0; r < GRID_SIZE; r++) grid[r][index] = newLine[GRID_SIZE - 1 - r];
        break;
    }
  };

  for (let i = 0; i < GRID_SIZE; i++) {
    const line = getLine(i);
    const movedLine = slide(line);
    setLine(i, movedLine);
  }

  if (JSON.stringify(grid) !== original) {
    moved = true;
    addRandomTile();
    render();
    updateScore();
    if (isGameOver()) {
      setTimeout(() => alert('¡Juego terminado!'), 100);
    }
  }
  return moved;
}

function isGameOver() {
  // If any empty cell exists, not over
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) return false;
    }
  }
  // Check possible merges
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c];
      if (r < GRID_SIZE - 1 && grid[r + 1][c] === val) return false;
      if (c < GRID_SIZE - 1 && grid[r][c + 1] === val) return false;
    }
  }
  return true;
}

// Input handling
window.addEventListener('keydown', e => {
  const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (arrows.includes(e.key)) {
    e.preventDefault();
    move(e.key);
  }
});

// Touch support (simple swipe detection)
let touchStartX = null;
let touchStartY = null;
window.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
});
window.addEventListener('touchend', e => {
  if (touchStartX === null || touchStartY === null) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) > 30) {
    if (absX > absY) {
      move(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      move(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    }
  }
  touchStartX = null;
  touchStartY = null;
});

NEW_GAME_BUTTON.addEventListener('click', init);

// Start the game on load
init();
