import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ===== Config =====
const MAX_TRAILS = 10;
const VOLUME_RADIUS = 14;
const ACCENT_COLOR = new THREE.Color('#00d4ff');
const ACCENT_BRIGHT = new THREE.Color('#33eeff');
const ACCENT_DIM = new THREE.Color('#006d78');

// ===== Corpus State =====
let corpusItems = null;
let corpusVectors = null;
let corpusPCA = null;
let corpusModel = null;
let nameToIdx = null;
let corpusLoaded = false;
let vectorsLoaded = false;
let lastFormula = null;
let lastFormulaTokens = [];
let lastFormulaOps = [];
let lastFormulaResultName = null;
let lastFormulaResultVec = null;
let lastFormulaResultNeighbors = null;

// ===== DOM Refs =====
const infoCard = document.getElementById('info-card');
const infoCardWord = document.getElementById('info-card-word');
const infoCardDesc = document.getElementById('info-card-desc');
const infoCardList = document.getElementById('info-card-list');
const infoCardSource = document.getElementById('info-card-source');
const helpBtn = document.getElementById('help-btn');
const formulaInput = document.getElementById('formula-input');
const ghostText = document.getElementById('ghost-text');
const inputContainer = document.getElementById('input-container');
const statusLine = document.getElementById('status-line');
const loadingEl = document.getElementById('loading');
const clearBtn = document.getElementById('clear-btn');
const trailCount = document.getElementById('trail-count');
const observatoryOverlay = document.getElementById('observatory-overlay');
const observatoryPanel = document.getElementById('observatory-panel');
const pipeline = document.getElementById('pipeline');
const pipelineAnnotation = document.getElementById('annotation');

// ===== Three.js Setup =====
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new THREE.Color('#0a0a0a'));
document.body.prepend(renderer.domElement);
renderer.domElement.id = 'canvas';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 80);
camera.position.set(0, 2, 18);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.target.set(0, 0, 0);
controls.enablePan = true;
controls.enableZoom = true;
controls.zoomSpeed = 0.8;

const lineGroup = new THREE.Group();
scene.add(lineGroup);
const spriteGroup = new THREE.Group();
scene.add(spriteGroup);

let corpusPoints = null;
let scatterPoints = null;
let corpusGeometry = null;
let corpusColors = null;
let corpusCount = 0;

// ===== Textures =====
function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 - 6);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createGlowTexture(innerColor, outerColor, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.3, innerColor);
  gradient.addColorStop(0.7, outerColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createRingTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(0,212,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 24, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function createLabelTexture(text, opacity) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '400 20px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(0,229,255,' + (opacity || 0.8) + ')';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.format = THREE.RGBAFormat;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  return tex;
}

const pointTexture = createCircleTexture();
const glowTexture = createGlowTexture('rgba(0,229,255,0.7)', 'rgba(0,229,255,0)', 128);
const glowTextureBright = createGlowTexture('rgba(0,255,255,0.9)', 'rgba(0,229,255,0)', 128);
const glowSpriteMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  transparent: true,
});

// ===== Mouse / Click =====
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 2.0;
const mouse = new THREE.Vector2();

let cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraLerpSpeed = 0.03;
let infoCardTarget = null;
let infoCardVisible = false;
let ripples = [];
let autoRotatePaused = false;
let autoRotateTimer = 0;
let clickRingSprite = null;
let hoverRingSprite = null;
let hoveredIdx = -1;
let savedHoverColor = null;

function spawnClickRing(position) {
  removeClickRing();
  const mat = new THREE.SpriteMaterial({
    map: createRingTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  });
  clickRingSprite = new THREE.Sprite(mat);
  clickRingSprite.position.copy(position);
  const dist = camera.position.distanceTo(position);
  clickRingSprite.scale.set(dist * 0.013, dist * 0.013, 1);
  spriteGroup.add(clickRingSprite);
}

function removeClickRing() {
  if (clickRingSprite) {
    spriteGroup.remove(clickRingSprite);
    clickRingSprite.material.map.dispose();
    clickRingSprite.material.dispose();
    clickRingSprite = null;
  }
}

function showHoverRing(position) {
  if (!hoverRingSprite) {
    const mat = new THREE.SpriteMaterial({
      map: createRingTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      opacity: 0.55,
    });
    hoverRingSprite = new THREE.Sprite(mat);
    spriteGroup.add(hoverRingSprite);
  }
  hoverRingSprite.position.copy(position);
}

function hideHoverRing() {
  if (hoverRingSprite) {
    spriteGroup.remove(hoverRingSprite);
    hoverRingSprite.material.map.dispose();
    hoverRingSprite.material.dispose();
    hoverRingSprite = null;
  }
}

