/* ===========================
   FingerMagic – app.js
   Main application logic
   =========================== */

// ─── GLOBALS ───────────────────────────────────────────
let hands;
let cameraUtils;
let videoEl, overlayCanvas, overlayCtx, drawCanvas, drawCtx;
let matrixCanvas, matrixCtx;
let fingerCursorEl, wordDisplayEl, particlesLayer, wordCannonEl;
let kbOutputEl;

let currentMode = 'draw';        // draw | keyboard | erase | text
let currentBrush = 'smooth';     // smooth | neon | rainbow | glitter | fire | galaxy
let currentColor = '#00ffcc';
let brushSize = 8;
let brushOpacity = 0.9;

let isDrawing = false;
let lastPoint = null;
let rainbowHue = 0;

let handTracked = false;
let indexTipX = 0, indexTipY = 0;
let thumbTipX = 0, thumbTipY = 0;
let pinchActive = false;
let pinchCooldown = 0;

let matrixRunning = false;
let matrixInterval = null;
let matrixColumns = [];

const COLORS = [
  '#ff006e','#fb5607','#ffbe0b','#3a86ff','#8338ec','#00ffcc',
  '#ff4dff','#00ff9f','#ff3131','#4fc3f7','#f72585','#7209b7'
];

const WORDS = [
  'WOW','MAGIC','FIRE','COOL','ART','DRAW','YAY','ZAP',
  'BOOM','GLOW','VIBE','WILD','NEON','EPIC','FUN','STAR',
  '✨','🎨','🔥','💫','🌈','⚡','🎆','🌟'
];

const KB_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','⌫'],
  ['Z','X','C','V','B','N','M',' ','↵']
];

// ─── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').addEventListener('click', startApp);
  buildKeyboard();
  setupEffectButtons();
  setupToolPanel();
  setupMouseFallback();
});

function startApp() {
  document.getElementById('splash').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  videoEl         = document.getElementById('video');
  overlayCanvas   = document.getElementById('overlayCanvas');
  overlayCtx      = overlayCanvas.getContext('2d');
  drawCanvas      = document.getElementById('drawCanvas');
  drawCtx         = drawCanvas.getContext('2d');
  matrixCanvas    = document.getElementById('matrixCanvas');
  matrixCtx       = matrixCanvas.getContext('2d');
  fingerCursorEl  = document.getElementById('fingerCursor');
  wordDisplayEl   = document.getElementById('wordDisplay');
  particlesLayer  = document.getElementById('particles');
  wordCannonEl    = document.getElementById('wordCannon');
  kbOutputEl      = document.getElementById('kbOutput');

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  initMediaPipe();
  startCameraGlow();
}

function resizeCanvases() {
  const W = window.innerWidth, H = window.innerHeight;
  [overlayCanvas, drawCanvas, matrixCanvas].forEach(c => {
    c.width = W; c.height = H;
  });
  matrixColumns = new Array(Math.floor(W / 20)).fill(0);
}

// ─── MEDIAPIPE HANDS ───────────────────────────────────
function initMediaPipe() {
  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6
  });
  hands.onResults(onHandResults);

  const camera = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 1280, height: 720, facingMode: 'user'
  });
  camera.start().then(() => {
    document.getElementById('trackStatus').textContent = '✅ Camera On';
  }).catch(err => {
    document.getElementById('trackStatus').textContent = '❌ No Camera';
    showToast('Camera error: ' + err.message);
  });
}

