(() => {
  'use strict';

  /* ── FRUIT DATA ─────────────────────────────────── */
  const FRUITS = {
    2:    { emoji: '🍒', name: 'Cereza',   bg: '#a83d35' },
    4:    { emoji: '🍓', name: 'Fresa',    bg: '#d95245' },
    8:    { emoji: '🍇', name: 'Uva',      bg: '#70558f' },
    16:   { emoji: '🫒', name: 'Aceituna', bg: '#6e8950' },
    32:   { emoji: '🥜', name: 'Nuez',     bg: '#986444' },
    64:   { emoji: '🍋', name: 'Limón',    bg: '#bba13e' },
    128:  { emoji: '🍊', name: 'Naranja',  bg: '#d7783f' },
    256:  { emoji: '🍑', name: 'Durazno',  bg: '#c9785d' },
    512:  { emoji: '🍇', name: 'Uva',      bg: '#655087' },
    1024: { emoji: '🥜', name: 'Nuez',     bg: '#9a6b43' },
    2048: { emoji: '🫒', name: 'Aceituna', bg: '#718b45' },
  };

  const SIZE    = 4;
  const WIN_VAL = 2048;

  let grid      = [];
  let score     = 0;
  let bestScore = parseInt(localStorage.getItem('fruit2048_best') || '0');
  let won       = false;
  let audioCtx  = null;
  let pendingEndState = null;

  const SUPABASE_URL = 'https://wogykodoovgwcjdxmosw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ3lrb2Rvb3Znd2NqZHhtb3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTczMzksImV4cCI6MjEwNzY3MzMzOX0.0svx5v2edhzt3dNdVvJ1Wk6h3EVK9nIZ2JYGcHcYSKY';

  let supabaseClient = null;
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (_) {}

  const scoreEl     = document.getElementById('score');
  const bestEl      = document.getElementById('best');
  const tilesLayer  = document.getElementById('tiles-layer');
  const boardEl     = document.getElementById('board');
  const overlayWin  = document.getElementById('overlay-win');
  const overlayLose = document.getElementById('overlay-lose');
  const overlayRecord  = document.getElementById('overlay-record');
  const overlayLeaderboard = document.getElementById('overlay-leaderboard');
  const leaderboardLista = document.getElementById('leaderboard-lista');
  const winScoreEl  = document.getElementById('win-score');
  const loseScoreEl = document.getElementById('lose-score');

  /* ── WEB AUDIO ──────────────────────────────────── */
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, type, dur, vol, freqEnd) {
    try {
      const ctx  = getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch (_) {}
  }

  const soundMove  = () => playTone(180, 'sine', 0.07, 0.12, 130);
  const soundMerge = () => {
    playTone(440, 'sine', 0.18, 0.22, 880);
    setTimeout(() => playTone(660, 'sine', 0.15, 0.15, 990), 40);
  };
  const soundWin = () => {
    [261, 329, 392, 523].forEach((f, i) =>
      setTimeout(() => playTone(f, 'sine', 0.4, 0.25), i * 110));
  };
  const soundGameOver = () => {
    playTone(200, 'sawtooth', 0.55, 0.2, 60);
    setTimeout(() => playTone(140, 'square', 0.5, 0.15, 50), 300);
  };

  /* ── GRID HELPERS ───────────────────────────────── */
  const emptyGrid   = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const emptyCells  = () => {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) out.push([r, c]);
    return out;
  };

  function addRandomTile() {
    const cells = emptyCells();
    if (!cells.length) return null;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    const val    = Math.random() < 0.9 ? 2 : 4;
    grid[r][c]   = val;
    return { r, c, val };
  }

  /* ── SLIDE ──────────────────────────────────────── */
  function slide(row) {
    let arr    = row.filter(v => v !== 0);
    let gained = 0;
    const mergePos = [];
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        mergePos.push(i);
        arr[i + 1] = 0;
        i++;
      }
    }
    arr = arr.filter(v => v !== 0);
    while (arr.length < SIZE) arr.push(0);
    return { line: arr, gained, mergePos };
  }

  /* ── MOVE ───────────────────────────────────────── */
  function move(dir) {
    const prevState  = JSON.stringify(grid);
    let   totalGain  = 0;
    const mergedKeys = new Set(); // r*SIZE+c of merged destination cells

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < SIZE; r++) {
        const rev  = dir === 'right';
        const raw  = rev ? [...grid[r]].reverse() : [...grid[r]];
        const { line, gained, mergePos } = slide(raw);
        totalGain += gained;
        mergePos.forEach(i => {
          const c = rev ? SIZE - 1 - i : i;
          mergedKeys.add(r * SIZE + c);
        });
        grid[r] = rev ? [...line].reverse() : line;
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        const rev  = dir === 'down';
        const col  = Array.from({ length: SIZE }, (_, r) => grid[r][c]);
        const raw  = rev ? [...col].reverse() : col;
        const { line, gained, mergePos } = slide(raw);
        totalGain += gained;
        mergePos.forEach(i => {
          const r = rev ? SIZE - 1 - i : i;
          mergedKeys.add(r * SIZE + c);
        });
        const finalLine = rev ? [...line].reverse() : line;
        for (let r = 0; r < SIZE; r++) grid[r][c] = finalLine[r];
      }
    }

    if (JSON.stringify(grid) === prevState) return; // nothing moved

    if (totalGain) {
      score += totalGain;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('fruit2048_best', bestScore);
      }
      soundMerge();
    } else {
      soundMove();
    }

    const newTileInfo = addRandomTile();
    updateScore();
    renderTiles(mergedKeys, newTileInfo);

    // Check win
    if (!won && grid.flat().includes(WIN_VAL)) {
      won = true;
      pendingEndState = 'win';
      setTimeout(async () => {
        winScoreEl.textContent = score.toLocaleString();
        if (await esTop10(score)) {
          overlayWin.classList.add('hidden');
          overlayRecord.classList.remove('hidden');
        } else {
          overlayWin.classList.remove('hidden');
        }
        soundWin();
      }, 270);
      return;
    }

    // Check game over
    if (!hasMovesLeft()) {
      pendingEndState = 'lose';
      setTimeout(async () => {
        loseScoreEl.textContent = score.toLocaleString();
        if (await esTop10(score)) {
          overlayLose.classList.add('hidden');
          overlayRecord.classList.remove('hidden');
        } else {
          overlayLose.classList.remove('hidden');
        }
        soundGameOver();
      }, 370);
    }
  }

  /* ── GAME OVER CHECK ────────────────────────────── */
  function hasMovesLeft() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (r < SIZE - 1 && grid[r + 1][c] === v) return true;
        if (c < SIZE - 1 && grid[r][c + 1] === v) return true;
      }
    return false;
  }

  /* ── RENDER ─────────────────────────────────────── */
  function renderTiles(mergedKeys = new Set(), newTile = null) {
    tilesLayer.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = grid[r][c];
        // Always add a child to keep grid alignment
        if (!val) {
          tilesLayer.appendChild(document.createElement('div'));
          continue;
        }
        const fruit = FRUITS[val] || { emoji: '✨', name: String(val) };
        const tile  = document.createElement('div');
        tile.className  = 'tile';
        tile.dataset.v  = val;
        const isMerged  = mergedKeys.has(r * SIZE + c);
        const isNew     = newTile && newTile.r === r && newTile.c === c;
        if (isMerged)      tile.classList.add('is-merged');
        else if (isNew)    tile.classList.add('is-new');
        tile.innerHTML = `
          <span class="tile-emoji">${fruit.emoji}</span>
          <span class="tile-value">${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}</span>
        `;
        tilesLayer.appendChild(tile);
      }
    }
  }

  /* ── SCORE UI ───────────────────────────────────── */
  function updateScore() {
    scoreEl.textContent = score.toLocaleString();
    bestEl.textContent  = bestScore.toLocaleString();
    scoreEl.classList.remove('bump');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), 350);
  }

  /* ── SUPABASE RECORDS ───────────────────────────── */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function esTop10(score) {
    if (!supabaseClient) return false;
    try {
      const now = new Date().toISOString();
      const { count, error } = await supabaseClient
        .from('records')
        .select('id', { count: 'exact', head: true })
        .or(`puntaje.gt.${score},and(puntaje.eq.${score},created_at.lte.${now})`);
      if (error) return false;
      return (count || 0) < 10;
    } catch (_) {
      return false;
    }
  }

  async function guardarRecord(nombre, identificacion, score) {
    if (!supabaseClient) return { message: 'Sin conexión con el servidor de récords' };
    try {
      const { error } = await supabaseClient
        .from('records')
        .insert([{ nombre, identificacion, puntaje: score }]);
      return error;
    } catch (e) {
      return { message: e && e.message ? e.message : 'Error de red' };
    }
  }

  async function obtenerTop10() {
    if (!supabaseClient) return [];
    try {
      const { data, error } = await supabaseClient
        .from('records')
        .select('nombre, identificacion, puntaje, created_at')
        .order('puntaje', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);
      return error ? [] : (data || []);
    } catch (_) {
      return [];
    }
  }

  /* ── INIT ───────────────────────────────────────── */
  function initGame() {
    grid  = emptyGrid();
    score = 0;
    won   = false;
    pendingEndState = null;
    overlayWin.classList.add('hidden');
    overlayLose.classList.add('hidden');
    overlayRecord.classList.add('hidden');
    overlayLeaderboard.classList.add('hidden');
    addRandomTile();
    addRandomTile();
    updateScore();
    renderTiles();
  }

  /* ── LEGEND ─────────────────────────────────────── */
  function buildLegend() {
    const container = document.getElementById('legend-items');
    Object.entries(FRUITS).forEach(([val, f]) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<div class="legend-dot" style="background:${f.bg}"></div><span>${f.emoji} ${f.name}</span>`;
      container.appendChild(item);
    });
  }

  /* ── KEYBOARD ───────────────────────────────────── */
  const KEY_MAP = {
    ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
    a:'left', d:'right', w:'up', s:'down',
    A:'left', D:'right', W:'up', S:'down',
  };

  document.addEventListener('keydown', e => {
    if (!overlayRecord.classList.contains('hidden')) return;
    const dir = KEY_MAP[e.key];
    if (dir) { e.preventDefault(); move(dir); }
  });

  /* ── TOUCH ──────────────────────────────────────── */
  let tx = null, ty = null;
  boardEl.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });

  boardEl.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    tx = ty = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 35) return;
    move(Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up'));
  }, { passive: true });

  /* ── BUTTONS ────────────────────────────────────── */
  document.getElementById('restart-btn').addEventListener('click', initGame);
  document.getElementById('continue-btn').addEventListener('click', () => overlayWin.classList.add('hidden'));
  document.getElementById('win-restart-btn').addEventListener('click', initGame);
  document.getElementById('lose-restart-btn').addEventListener('click', initGame);

  document.getElementById('guardar-record-btn').addEventListener('click', async () => {
    const nombre = document.getElementById('record-nombre').value.trim();
    const ident  = document.getElementById('record-ident').value.trim();
    if (!nombre || !ident) { alert('Completa tu nombre y la identificación'); return; }

    const btn = document.getElementById('guardar-record-btn');
    btn.disabled = true;
    const error = await guardarRecord(nombre, ident, score);
    btn.disabled = false;

    if (error) { alert('Error guardando el récord: ' + error.message); return; }

    document.getElementById('record-nombre').value = '';
    document.getElementById('record-ident').value = '';
    overlayRecord.classList.add('hidden');

    if (pendingEndState === 'win') {
      winScoreEl.textContent = score.toLocaleString();
      overlayWin.classList.remove('hidden');
    } else {
      loseScoreEl.textContent = score.toLocaleString();
      overlayLose.classList.remove('hidden');
    }
  });

  document.getElementById('omitir-record-btn').addEventListener('click', () => {
    document.getElementById('record-nombre').value = '';
    document.getElementById('record-ident').value = '';
    overlayRecord.classList.add('hidden');
    if (pendingEndState === 'win') {
      overlayWin.classList.remove('hidden');
    } else {
      overlayLose.classList.remove('hidden');
    }
  });

  document.getElementById('ver-record-btn').addEventListener('click', async () => {
    const top = await obtenerTop10();
    leaderboardLista.innerHTML = top.length
      ? top.map((r, i) => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); gap:8px;">
          <strong>#${i+1}</strong> <span>${escapeHtml(r.nombre)}</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(r.identificacion)}</span>
          <strong>${r.puntaje.toLocaleString()}</strong>
        </div>
      `).join('')
      : '<div style="text-align:center; color:var(--text-muted); padding:10px 0;">Sin récords aún</div>';
    overlayLeaderboard.classList.remove('hidden');
  });

  document.getElementById('cerrar-leaderboard-btn').addEventListener('click', () => {
    overlayLeaderboard.classList.add('hidden');
  });

  // Unlock audio on first user gesture
  ['click','keydown'].forEach(ev =>
    document.addEventListener(ev, () => getCtx(), { once: true }));

  /* ── BOOT ───────────────────────────────────────── */
  buildLegend();
  bestEl.textContent = bestScore.toLocaleString();
  initGame();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registrado'))
      .catch((err) => console.error('Error SW:', err));
  }
})();