function spawnRipple(position) {
  const mat = new THREE.SpriteMaterial({
    map: glowTextureBright,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0.3,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(0.15, 0.15, 1);
  spriteGroup.add(sprite);
  ripples.push({ sprite, age: 0, maxAge: 1000 });
}

function pauseAutoRotate() {
  if (!autoRotatePaused) {
    controls.autoRotate = false;
    autoRotatePaused = true;
  }
  autoRotateTimer = 0;
}

function resumeAutoRotate() {
  if (autoRotatePaused) {
    controls.autoRotate = true;
    autoRotatePaused = false;
  }
}

// ===== Loading =====
async function loadCorpusMeta() {
  const res = await fetch(new URL('./data/corpus.json.gz', import.meta.url));
  if (!res.ok) {
    statusLine.textContent = 'corpus unavailable';
    statusLine.classList.add('visible');
    loadingEl.style.display = 'none';
    return false;
  }
  const ds = new DecompressionStream('gzip');
  const decompressed = await new Response(res.body.pipeThrough(ds)).text();
  const data = JSON.parse(decompressed);
  corpusItems = data.items;
  corpusPCA = data.pca;
  corpusModel = data.model;
  nameToIdx = new Map();
  for (let i = 0; i < corpusItems.length; i++) {
    nameToIdx.set(corpusItems[i].name, i);
  }
  corpusLoaded = true;
  buildPointCloud();
  loadingEl.style.display = 'none';
  return true;
}

let vectorsPromise = null;

async function loadCorpusVectors() {
  if (vectorsLoaded) return true;
  if (vectorsPromise) return vectorsPromise;
  vectorsPromise = fetch(new URL('./data/corpus.vec.f32', import.meta.url)).then(async (res) => {
    if (!res.ok) {
      vectorsPromise = null;
      statusLine.textContent = 'vector data unavailable — try again';
      statusLine.classList.add('visible');
      statusLine.classList.add('error');
      setTimeout(() => statusLine.classList.remove('visible', 'error'), 4000);
      return false;
    }
    const buf = await res.arrayBuffer();
    corpusVectors = new Float32Array(buf);
    vectorsLoaded = true;

    if (corpusModel && corpusModel.vec_sha256) {
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashHex !== corpusModel.vec_sha256) {
        console.error('corpus.vec.f32 integrity check failed');
      }
    }
    return true;
  }).catch(() => {
    vectorsPromise = null;
    return false;
  });
  return vectorsPromise;
}

async function ensureVectorsLoaded() {
  if (!vectorsLoaded) return loadCorpusVectors();
  return true;
}

// ===== Point Cloud =====
const MIN_POINTS = 5000;

function randomInSphere(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
}

function buildPointCloud() {
  const N = corpusItems.length;
  const filler = Math.max(0, MIN_POINTS - N);
  corpusCount = N;

  const mat = new THREE.PointsMaterial({
    size: 0.22,
    map: pointTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    transparent: true,
  });

  const cPos = new Float32Array(N * 3);
  const cCol = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const p = corpusItems[i].pos;
    cPos[i * 3] = p[0];
    cPos[i * 3 + 1] = p[1];
    cPos[i * 3 + 2] = p[2];
    const b = 0.04 + Math.random() * 0.10;
    cCol[i * 3] = b;
    cCol[i * 3 + 1] = b;
    cCol[i * 3 + 2] = b;
  }
  corpusColors = cCol;
  corpusGeometry = new THREE.BufferGeometry();
  corpusGeometry.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  corpusGeometry.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  corpusPoints = new THREE.Points(corpusGeometry, mat);
  scene.add(corpusPoints);

  if (filler > 0) {
    const sPos = new Float32Array(filler * 3);
    const sCol = new Float32Array(filler * 3);
    for (let i = 0; i < filler; i++) {
      const [x, y, z] = randomInSphere(VOLUME_RADIUS);
      sPos[i * 3] = x;
      sPos[i * 3 + 1] = y;
      sPos[i * 3 + 2] = z;
      const b = 0.015 + Math.random() * 0.035;
      sCol[i * 3] = b;
      sCol[i * 3 + 1] = b;
      sCol[i * 3 + 2] = b;
    }
    const sGeom = new THREE.BufferGeometry();
    sGeom.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeom.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    scatterPoints = new THREE.Points(sGeom, mat);
    scene.add(scatterPoints);
  }
}

// ===== Math Core =====
function parseFormula(raw) {
  const parts = raw.toLowerCase().trim().split(/\s+/);
  const tokens = [];
  const ops = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      tokens.push(parts[i]);
    } else {
      if (parts[i] === '+' || parts[i] === '-') {
        ops.push(parts[i]);
      }
    }
  }
  if (tokens.length === ops.length + 1) return { tokens, ops };
  return { tokens: [raw.toLowerCase().trim()], ops: [] };
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function lookupToken(token) {
  if (!nameToIdx) return null;
  const exact = nameToIdx.get(token);
  if (exact !== undefined) return { name: token, idx: exact, exact: true, suggestion: null };

  let bestDist = Infinity;
  let bestName = null;
  for (const name of nameToIdx.keys()) {
    if (name.startsWith(token)) continue;
    const d = levenshtein(token, name);
    if (d < bestDist) { bestDist = d; bestName = name; }
  }
  if (bestName !== null && bestDist <= 3) {
    return { name: token, idx: nameToIdx.get(bestName), exact: false, suggestion: bestName };
  }
  return { name: token, idx: -1, exact: false, suggestion: null };
}