function onHandResults(results) {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    handTracked = false;
    fingerCursorEl.classList.add('hidden');
    isDrawing = false;
    lastPoint = null;
    document.getElementById('trackStatus').textContent = '🔍 Detecting…';
    return;
  }

  handTracked = true;
  document.getElementById('trackStatus').textContent = '✅ Hand Detected';
  const landmarks = results.multiHandLandmarks[0];

  // Draw skeleton
  drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: 'rgba(124,58,237,0.5)', lineWidth: 2 });
  drawLandmarks(overlayCtx, landmarks, { color: 'rgba(255,255,255,0.7)', lineWidth: 1, radius: 3 });

  // Index fingertip (8)  → mirrored X
  const idx8 = landmarks[8];
  const thumb4 = landmarks[4];
  indexTipX = (1 - idx8.x) * overlayCanvas.width;
  indexTipY = idx8.y * overlayCanvas.height;
  thumbTipX = (1 - thumb4.x) * overlayCanvas.width;
  thumbTipY = thumb4.y * overlayCanvas.height;

  // Update cursor
  fingerCursorEl.style.left = indexTipX + 'px';
  fingerCursorEl.style.top  = indexTipY + 'px';
  fingerCursorEl.classList.remove('hidden');

  // Detect pinch (thumb+index)
  const dist = Math.hypot(indexTipX - thumbTipX, indexTipY - thumbTipY);
  const wasPinch = pinchActive;
  pinchActive = dist < 45;

  if (pinchCooldown > 0) pinchCooldown--;

  // ─ MODE ACTIONS ─
  if (currentMode === 'draw') {
    handleDraw(pinchActive);
  } else if (currentMode === 'erase') {
    handleErase(pinchActive);
  } else if (currentMode === 'keyboard') {
    handleKeyboardHover();
    if (pinchActive && !wasPinch && pinchCooldown === 0) {
      triggerKeyboardPinch();
      pinchCooldown = 20;
    }
  } else if (currentMode === 'text') {
    if (pinchActive && !wasPinch && pinchCooldown === 0) {
      spawnWord(WORDS[Math.floor(Math.random() * WORDS.length)], indexTipX, indexTipY);
      pinchCooldown = 30;
    }
  }

  // ─ Always draw fingertip glow on overlay ─
  drawFingerGlow(overlayCtx, indexTipX, indexTipY);
}

// ─── DRAW ───────────────────────────────────────────────
function handleDraw(pinching) {
  if (pinching) {
    fingerCursorEl.classList.add('drawing');
    if (!isDrawing) { isDrawing = true; lastPoint = {x: indexTipX, y: indexTipY}; }
    drawStroke(lastPoint, {x: indexTipX, y: indexTipY});
    lastPoint = {x: indexTipX, y: indexTipY};
  } else {
    fingerCursorEl.classList.remove('drawing');
    isDrawing = false; lastPoint = null;
  }
}

function handleErase(pinching) {
  if (pinching) {
    drawCtx.save();
    drawCtx.globalCompositeOperation = 'destination-out';
    drawCtx.beginPath();
    drawCtx.arc(indexTipX, indexTipY, brushSize * 3, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.restore();
  }
}

function drawStroke(from, to) {
  drawCtx.save();
  drawCtx.globalAlpha = brushOpacity;
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';

  switch (currentBrush) {
    case 'smooth':
      drawCtx.strokeStyle = currentColor;
      drawCtx.lineWidth = brushSize;
      drawCtx.shadowBlur = 0;
      drawLine(from, to);
      break;

    case 'neon':
      drawCtx.shadowColor = currentColor;
      drawCtx.shadowBlur = 20;
      drawCtx.strokeStyle = currentColor;
      drawCtx.lineWidth = brushSize;
      drawLine(from, to);
      drawCtx.shadowBlur = 8;
      drawCtx.strokeStyle = '#fff';
      drawCtx.lineWidth = brushSize * 0.3;
      drawLine(from, to);
      break;

    case 'rainbow':
      rainbowHue = (rainbowHue + 3) % 360;
      drawCtx.strokeStyle = `hsl(${rainbowHue}, 100%, 60%)`;
      drawCtx.shadowColor  = `hsl(${rainbowHue}, 100%, 70%)`;
      drawCtx.shadowBlur = 12;
      drawCtx.lineWidth = brushSize;
      drawLine(from, to);
      break;

    case 'glitter':
      for (let i = 0; i < 12; i++) {
        const rx = to.x + (Math.random() - .5) * brushSize * 3;
        const ry = to.y + (Math.random() - .5) * brushSize * 3;
        drawCtx.beginPath();
        drawCtx.arc(rx, ry, Math.random() * 3 + 1, 0, Math.PI * 2);
        drawCtx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
        drawCtx.shadowBlur = 10;
        drawCtx.shadowColor = drawCtx.fillStyle;
        drawCtx.fill();
      }
      break;

    case 'fire':
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        const x = from.x + (to.x - from.x) * t + (Math.random() - .5) * brushSize;
        const y = from.y + (to.y - from.y) * t + (Math.random() - .5) * brushSize;
        const r = Math.random() * brushSize + 2;
        const h = Math.random() * 40;
        const grad = drawCtx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `hsla(${h}, 100%, 80%, 0.9)`);
        grad.addColorStop(1, 'transparent');
        drawCtx.beginPath();
        drawCtx.arc(x, y, r, 0, Math.PI * 2);
        drawCtx.fillStyle = grad;
        drawCtx.shadowBlur = 20; drawCtx.shadowColor = 'orange';
        drawCtx.fill();
      }
      break;

    case 'galaxy':
      drawCtx.strokeStyle = `hsl(${220 + Math.random() * 60}, 80%, 70%)`;
      drawCtx.lineWidth = Math.random() * brushSize + 1;
      drawCtx.shadowBlur = 14;
      drawCtx.shadowColor = '#7c3aed';
      drawLine(from, to);
      for (let i = 0; i < 5; i++) {
        drawCtx.beginPath();
        drawCtx.arc(
          to.x + (Math.random() - .5) * brushSize * 4,
          to.y + (Math.random() - .5) * brushSize * 4,
          Math.random() * 2, 0, Math.PI * 2
        );
        drawCtx.fillStyle = '#fff';
        drawCtx.shadowBlur = 6; drawCtx.shadowColor = '#a855f7';
        drawCtx.fill();
      }
      break;
  }

  drawCtx.restore();
}

