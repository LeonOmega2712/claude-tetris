'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const NEON_COLORS = [
  null,
  '#00fff2', '#fff200', '#e000ff', '#00ff6a', '#ff003c', '#00aaff', '#ff8800',
];

const PASTEL_COLORS = [
  null,
  '#a8e6e6', '#fff3b0', '#d9b8e6', '#b8e6c1', '#f4b8b8', '#b8d4f0', '#f6d3a8',
];

function drawBlockRetro(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px, py, s, 4);
}

function drawBlockNeon(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.save();
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillStyle = '#0a0a0f';
  context.fillRect(px, py, s, s);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(px + 1, py + 1, s - 2, s - 2);
  context.restore();
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlockPastel(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  const r = Math.min(6, s / 3);
  context.fillStyle = color;
  roundRectPath(context, px, py, s, s, r);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.3)';
  roundRectPath(context, px, py, s, s * 0.4, r);
  context.fill();
}

function drawBlockPixel(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cell = Math.max(4, Math.floor(s / 4));
  context.save();
  context.beginPath();
  context.rect(px, py, s, s);
  context.clip();
  for (let yy = 0; yy < s; yy += cell) {
    for (let xx = 0; xx < s; xx += cell) {
      const light = (Math.floor(xx / cell) + Math.floor(yy / cell)) % 2 === 0;
      context.fillStyle = light ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
      context.fillRect(px + xx, py + yy, cell, cell);
    }
  }
  context.restore();
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

const SKINS = {
  retro: { colors: COLORS, draw: drawBlockRetro },
  neon: { colors: NEON_COLORS, draw: drawBlockNeon },
  pastel: { colors: PASTEL_COLORS, draw: drawBlockPastel },
  pixel: { colors: COLORS, draw: drawBlockPixel },
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const gameoverBox = document.getElementById('gameover-box');
const pauseBox = document.getElementById('pause-box');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const showControlsBtn = document.getElementById('show-controls-btn');
const backBtn = document.getElementById('back-btn');
const startLevelSelect = document.getElementById('start-level');
const recordsListEl = document.getElementById('records-list');
const bestComboEl = document.getElementById('best-combo');
const maxLinesEl = document.getElementById('max-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const nameEntry = document.getElementById('overlay-name-entry');
const playerNameInput = document.getElementById('player-name');
const saveRecordBtn = document.getElementById('save-record-btn');
const skinSelect = document.getElementById('skin-select');

const THEME_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 10;
const RECORDS_KEY = 'tetris-records';
const STATS_KEY = 'tetris-stats';
const MAX_RECORDS = 5;
const SKIN_KEY = 'tetris-skin';

let board, current, next, score, lines, level, startLevel, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo, sessionMaxCombo, pendingScore;
let gridColor = '#22222e';
let currentSkin = 'retro';

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  combo = cleared > 0 ? combo + 1 : 0;
  sessionMaxCombo = Math.max(sessionMaxCombo, combo);
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = startLevel + Math.floor(lines / 10);
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin];
  const color = skin.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x, y, color, size);
  context.globalAlpha = 1;
}

function updateGridColor() {
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-line').trim();
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeToggle.checked = theme === 'light';
  updateGridColor();
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

function getStartLevel() {
  const saved = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  return saved >= 1 && saved <= MAX_START_LEVEL ? saved : 1;
}

function initStartLevelSelect() {
  for (let i = 1; i <= MAX_START_LEVEL; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    startLevelSelect.appendChild(option);
  }
  startLevelSelect.value = getStartLevel();
}

startLevelSelect.addEventListener('change', () => {
  localStorage.setItem(START_LEVEL_KEY, startLevelSelect.value);
});

function applySkin(skin) {
  if (!SKINS[skin]) skin = 'retro';
  currentSkin = skin;
  document.body.classList.remove('skin-retro', 'skin-neon', 'skin-pastel', 'skin-pixel');
  document.body.classList.add(`skin-${skin}`);
  skinSelect.value = skin;
  updateGridColor();
  localStorage.setItem(SKIN_KEY, skin);
  if (board) {
    draw();
    drawNext();
  }
}

function initSkin() {
  const saved = localStorage.getItem(SKIN_KEY);
  applySkin(SKINS[saved] ? saved : 'retro');
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
});

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || { bestCombo: 0, maxLines: 0 };
  } catch {
    return { bestCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function isTopScore(candidateScore) {
  const records = loadRecords();
  return records.length < MAX_RECORDS || candidateScore > records[records.length - 1].score;
}

function addRecord(name, recordScore) {
  const records = loadRecords();
  const id = Date.now();
  records.push({ id, name, score: recordScore });
  records.sort((a, b) => b.score - a.score);
  records.length = Math.min(records.length, MAX_RECORDS);
  saveRecords(records);
  return id;
}

function renderRecords(highlightId) {
  const records = loadRecords();
  recordsListEl.innerHTML = '';
  if (records.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Sin récords';
    recordsListEl.appendChild(li);
  } else {
    records.forEach(rec => {
      const li = document.createElement('li');
      if (rec.id === highlightId) li.classList.add('highlight');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'rec-name';
      nameSpan.textContent = rec.name;
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'rec-score';
      scoreSpan.textContent = rec.score.toLocaleString();
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      recordsListEl.appendChild(li);
    });
  }
  const stats = loadStats();
  bestComboEl.textContent = stats.bestCombo;
  maxLinesEl.textContent = stats.maxLines;
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  gameoverBox.classList.remove('hidden');
  pauseBox.classList.add('hidden');
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  const stats = loadStats();
  stats.bestCombo = Math.max(stats.bestCombo, sessionMaxCombo);
  stats.maxLines = Math.max(stats.maxLines, lines);
  saveStats(stats);

  if (isTopScore(score)) {
    pendingScore = score;
    nameEntry.classList.remove('hidden');
    playerNameInput.value = '';
    overlay.classList.remove('hidden');
    playerNameInput.focus();
  } else {
    pendingScore = null;
    nameEntry.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
  renderRecords();
}

function showPauseMainView() {
  pauseMain.classList.remove('hidden');
  pauseControls.classList.add('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseMainView();
    gameoverBox.classList.add('hidden');
    pauseBox.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
}

resumeBtn.addEventListener('click', () => togglePause());
pauseRestartBtn.addEventListener('click', () => init());
showControlsBtn.addEventListener('click', () => {
  pauseMain.classList.add('hidden');
  pauseControls.classList.remove('hidden');
});
backBtn.addEventListener('click', showPauseMainView);

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver || paused) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  startLevel = getStartLevel();
  level = startLevel;
  paused = false;
  gameOver = false;
  combo = 0;
  sessionMaxCombo = 0;
  pendingScore = null;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  nameEntry.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

saveRecordBtn.addEventListener('click', () => {
  if (pendingScore === null) return;
  const name = (playerNameInput.value.trim().slice(0, 10) || 'AAA').toUpperCase();
  const id = addRecord(name, pendingScore);
  pendingScore = null;
  nameEntry.classList.add('hidden');
  renderRecords(id);
});

playerNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveRecordBtn.click();
});

resetRecordsBtn.addEventListener('click', () => {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(STATS_KEY);
  renderRecords();
});

document.addEventListener('keydown', e => {
  if (e.target === playerNameInput) return;
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

initTheme();
initStartLevelSelect();
renderRecords();
initSkin();
init();