function computeResult(tokens, ops) {
  if (!vectorsLoaded || !corpusVectors) return null;
  const DIM = 384;
  const N = corpusVectors.length / DIM;
  const result = new Float32Array(DIM);

  let idx0 = nameToIdx.get(tokens[0]);
  if (idx0 === undefined || idx0 >= N) return null;
  for (let d = 0; d < DIM; d++) result[d] = corpusVectors[idx0 * DIM + d];

  for (let i = 0; i < ops.length; i++) {
    const idx = nameToIdx.get(tokens[i + 1]);
    if (idx === undefined || idx >= N) return null;
    const sign = ops[i] === '-' ? -1 : 1;
    for (let d = 0; d < DIM; d++) result[d] += sign * corpusVectors[idx * DIM + d];
  }
  return result;
}

function nearestNeighbors(vec, k) {
  if (!vectorsLoaded || !corpusVectors || !corpusItems) return [];
  const DIM = 384;
  const N = corpusVectors.length / DIM;
  const heap = [];
  let vNorm = 0;
  for (let d = 0; d < DIM; d++) vNorm += vec[d] * vec[d];
  vNorm = Math.sqrt(vNorm) || 1;

  for (let i = 0; i < N; i++) {
    let dot = 0;
    let iNorm = 0;
    for (let d = 0; d < DIM; d++) {
      dot += vec[d] * corpusVectors[i * DIM + d];
      iNorm += corpusVectors[i * DIM + d] * corpusVectors[i * DIM + d];
    }
    iNorm = Math.sqrt(iNorm) || 1;
    const score = dot / (vNorm * iNorm);
    heap.push({ idx: i, name: corpusItems[i].name, score });
    heap.sort((a, b) => b.score - a.score);
    if (heap.length > k) heap.length = k;
  }
  return heap;
}

function projectVec(vec) {
  if (!corpusPCA) return [0, 0, 0];
  const DIM = 384;
  const mean = corpusPCA.mean;
  const components = corpusPCA.components;
  const centered = new Float32Array(DIM);
  for (let d = 0; d < DIM; d++) centered[d] = vec[d] - mean[d];
  const result = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    for (let d = 0; d < DIM; d++) result[c] += centered[d] * components[c][d];
  }
  return result;
}

// ===== Trail Rendering =====
let trails = [];

function createTrailObject(formula) {
  return {
    id: Date.now(),
    formula,
    sourceIndices: [],
    neighborLabelIndices: [],
    resultPos: null,
    resultName: null,
    glowSprites: [],
    labelSprites: [],
    lines: [],
    resultGlow: null,
    resultLabel: null,
    opacity: 1.0,
  };
}

function addSourceGlow(idx, trail) {
  const p = corpusItems[idx].pos;
  const pos = new THREE.Vector3(p[0], p[1], p[2]);
  const mat = new THREE.SpriteMaterial({
    map: glowTextureBright,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.25,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.set(2.2, 2.2, 1);
  spriteGroup.add(sprite);
  trail.glowSprites.push(sprite);

  const innerMat = new THREE.SpriteMaterial({
    map: glowTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.45,
  });
  const innerSprite = new THREE.Sprite(innerMat);
  innerSprite.position.copy(pos);
  innerSprite.scale.set(0.8, 0.8, 1);
  spriteGroup.add(innerSprite);
  trail.glowSprites.push(innerSprite);

  return sprite;
}

function addConnectorBetween(a, b, trail, bright) {
  const dir = new THREE.Vector3().copy(b).sub(a);
  const len = dir.length();
  if (len < 0.01) return null;
  const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
  const geom = new THREE.CylinderGeometry(0.01, 0.015, len, 6, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: bright ? 0.95 : 0.7,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(mid);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
  mesh.setRotationFromQuaternion(quat);
  mesh.renderOrder = 999;
  lineGroup.add(mesh);
  trail.lines.push(mesh);

  const dotGeom = new THREE.SphereGeometry(0.04, 6, 4);
  const dotMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: bright ? 0.9 : 0.6,
  });
  const dotA = new THREE.Mesh(dotGeom, dotMat);
  dotA.position.copy(a);
  dotA.renderOrder = 1000;
  lineGroup.add(dotA);
  trail.lines.push(dotA);

  const dotB = new THREE.Mesh(dotGeom, dotMat);
  dotB.position.copy(b);
  dotB.renderOrder = 1000;
  lineGroup.add(dotB);
  trail.lines.push(dotB);

  return mesh;
}

function addLabelAt(position, text, opacity, trail) {
  const tex = createLabelTexture(text, opacity);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    alphaTest: 0.01,
    opacity: 0.8,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position).add(new THREE.Vector3(0, 0.35, 0));
  sprite.scale.set(3.5, 0.875, 1);
  spriteGroup.add(sprite);
  trail.labelSprites.push(sprite);
  return sprite;
}