function drawLine(from, to) {
  drawCtx.beginPath();
  drawCtx.moveTo(from.x, from.y);
  drawCtx.lineTo(to.x, to.y);
  drawCtx.stroke();
}

function drawFingerGlow(ctx, x, y) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 25);
  grad.addColorStop(0, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.4, 'rgba(124,58,237,0.3)');
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// ─── KEYBOARD ───────────────────────────────────────────
function buildKeyboard() {
  const grid = document.getElementById('keyboardGrid');
  KB_ROWS.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'kb-row';
    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'kb-key' + (key.length > 1 ? ' special' : '');
      btn.textContent = key;
      btn.dataset.key = key;
      btn.addEventListener('click', () => pressKey(key));
      rowDiv.appendChild(btn);
    });
    grid.appendChild(rowDiv);
  });

  document.getElementById('kbCloseBtn').addEventListener('click', () => {
    document.getElementById('keyboardOverlay').classList.add('hidden');
    setMode('draw');
  });
  document.getElementById('kbClear').addEventListener('click', () => { kbOutputEl.textContent = ''; });
  document.getElementById('kbEmit').addEventListener('click', emitWords);
}

function handleKeyboardHover() {
  const keys = document.querySelectorAll('.kb-key');
  let found = false;
  keys.forEach(key => {
    const rect = key.getBoundingClientRect();
    const inside = indexTipX >= rect.left && indexTipX <= rect.right &&
                   indexTipY >= rect.top  && indexTipY <= rect.bottom;
    key.classList.toggle('hovered', inside);
    if (inside) found = true;
  });
}

function triggerKeyboardPinch() {
  const hovered = document.querySelector('.kb-key.hovered');
  if (hovered) {
    pressKey(hovered.dataset.key);
    hovered.classList.add('pressed');
    setTimeout(() => hovered.classList.remove('pressed'), 200);
    spawnKeyParticles(indexTipX, indexTipY, hovered.dataset.key);
  }
}

function pressKey(key) {
  if (key === '⌫') {
    kbOutputEl.textContent = kbOutputEl.textContent.slice(0, -1);
  } else if (key === '↵') {
    emitWords();
  } else {
    kbOutputEl.textContent += key;
  }
  if (key !== '⌫' && key !== '↵') {
    spawnWord(key, indexTipX || window.innerWidth / 2, indexTipY || window.innerHeight / 2);
  }
}

function spawnKeyParticles(x, y, char) {
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    const size = Math.random() * 8 + 4;
    el.style.cssText = `
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
      --px:${(Math.random()-0.5)*100}px;
      --py:${-Math.random()*100-20}px;
      animation-duration:${0.6 + Math.random() * 0.5}s;
    `;
    particlesLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

// ─── FLOATING WORDS ─────────────────────────────────────
function emitWords() {
  const text = kbOutputEl.textContent.trim();
  if (!text) return;
  const words = text.split(/\s+/);
  words.forEach((word, i) => {
    setTimeout(() => {
      spawnWord(word,
        Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2,
        Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2,
        true
      );
    }, i * 200);
  });
  spawnConfetti(80);
}

function spawnWord(text, x, y, big = false) {
  const el = document.createElement('div');
  el.className = 'floating-word';
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = big ? (Math.random() * 40 + 30) : (Math.random() * 22 + 14);
  const rot  = (Math.random() - .5) * 30;
  const rot2 = (Math.random() - .5) * 20;
  const dx   = (Math.random() - .5) * 200 + 'px';
  const dy   = -(Math.random() * 100 + 50) + 'px';
  el.textContent = text;
  el.style.cssText = `
    left:${x}px; top:${y}px;
    color:${color};
    font-size:${size}px;
    --rot:${rot}deg; --rot2:${rot2}deg;
    --dx:${dx}; --dy:${dy};
  `;
  wordDisplayEl.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ─── FX BUTTONS ─────────────────────────────────────────
function setupEffectButtons() {
  document.getElementById('confettiBtn').addEventListener('click', () => spawnConfetti(120));
  document.getElementById('fireworkBtn').addEventListener('click', launchFireworks);
  document.getElementById('starshowerBtn').addEventListener('click', starShower);
  document.getElementById('matrixBtn').addEventListener('click', toggleMatrix);
  document.getElementById('bubbleBtn').addEventListener('click', spawnBubbles);
}

function spawnConfetti(count = 80) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'particle';
      const size = Math.random() * 12 + 4;
      const x = Math.random() * window.innerWidth;
      const shapes = ['50%', '0', '2px'];
      el.style.cssText = `
        left:${x}px; top:-10px;
        width:${size}px; height:${size}px;
        background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
        border-radius:${shapes[Math.floor(Math.random()*shapes.length)]};
        --px:${(Math.random()-0.5)*300}px;
        --py:${Math.random()*window.innerHeight+200}px;
        animation-duration:${1.5 + Math.random() * 2}s;
        animation-timing-function:cubic-bezier(.17,.67,.83,.67);
      `;
      particlesLayer.appendChild(el);
      setTimeout(() => el.remove(), 3600);
    }, i * 15);
  }
}

function launchFireworks() {
  const centers = [
    [window.innerWidth * .25, window.innerHeight * .35],
    [window.innerWidth * .5,  window.innerHeight * .25],
    [window.innerWidth * .75, window.innerHeight * .35],
  ];
  centers.forEach(([cx, cy], wi) => {
    setTimeout(() => {
      for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const angle = (i / 50) * Math.PI * 2;
        const speed = Math.random() * 180 + 60;
        el.style.cssText = `
          left:${cx}px; top:${cy}px;
          width:6px; height:6px;
          background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
          box-shadow: 0 0 8px currentColor;
          --px:${Math.cos(angle)*speed}px;
          --py:${Math.sin(angle)*speed}px;
          animation-duration:${0.8 + Math.random() * 0.6}s;
        `;
        particlesLayer.appendChild(el);
        setTimeout(() => el.remove(), 1600);
      }
    }, wi * 350);
  });
}

function starShower() {
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = ['⭐','✨','💫','🌟'][Math.floor(Math.random() * 4)];
      el.style.cssText = `
        position:absolute;
        left:${Math.random() * window.innerWidth}px;
        top:-30px;
        font-size:${Math.random() * 24 + 12}px;
        --px:${(Math.random() - .5) * 200}px;
        --py:${window.innerHeight + 60}px;
        animation:particleFall ${1.5 + Math.random() * 2}s linear forwards;
      `;
      el.className = 'particle';
      el.style.borderRadius = '0';
      el.style.background = 'transparent';
      particlesLayer.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }, i * 80);
  }
}

function toggleMatrix() {
  matrixRunning = !matrixRunning;
  const mc = document.getElementById('matrixCanvas');
  if (matrixRunning) {
    mc.classList.remove('hidden');
    runMatrix();
  } else {
    mc.classList.add('hidden');
    clearInterval(matrixInterval);
    matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  }
}