function addResultGlow(pos, trail) {
  const mat = new THREE.SpriteMaterial({
    map: glowTextureBright,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.7,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.set(1.6, 1.6, 1);
  spriteGroup.add(sprite);
  trail.resultGlow = sprite;
  return sprite;
}

function dimAllTrails() {
  for (let i = 0; i < trails.length; i++) {
    const age = trails.length - 1 - i;
    const baseFade = 0.18 + age * 0.02;
    trails[i].opacity = Math.max(0.12, baseFade);
    for (const line of trails[i].lines) {
      if (line.material) line.material.opacity = trails[i].opacity * 0.85;
    }
    for (const sprite of trails[i].labelSprites) {
      if (sprite.material) sprite.material.opacity = trails[i].opacity * 0.8;
    }
    for (const sprite of trails[i].glowSprites) {
      if (sprite.material) sprite.material.opacity = trails[i].opacity * 0.6;
    }
    if (trails[i].resultGlow && trails[i].resultGlow.material) {
      trails[i].resultGlow.material.opacity = trails[i].opacity * 0.7;
    }
  }
  if (trails.length > 0) {
    const latest = trails[trails.length - 1];
    latest.opacity = 1.0;
    for (const line of latest.lines) {
      if (line.material) line.material.opacity = 0.85;
    }
    for (const sprite of latest.labelSprites) {
      if (sprite.material) sprite.material.opacity = 0.8;
    }
    for (const sprite of latest.glowSprites) {
      if (sprite.material) sprite.material.opacity = 0.6;
    }
    if (latest.resultGlow && latest.resultGlow.material) {
      latest.resultGlow.material.opacity = 0.7;
    }
  }
  updateTrailCount();
}

function evictTrails() {
  while (trails.length > MAX_TRAILS) {
    const removed = trails.shift();
    removed.glowSprites.forEach(s => { spriteGroup.remove(s); s.material.dispose(); });
    removed.labelSprites.forEach(s => { spriteGroup.remove(s); if (s.material.map) s.material.map.dispose(); s.material.dispose(); });
    removed.lines.forEach(l => { lineGroup.remove(l); l.geometry.dispose(); l.material.dispose(); });
    if (removed.resultGlow) { spriteGroup.remove(removed.resultGlow); removed.resultGlow.material.dispose(); }
    if (removed.resultLabel) { spriteGroup.remove(removed.resultLabel); removed.resultLabel.material.map.dispose(); removed.resultLabel.material.dispose(); }
  }
}

function clearAllTrails() {
  removeClickRing();
  hideInfoCard();
  for (const trail of trails) {
    trail.glowSprites.forEach(s => { spriteGroup.remove(s); s.material.dispose(); });
    trail.labelSprites.forEach(s => { spriteGroup.remove(s); if (s.material.map) s.material.map.dispose(); s.material.dispose(); });
    trail.lines.forEach(l => { lineGroup.remove(l); l.geometry.dispose(); l.material.dispose(); });
    if (trail.resultGlow) { spriteGroup.remove(trail.resultGlow); trail.resultGlow.material.dispose(); }
    if (trail.resultLabel) { spriteGroup.remove(trail.resultLabel); trail.resultLabel.material.map.dispose(); trail.resultLabel.material.dispose(); }
  }
  trails = [];
  lastFormula = null;
  lastFormulaTokens = [];
  lastFormulaOps = [];
  lastFormulaResultName = null;
  lastFormulaResultVec = null;
  lastFormulaResultNeighbors = null;
  updateTrailCount();
  updateURLHash('');
  inputContainer.classList.remove('active');
  hidePipeline();
  formulaInput.value = '';
  ghostText.classList.add('visible');
}

function updateTrailCount() {
  if (trails.length === 0) {
    trailCount.textContent = '';
    trailCount.classList.remove('visible');
  } else {
    trailCount.textContent = `${trails.length} trail${trails.length !== 1 ? 's' : ''}`;
    trailCount.classList.add('visible');
  }
}

// ===== Formula Handling =====
async function handleFormula(formula) {
  if (!schemaParsed) return;
  const { tokens, ops } = parseFormula(formula);

  if (tokens.length === 1) {
    const result = lookupToken(tokens[0]);
    if (!result || result.idx < 0) {
      inputContainer.classList.remove('active');
      return;
    }
    const trail = createTrailObject(formula);
    trail.sourceIndices.push(result.idx);
    const itemName = corpusItems[result.idx].name;
    trail.resultName = itemName;
    trail.resultPos = new THREE.Vector3(corpusItems[result.idx].pos[0], corpusItems[result.idx].pos[1], corpusItems[result.idx].pos[2]);
    addSourceGlow(result.idx, trail);

    const item = corpusItems[result.idx];
    const topN = Math.min((item.nn || []).length, 10);
    const sourcePos = trail.resultPos.clone();
    for (let k = 0; k < topN; k++) {
      const nnIdx = nameToIdx.get(item.nn[k].name);
      if (nnIdx !== undefined) {
        trail.neighborLabelIndices.push(nnIdx);
        const nnPos = new THREE.Vector3(corpusItems[nnIdx].pos[0], corpusItems[nnIdx].pos[1], corpusItems[nnIdx].pos[2]);
        addConnectorBetween(sourcePos, nnPos, trail, false);
        addLabelAt(nnPos.clone(), item.nn[k].name, 0.8, trail);
      }
    }
    addResultGlow(trail.resultPos, trail);
    trail.resultLabel = addLabelAt(trail.resultPos.clone().add(new THREE.Vector3(0, 0.5, 0)), itemName, 0.95, trail);

    trails.push(trail);
    evictTrails();
    dimAllTrails();
    lastFormula = formula;
    lastFormulaTokens = [itemName];
    lastFormulaOps = [];
    lastFormulaResultName = result.name;
    lastFormulaResultVec = null;
    lastFormulaResultNeighbors = item.nn || [];
    inputContainer.classList.add('active');
    updateURLHash(formula);
    showPipeline();
    setPipelineStage(3);
    setPipelineAnnotation('single-word lookup — nearest neighbors by cosine similarity');
    cameraTarget.copy(trail.resultPos);
    cameraLerpSpeed = 0.03;
    return;
  }

  // Multi-token: need vectors
  const vOk = await ensureVectorsLoaded();
  if (!vOk) return;

  const resolved = tokens.map(t => lookupToken(t));
  const allResolved = resolved.every(r => r && r.idx >= 0);
  if (!allResolved) {
    inputContainer.classList.remove('active');
    return;
  }

  const trail = createTrailObject(formula);
  const resolvedNames = resolved.map(r => r.suggestion || r.name);

  // Source glows + indices
  const sourcePositions = [];
  for (const r of resolved) {
    trail.sourceIndices.push(r.idx);
    addSourceGlow(r.idx, trail);
    const p = corpusItems[r.idx].pos;
    sourcePositions.push(new THREE.Vector3(p[0], p[1], p[2]));
  }

  // Sequential connectors
  for (let i = 1; i < sourcePositions.length; i++) {
    addConnectorBetween(sourcePositions[i - 1], sourcePositions[i], trail, false);
  }

  // Compute result vector using resolved names (post did-you-mean)
  const resultVec = computeResult(resolvedNames, ops);
  if (!resultVec) {
    inputContainer.classList.remove('active');
    return;
  }
  const resultPos3 = projectVec(resultVec);
  const resultPos = new THREE.Vector3(resultPos3[0], resultPos3[1], resultPos3[2]);
  trail.resultPos = resultPos;

  // Animated result arrow
  if (sourcePositions.length > 0) {
    addConnectorBetween(sourcePositions[sourcePositions.length - 1], resultPos, trail, true);
  }

  // Nearest neighbors
  const neighbors = nearestNeighbors(resultVec, 10);
  lastFormulaResultNeighbors = neighbors;

  const topName = neighbors.length > 0 ? neighbors[0].name : null;
  trail.resultName = topName;
  addResultGlow(resultPos, trail);
  if (topName) {
    trail.resultLabel = addLabelAt(resultPos.clone().add(new THREE.Vector3(0, 0.5, 0)), topName, 0.95, trail);
  }

  const topK = Math.min(neighbors.length, 10);
  for (let k = 0; k < topK; k++) {
    trail.neighborLabelIndices.push(neighbors[k].idx);
    const nnPos = new THREE.Vector3(corpusItems[neighbors[k].idx].pos[0], corpusItems[neighbors[k].idx].pos[1], corpusItems[neighbors[k].idx].pos[2]);
    addConnectorBetween(resultPos, nnPos, trail, false);
    addLabelAt(nnPos.clone(), neighbors[k].name, 0.8, trail);
  }

  trails.push(trail);
  evictTrails();
  dimAllTrails();
  lastFormula = formula;
  lastFormulaTokens = resolvedNames;
  lastFormulaOps = ops;
  lastFormulaResultName = topName;
  lastFormulaResultVec = resultVec;
  inputContainer.classList.add('active');
  updateURLHash(formula);
  showPipeline();
  const exprStr = resolvedNames.reduce((s, t, i) => s + t + (i < ops.length ? ' ' + ops[i] + ' ' : ''), '');
  if (topName) {
    setPipelineStage(3);
    setPipelineAnnotation(`vector arithmetic: ${exprStr} → ${topName}`);
  } else {
    setPipelineStage(1);
    setPipelineAnnotation(`vector arithmetic: ${exprStr}`);
  }
  cameraTarget.copy(resultPos);
  cameraLerpSpeed = 0.025;
}

// ===== Click Handling =====
function getWorldPointAtScreen(x, y) {
  if (!corpusPoints) return null;
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(corpusPoints);
  if (intersects.length > 0) {
    intersects.sort((a, b) => a.distanceToRay - b.distanceToRay);
    return intersects.map(hit => ({ point: hit.point.clone(), idx: hit.index }));
  }
  return null;
}

function clampCardPosition(px, py) {
  const M = 12;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cw = infoCard.offsetWidth || 220;
  const ch = infoCard.offsetHeight || 180;

  const roomAbove = py - M;
  const roomBelow = h - py - M;
  const roomLeft = px - M;
  const roomRight = w - px - M;

  const yDir = (roomAbove >= ch + 16 || roomAbove >= roomBelow) ? 'above' : 'below';
  const xAlign = roomLeft < cw / 2 ? 'left' : (roomRight < cw / 2 ? 'right' : 'center');

  let tx, ty;
  if (xAlign === 'left') tx = '0';
  else if (xAlign === 'right') tx = '-100%';
  else tx = '-50%';

  if (yDir === 'above') ty = 'calc(-100% - 16px)';
  else ty = '16px';

  infoCard.style.transform = `translate(${tx}, ${ty}) scale(0.8)`;
  infoCard.style.left = `${px}px`;
  infoCard.style.top = `${py}px`;
}

function showInfoCard(worldPos, item, idx, screenX, screenY) {
  const px = Math.max(0, Math.min(window.innerWidth, screenX));
  const py = Math.max(0, Math.min(window.innerHeight, screenY));

  infoCardWord.textContent = item.name;

  let desc = item.description || '';
  if (desc.length > 120) desc = desc.slice(0, 120) + '\u2026';
  infoCardDesc.textContent = desc;
  infoCardDesc.style.display = desc ? 'block' : 'none';

  infoCardList.innerHTML = '';
  const top5 = (item.nn || []).slice(0, 5);
  top5.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="label">${n.name}</span><span class="score">${n.score.toFixed(3)}</span>`;
    infoCardList.appendChild(li);
  });

  infoCardSource.textContent = item.source ? `Source: ${item.source}` : '';
  infoCardSource.style.display = item.source ? 'block' : 'none';

  infoCard.classList.remove('visible');
  void infoCard.offsetWidth;
  clampCardPosition(px, py);
  infoCard.classList.add('visible');
  infoCardVisible = true;
  infoCardTarget = worldPos;

  spawnRipple(worldPos);
  spawnClickRing(worldPos);
  pauseAutoRotate();
}

function hideInfoCard() {
  infoCard.classList.remove('visible');
  infoCardVisible = false;
  infoCardTarget = null;
  removeClickRing();
  resumeAutoRotate();
  if (hoveredIdx >= 0) restoreHoverColor();
  renderer.domElement.style.cursor = '';
}

// ===== URL Hash =====
function parseHashParams(hash) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return { formula: null, corpusId: 'default', debug: false };

  // Check if it's a query-string format (has '=' or '&')
  if (raw.includes('=') || raw.includes('&')) {
    const params = new URLSearchParams(raw);
    return {
      formula: params.get('f') ? decodeURIComponent(params.get('f')) : null,
      corpusId: params.get('s') || 'default',
      debug: params.has('debug'),
    };
  }

  // Bare hash → formula for backward compat
  return {
    formula: decodeURIComponent(raw.replace(/\+/g, ' ')),
    corpusId: 'default',
    debug: false,
  };
}

function serializeHash(formula, corpusId) {
  if (!formula) return '';
  const params = new URLSearchParams();
  params.set('f', formula);
  if (corpusId && corpusId !== 'default') params.set('s', corpusId);
  return '#' + params.toString();
}

function updateURLHash(formula) {
  const hash = serializeHash(formula, 'default');
  const url = window.location.pathname + hash;
  history.pushState(null, '', url);
}

function loadFromHash() {
  const { formula } = parseHashParams(window.location.hash);
  if (formula) {
    formulaInput.value = formula;
    ghostText.classList.remove('visible');
  }
}

// ===== Observatory =====
function showObservatory() {
  if (!lastFormula) {
    observatoryPanel.innerHTML = `
      <div class="observatory-title">observatory</div>
      <div style="color: var(--muted); font-size: 13px; padding: 20px 0;">
        enter a formula to see the pipeline<br><br>
        try <span style="color:var(--accent)">king - man + woman</span>
      </div>
    `;
  } else {
    const tokenStr = lastFormulaTokens.join(' ');
    const ops = lastFormulaOps;
    const resultName = lastFormulaResultName || '?';
    const neighbors = lastFormulaResultNeighbors || [];
    const resultVec = lastFormulaResultVec;

    const steps = [];
    steps.push({
      num: 1, label: 'tokenize', detail: tokenStr, highlight: true
    });
    steps.push({
      num: 2, label: 'embed (384-dim)', detail: lastFormulaTokens.map(t => `${t} → vector`).join('\n'), highlight: true
    });
    const interleavedExpr = [];
    for (let i = 0; i < lastFormulaTokens.length; i++) {
      interleavedExpr.push(lastFormulaTokens[i]);
      if (i < ops.length) interleavedExpr.push(ops[i]);
    }
    steps.push({
      num: 3, label: 'arithmetic',
      detail: interleavedExpr.join(' ') + (resultName !== '?' ? ' → ' + resultName : ''),
      highlight: ops.length > 0
    });
    if (resultVec) {
      const proj = projectVec(resultVec);
      steps.push({
        num: 4, label: 'PCA-3 projection',
        detail: `${resultName} → [x: ${proj[0].toFixed(2)}  y: ${proj[1].toFixed(2)}  z: ${proj[2].toFixed(2)}]`,
        highlight: true
      });
    }
    steps.push({
      num: 5, label: 'result',
      detail: resultName !== '?' ? `${resultName} + top-${neighbors.length} neighbors` : 'nearest neighbor search',
      highlight: !!lastFormulaResultName
    });

    observatoryPanel.innerHTML = `
      <div class="observatory-title">observatory</div>
      <div class="observatory-pipeline">
        ${steps.map(s => `
          <div class="obs-step${s.highlight ? ' highlight' : ''}">
            <span class="obs-step-num">${s.num}.</span>
            <div class="obs-step-content">
              <div class="obs-step-label">${s.label}</div>
              <div class="obs-step-detail${s.num === 2 ? ' mono' : ''}">${s.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="observatory-footer">
        model: ${corpusModel ? corpusModel.id : 'sentence-transformers/all-MiniLM-L6-v2'}<br>
        corpus: ${corpusModel ? corpusModel.corpus_size.toLocaleString() : '?'} items<br>
        projection: PCA (3 components)<br>
        variance explained: ${corpusModel ? (corpusModel.variance_explained[0] * 100).toFixed(1) : '?'}%<br>
        ${corpusModel ? 'version: ' + corpusModel.corpus_version + '<br>' : ''}
        tools/generate_corpus.py
      </div>
    `;
  }
  observatoryOverlay.classList.add('visible');
}

function hideObservatory() {
  observatoryOverlay.classList.remove('visible');
}

function setPipelineStage(stageIdx) {
  const stages = pipeline.querySelectorAll('.pipe-stage');
  stages.forEach((s, i) => s.classList.toggle('highlight', i === stageIdx));
}

function showPipeline() {
  pipeline.classList.add('visible');
}

function hidePipeline() {
  pipeline.classList.remove('visible');
  pipelineAnnotation.classList.remove('visible');
  const stages = pipeline.querySelectorAll('.pipe-stage');
  stages.forEach(s => s.classList.remove('highlight'));
}

function setPipelineAnnotation(text) {
  pipelineAnnotation.textContent = text;
  pipelineAnnotation.classList.add('visible');
}

// ===== Event Handlers =====
formulaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const value = formulaInput.value.trim();
    if (value === '/clear') {
      clearAllTrails();
      return;
    }
    if (!value) return;
    handleFormula(value);
    ghostText.classList.remove('visible');
    statusLine.classList.remove('visible');
    statusLine.classList.remove('error');
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const value = formulaInput.value.trim();
    if (!value || !corpusLoaded) return;
    const parts = value.split(/\s+/);
    let changed = false;
    for (let i = 0; i < parts.length; i++) {
      const token = parts[i].toLowerCase();
      if (i % 2 !== 0) continue;
      const result = lookupToken(token);
      if (result && result.suggestion) {
        parts[i] = result.suggestion;
        changed = true;
      }
    }
    if (changed) {
      formulaInput.value = parts.join(' ');
      ghostText.classList.remove('visible');
      statusLine.classList.remove('visible');
    }
  }
  if (e.key === 'Escape') {
    hideInfoCard();
    hideObservatory();
    statusLine.classList.remove('visible');
    statusLine.classList.remove('error');
    formulaInput.blur();
  }
});