function runMatrix() {
  matrixColumns = new Array(Math.floor(matrixCanvas.width / 20)).fill(0);
  matrixInterval = setInterval(() => {
    matrixCtx.fillStyle = 'rgba(0,0,0,0.05)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    matrixCtx.fillStyle = '#00ff41';
    matrixCtx.font = '14px monospace';
    matrixColumns.forEach((y, i) => {
      const ch = String.fromCharCode(0x30A0 + Math.random() * 96);
      matrixCtx.fillStyle = `hsl(${120 + Math.random()*60},100%,${50 + Math.random()*30}%)`;
      matrixCtx.fillText(ch, i * 20, y);
      matrixColumns[i] = (y > matrixCanvas.height && Math.random() > 0.975) ? 0 : y + 20;
    });
  }, 50);
}

function spawnBubbles() {
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      const size = Math.random() * 60 + 20;
      const x = Math.random() * window.innerWidth;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      el.style.cssText = `
        position:absolute;
        left:${x}px; bottom:-10px;
        width:${size}px; height:${size}px;
        border-radius:50%;
        border: 2px solid ${color}55;
        background: radial-gradient(circle at 35% 35%, ${color}33, transparent 70%);
        box-shadow: inset 0 0 10px ${color}22, 0 0 20px ${color}22;
        --px:${(Math.random()-0.5)*100}px;
        --py:-${window.innerHeight + 100}px;
        animation:particleFall ${3 + Math.random() * 3}s ease-in-out forwards;
        border-radius:50%;
        background-color:transparent;
      `;
      el.className = 'particle';
      particlesLayer.appendChild(el);
      setTimeout(() => el.remove(), 7000);
    }, i * 150);
  }
}

// ─── TOOL PANEL ─────────────────────────────────────────
function setupToolPanel() {
  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Brush buttons
  document.querySelectorAll('.brush-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBrush = btn.dataset.brush;
    });
  });

  // Color picker
  document.getElementById('colorPicker').addEventListener('input', e => {
    currentColor = e.target.value;
    fingerCursorEl && (fingerCursorEl.style.setProperty('--draw-color', currentColor));
  });

  // Palette dots
  document.querySelectorAll('.palette-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentColor = dot.dataset.color;
      document.getElementById('colorPicker').value = currentColor;
      fingerCursorEl && (fingerCursorEl.style.setProperty('--draw-color', currentColor));
    });
  });

  // Sliders
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeVal    = document.getElementById('sizeVal');
  sizeSlider.addEventListener('input', () => { brushSize = +sizeSlider.value; sizeVal.textContent = brushSize; });

  const opSlider = document.getElementById('opacitySlider');
  const opVal    = document.getElementById('opacityVal');
  opSlider.addEventListener('input', () => { brushOpacity = opSlider.value / 100; opVal.textContent = opSlider.value; });

  // Shape buttons
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => drawShape(btn.dataset.shape));
  });

  // Clear
  document.getElementById('clearBtn').addEventListener('click', () => {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    showToast('Canvas cleared 🗑️');
  });

  // Save / Screenshot
  document.getElementById('saveBtn').addEventListener('click', saveDrawing);
  document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
}

function setMode(mode) {
  currentMode = mode;
  const labels = { draw:'✏️ DRAW', keyboard:'⌨️ KEYBOARD', erase:'🧹 ERASE', text:'📝 TEXT' };
  document.getElementById('modeLabel').textContent = labels[mode] || mode.toUpperCase();
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  const kb = document.getElementById('keyboardOverlay');
  if (mode === 'keyboard') {
    kb.classList.remove('hidden');
  } else {
    kb.classList.add('hidden');
  }
  showToast(`Mode: ${labels[mode] || mode} 👆`);
}

function drawShape(shape) {
  const cx = drawCanvas.width / 2, cy = drawCanvas.height / 2;
  const x  = indexTipX || cx, y = indexTipY || cy;
  drawCtx.save();
  drawCtx.strokeStyle = currentColor;
  drawCtx.fillStyle   = currentColor + '44';
  drawCtx.shadowColor = currentColor;
  drawCtx.shadowBlur  = 20;
  drawCtx.lineWidth   = brushSize;
  drawCtx.globalAlpha = brushOpacity;

  if (shape === 'circle') {
    drawCtx.beginPath();
    drawCtx.arc(x, y, 60, 0, Math.PI * 2);
    drawCtx.fill(); drawCtx.stroke();
  } else if (shape === 'star') {
    drawStar(drawCtx, x, y, 5, 70, 30);
    drawCtx.fill(); drawCtx.stroke();
  } else if (shape === 'heart') {
    drawHeart(drawCtx, x, y, 60);
    drawCtx.fill(); drawCtx.stroke();
  } else if (shape === 'arrow') {
    drawCtx.beginPath();
    drawCtx.moveTo(x - 60, y);
    drawCtx.lineTo(x + 60, y);
    drawCtx.moveTo(x + 30, y - 30);
    drawCtx.lineTo(x + 60, y);
    drawCtx.lineTo(x + 30, y + 30);
    drawCtx.stroke();
  }
  drawCtx.restore();
  spawnConfetti(30);
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
             : ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
  }
  ctx.closePath();
}

function drawHeart(ctx, cx, cy, size) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.7);
  ctx.bezierCurveTo(cx - s * 2, cy - s * 0.3, cx - s * 2, cy - s * 1.5, cx, cy - s * 0.7);
  ctx.bezierCurveTo(cx + s * 2, cy - s * 1.5, cx + s * 2, cy - s * 0.3, cx, cy + s * 0.7);
  ctx.closePath();
}

// ─── SAVE / SCREENSHOT ──────────────────────────────────
function saveDrawing() {
  const a = document.createElement('a');
  a.download = 'fingermagic-drawing.png';
  a.href = drawCanvas.toDataURL();
  a.click();
  showToast('Drawing saved 💾');
}

function takeScreenshot() {
  // Merge video + drawCanvas
  const tmp = document.createElement('canvas');
  tmp.width  = drawCanvas.width;
  tmp.height = drawCanvas.height;
  const tCtx = tmp.getContext('2d');
  tCtx.save();
  tCtx.translate(tmp.width, 0);
  tCtx.scale(-1, 1);
  tCtx.drawImage(videoEl, 0, 0, tmp.width, tmp.height);
  tCtx.restore();
  tCtx.drawImage(drawCanvas, 0, 0);

  const a = document.createElement('a');
  a.download = 'fingermagic-screenshot.png';
  a.href = tmp.toDataURL();
  a.click();
  showToast('Screenshot saved 📸');
}

// ─── MOUSE FALLBACK (when no hand) ─────────────────────
function setupMouseFallback() {
  let mouseDown = false;
  let lastMouse = null;

  const getXY = e => {
    const rect = drawCanvas?.getBoundingClientRect() || { left: 0, top: 0 };
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  window.addEventListener('mousedown', e => {
    if (!drawCanvas) return;
    if (e.target.closest('.tool-panel, .effects-panel, .hud-top, .keyboard-overlay')) return;
    mouseDown = true;
    lastMouse = getXY(e);
  });
  window.addEventListener('mousemove', e => {
    if (!drawCanvas || handTracked) return;
    const pos = getXY(e);
    if (fingerCursorEl) {
      fingerCursorEl.style.left = pos.x + 'px';
      fingerCursorEl.style.top  = pos.y + 'px';
      fingerCursorEl.classList.remove('hidden');
    }
    if (mouseDown && lastMouse && currentMode === 'draw') {
      drawStroke(lastMouse, pos);
      lastMouse = pos;
    } else if (mouseDown && currentMode === 'erase') {
      handleErase(true);
      indexTipX = pos.x; indexTipY = pos.y;
    }
    if (currentMode === 'keyboard') handleKeyboardHover();
    indexTipX = pos.x; indexTipY = pos.y;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; lastMouse = null; });
  window.addEventListener('touchstart', e => {
    const pos = getXY(e);
    mouseDown = true; lastMouse = pos;
    indexTipX = pos.x; indexTipY = pos.y;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    const pos = getXY(e);
    if (mouseDown && lastMouse && currentMode === 'draw') {
      drawStroke(lastMouse, pos);
      lastMouse = pos;
    }
    indexTipX = pos.x; indexTipY = pos.y;
  }, { passive: true });
  window.addEventListener('touchend', () => { mouseDown = false; lastMouse = null; });
}

// ─── CAMERA GLOW ANIMATION ──────────────────────────────
function startCameraGlow() {
  // Periodic ambient word emission
  setInterval(() => {
    if (Math.random() > 0.8) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      spawnWord(w, x, y);
    }
  }, 2000);
}

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, duration = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}