formulaInput.addEventListener('input', () => {
  const value = formulaInput.value.trim();
  if (value.length > 0) {
    ghostText.classList.remove('visible');
    if (!corpusLoaded) return;
    const parts = value.split(/\s+/);
    let suggestions = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 !== 0) continue;
      const token = parts[i].toLowerCase();
      if (token.length < 2) continue;
      const result = lookupToken(token);
      if (result && !result.exact && result.suggestion) {
        suggestions.push(`"${token}" → ${result.suggestion}`);
      }
    }
    if (suggestions.length > 0) {
      statusLine.textContent = 'did you mean: ' + suggestions.join(', ') + ' (tab to accept)';
      statusLine.classList.add('visible');
      statusLine.classList.remove('error');
    } else {
      statusLine.classList.remove('visible');
    }
  } else {
    ghostText.classList.add('visible');
    statusLine.classList.remove('visible');
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (infoCardVisible && !infoCard.contains(e.target)) {
    hideInfoCard();
    return;
  }
  if (!corpusLoaded) return;
  const result = getWorldPointAtScreen(e.clientX, e.clientY);
  if (!result) { hideInfoCard(); return; }
  const hit = result.find(h => h.idx >= 0 && h.idx < corpusItems.length);
  if (!hit) { hideInfoCard(); return; }
  showInfoCard(hit.point, corpusItems[hit.idx], hit.idx, e.clientX, e.clientY);
});

function restoreHoverColor() {
  if (hoveredIdx < 0 || !savedHoverColor || !corpusColors) return;
  corpusColors[hoveredIdx * 3] = savedHoverColor[0];
  corpusColors[hoveredIdx * 3 + 1] = savedHoverColor[1];
  corpusColors[hoveredIdx * 3 + 2] = savedHoverColor[2];
  if (corpusGeometry && corpusGeometry.attributes.color) corpusGeometry.attributes.color.needsUpdate = true;
  hideHoverRing();
  hoveredIdx = -1;
  savedHoverColor = null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!corpusLoaded || infoCardVisible || !corpusPoints) {
    if (hoveredIdx >= 0) restoreHoverColor();
    renderer.domElement.style.cursor = '';
    return;
  }
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(corpusPoints);
  if (intersects.length === 0) {
    if (hoveredIdx >= 0) restoreHoverColor();
    renderer.domElement.style.cursor = '';
    return;
  }
  let best = intersects[0];
  for (let i = 1; i < intersects.length; i++) {
    if (intersects[i].distanceToRay < best.distanceToRay) best = intersects[i];
  }
  if (best.index === hoveredIdx) return;

  if (hoveredIdx >= 0) restoreHoverColor();

  hoveredIdx = best.index;
  const i = best.index * 3;
  savedHoverColor = [corpusColors[i], corpusColors[i + 1], corpusColors[i + 2]];
  const factor = 3.5;
  corpusColors[i] = Math.min(1, savedHoverColor[0] * factor);
  corpusColors[i + 1] = Math.min(1, savedHoverColor[1] * factor);
  corpusColors[i + 2] = Math.min(1, savedHoverColor[2] * factor);
  if (corpusGeometry && corpusGeometry.attributes.color) corpusGeometry.attributes.color.needsUpdate = true;
  renderer.domElement.style.cursor = 'pointer';
  showHoverRing(best.point);
});

helpBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  showObservatory();
});

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearBtn.classList.add('clear-active');
  setTimeout(() => clearBtn.classList.remove('clear-active'), 300);
  clearAllTrails();
});

observatoryOverlay.addEventListener('click', (e) => {
  if (e.target === observatoryOverlay) {
    hideObservatory();
    formulaInput.focus();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (observatoryOverlay.classList.contains('visible')) {
      hideObservatory();
      formulaInput.focus();
    }
    if (infoCardVisible) {
      hideInfoCard();
    }
    statusLine.classList.remove('visible');
    statusLine.classList.remove('error');
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.domElement.addEventListener('pointerdown', () => {
  autoRotateTimer = 0;
  if (!infoCardVisible) resumeAutoRotate();
});

window.addEventListener('popstate', () => {
  const { formula } = parseHashParams(window.location.hash);
  if (formula) {
    formulaInput.value = formula;
    ghostText.classList.remove('visible');
    clearAllTrails();
    handleFormula(formula);
  }
});

// ===== Animation Loop =====
function animate() {
  requestAnimationFrame(animate);

  controls.target.lerp(cameraTarget, cameraLerpSpeed);
  controls.update();

  if (corpusGeometry && corpusGeometry.attributes.color) {
    corpusGeometry.attributes.color.needsUpdate = true;
  }

  const now = Date.now();
  for (const trail of trails) {
    const isLatest = trail === trails[trails.length - 1];
    if (trail.resultGlow && isLatest) {
      const s = 1.4 + Math.sin(now * 0.004) * 0.3;
      trail.resultGlow.scale.set(s, s, 1);
    }
    if (!isLatest && trail.resultGlow) {
      const s = 0.6 + Math.sin(now * 0.003) * 0.15;
      trail.resultGlow.scale.set(s, s, 1);
    }
  }

  for (const trail of trails) {
    for (const line of trail.lines) {
      if (line.material && line.material.opacity !== undefined) {
        line.material.opacity += (0.85 - line.material.opacity) * 0.03;
      }
    }
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += 16;
    const t = r.age / r.maxAge;
    if (t >= 1) {
      spriteGroup.remove(r.sprite);
      r.sprite.material.dispose();
      ripples.splice(i, 1);
    } else {
      const s = 0.15 + t * 0.5;
      r.sprite.scale.set(s, s, 1);
      r.sprite.material.opacity = 0.3 * (1 - t);
    }
  }

  if (autoRotatePaused && !infoCardVisible) {
    autoRotateTimer += 16;
    if (autoRotateTimer > 5000) {
      resumeAutoRotate();
    }
  }

  if (infoCardVisible && infoCardTarget && infoCard.classList.contains('visible')) {
    const vec = infoCardTarget.clone().project(camera);
    const px = Math.max(0, Math.min(window.innerWidth, (vec.x * 0.5 + 0.5) * window.innerWidth));
    const py = Math.max(0, Math.min(window.innerHeight, (-vec.y * 0.5 + 0.5) * window.innerHeight));
    clampCardPosition(px, py);
  }

  if (clickRingSprite) {
    const dist = camera.position.distanceTo(clickRingSprite.position);
    const s = dist * 0.013 + Math.sin(now * 0.005) * 0.02;
    clickRingSprite.scale.set(s, s, 1);
  }

  if (hoverRingSprite) {
    const dist = camera.position.distanceTo(hoverRingSprite.position);
    const s = dist * 0.026 + Math.sin(now * 0.005) * 0.03;
    hoverRingSprite.scale.set(s, s, 1);
  }

  renderer.render(scene, camera);
}

// ===== Init =====
let schemaParsed = false;
async function init() {
  loadFromHash();
  const ok = await loadCorpusMeta();
  if (!ok) return;
  schemaParsed = true;

  const { formula } = parseHashParams(window.location.hash);
  if (formula) {
    await ensureVectorsLoaded();
    handleFormula(formula);
  }

  const { debug } = parseHashParams(window.location.hash);
  if (debug) showObservatory();
}

animate();
formulaInput.focus();
loadingEl.style.display = 'block';
init();
