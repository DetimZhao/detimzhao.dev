import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TOTAL_POINTS = 5000;
const VOLUME_RADIUS = 14;
const ACCENT_COLOR = new THREE.Color('#00d4ff');
const ACCENT_BRIGHT = new THREE.Color('#33eeff');
const ACCENT_DIM = new THREE.Color('#006d78');

const WORD_CLUSTERS = {
  attention: {
    center: [5.5, 2.0, -4.0],
    radius: 2.0,
    neighbors: [
      { word: 'self-attention', sim: 0.94 },
      { word: 'multi-head attention', sim: 0.91 },
      { word: 'positional encoding', sim: 0.82 },
      { word: 'transformer', sim: 0.87 },
      { word: 'QKV', sim: 0.84 },
      { word: 'encoder', sim: 0.79 },
      { word: 'decoder', sim: 0.76 },
      { word: 'feed-forward', sim: 0.72 },
      { word: 'layer norm', sim: 0.70 },
      { word: 'residual', sim: 0.68 },
      { word: 'dropout', sim: 0.65 },
      { word: 'softmax', sim: 0.73 },
      { word: 'embedding', sim: 0.69 },
      { word: 'tokenization', sim: 0.71 },
      { word: 'inference', sim: 0.67 },
      { word: 'fine-tuning', sim: 0.64 },
      { word: 'pretraining', sim: 0.62 },
      { word: 'cross-attention', sim: 0.80 },
      { word: 'masked attention', sim: 0.77 },
      { word: 'scaled dot-product', sim: 0.81 },
    ],
  },
  king: {
    center: [-5.0, 1.5, 3.0],
    radius: 1.6,
    neighbors: [
      { word: 'monarch', sim: 0.88 },
      { word: 'throne', sim: 0.81 },
      { word: 'sovereign', sim: 0.79 },
      { word: 'majesty', sim: 0.74 },
      { word: 'royalty', sim: 0.85 },
      { word: 'emperor', sim: 0.82 },
      { word: 'ruler', sim: 0.77 },
      { word: 'kingdom', sim: 0.72 },
      { word: 'reign', sim: 0.70 },
      { word: 'dynasty', sim: 0.68 },
    ],
  },
  man: {
    center: [-7.2, -0.3, 4.5],
    radius: 1.4,
    neighbors: [
      { word: 'male', sim: 0.92 },
      { word: 'gentleman', sim: 0.84 },
      { word: 'husband', sim: 0.79 },
      { word: 'father', sim: 0.76 },
      { word: 'boy', sim: 0.72 },
      { word: 'brother', sim: 0.74 },
      { word: 'son', sim: 0.71 },
      { word: 'he', sim: 0.68 },
      { word: 'masculine', sim: 0.80 },
      { word: 'sir', sim: 0.75 },
    ],
  },
  woman: {
    center: [-2.8, 0.2, 2.2],
    radius: 1.4,
    neighbors: [
      { word: 'female', sim: 0.92 },
      { word: 'lady', sim: 0.85 },
      { word: 'wife', sim: 0.80 },
      { word: 'mother', sim: 0.77 },
      { word: 'girl', sim: 0.74 },
      { word: 'sister', sim: 0.73 },
      { word: 'daughter', sim: 0.71 },
      { word: 'she', sim: 0.69 },
      { word: 'feminine', sim: 0.82 },
      { word: 'madam', sim: 0.76 },
    ],
  },
  queen: {
    center: [-0.5, 3.0, 5.0],
    radius: 1.2,
    neighbors: [
      { word: 'monarch', sim: 0.94 },
      { word: 'princess', sim: 0.89 },
      { word: 'royal', sim: 0.86 },
      { word: 'crown', sim: 0.83 },
      { word: 'throne', sim: 0.80 },
      { word: 'majesty', sim: 0.78 },
      { word: 'sovereign', sim: 0.76 },
      { word: 'empress', sim: 0.81 },
      { word: 'regent', sim: 0.74 },
      { word: 'dynasty', sim: 0.71 },
    ],
  },
  computer: {
    center: [3.0, -2.5, -2.0],
    radius: 1.6,
    neighbors: [
      { word: 'laptop', sim: 0.90 },
      { word: 'hardware', sim: 0.85 },
      { word: 'software', sim: 0.82 },
      { word: 'processor', sim: 0.79 },
      { word: 'machine', sim: 0.76 },
      { word: 'desktop', sim: 0.73 },
      { word: 'server', sim: 0.70 },
      { word: 'device', sim: 0.74 },
      { word: 'terminal', sim: 0.71 },
      { word: 'computation', sim: 0.68 },
    ],
  },
  language: {
    center: [-3.5, -3.0, -3.5],
    radius: 1.8,
    neighbors: [
      { word: 'speech', sim: 0.88 },
      { word: 'syntax', sim: 0.84 },
      { word: 'grammar', sim: 0.82 },
      { word: 'semantics', sim: 0.86 },
      { word: 'translation', sim: 0.79 },
      { word: 'linguistics', sim: 0.81 },
      { word: 'dialect', sim: 0.74 },
      { word: 'phonetics', sim: 0.72 },
      { word: 'lexicon', sim: 0.77 },
      { word: 'morphology', sim: 0.70 },
    ],
  },
  neural: {
    center: [1.0, -1.0, -6.0],
    radius: 1.5,
    neighbors: [
      { word: 'network', sim: 0.90 },
      { word: 'deep learning', sim: 0.87 },
      { word: 'gradient', sim: 0.82 },
      { word: 'backprop', sim: 0.79 },
      { word: 'weights', sim: 0.76 },
      { word: 'activation', sim: 0.73 },
      { word: 'perceptron', sim: 0.71 },
      { word: 'convolution', sim: 0.70 },
      { word: 'recurrent', sim: 0.68 },
      { word: 'dropout', sim: 0.66 },
    ],
  },
};

const RAY_POINTS = {};
const BG_POINT_INDICES = [];

function setupRayPoints() {
  let idx = 0;
  for (const [word, cluster] of Object.entries(WORD_CLUSTERS)) {
    const n = Math.floor(cluster.neighbors.length * 2.5) + 15;
    for (let i = 0; i < n; i++) {
      RAY_POINTS[idx + i] = word;
    }
    idx += n;
  }
  for (let i = idx; i < TOTAL_POINTS; i++) {
    BG_POINT_INDICES.push(i);
  }
}

setupRayPoints();

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

const positions = new Float32Array(TOTAL_POINTS * 3);
const colors = new Float32Array(TOTAL_POINTS * 3);

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

function randomNear(center, radius) {
  const [cx, cy, cz] = center;
  const [dx, dy, dz] = randomInSphere(radius);
  return [cx + dx, cy + dy, cz + dz];
}

const BASE_COLORS = new Float32Array(TOTAL_POINTS * 3);

let pi = 0;
for (const [, cluster] of Object.entries(WORD_CLUSTERS)) {
  const nPoints = Math.floor(cluster.neighbors.length * 2.5) + 15;
  for (let i = 0; i < nPoints; i++) {
    const [x, y, z] = randomNear(cluster.center, cluster.radius);
    positions[pi * 3] = x;
    positions[pi * 3 + 1] = y;
    positions[pi * 3 + 2] = z;
    const b = 0.04 + Math.random() * 0.10;
    colors[pi * 3] = b;
    colors[pi * 3 + 1] = b;
    colors[pi * 3 + 2] = b;
    BASE_COLORS[pi * 3] = b;
    BASE_COLORS[pi * 3 + 1] = b;
    BASE_COLORS[pi * 3 + 2] = b;
    pi++;
  }
}

for (let i = pi; i < TOTAL_POINTS; i++) {
  const [x, y, z] = randomInSphere(VOLUME_RADIUS);
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;
  const b = 0.015 + Math.random() * 0.035;
  colors[i * 3] = b;
  colors[i * 3 + 1] = b;
  colors[i * 3 + 2] = b;
  BASE_COLORS[i * 3] = b;
  BASE_COLORS[i * 3 + 1] = b;
  BASE_COLORS[i * 3 + 2] = b;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

const pointTexture = createCircleTexture();

const pointMaterial = new THREE.PointsMaterial({
  size: 0.22,
  map: pointTexture,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
  transparent: true,
});

const pointCloud = new THREE.Points(geometry, pointMaterial);
scene.add(pointCloud);

const lineGroup = new THREE.Group();
scene.add(lineGroup);

const spriteGroup = new THREE.Group();
scene.add(spriteGroup);

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

const glowTexture = createGlowTexture('rgba(0,229,255,0.7)', 'rgba(0,229,255,0)', 128);
const glowTextureBright = createGlowTexture('rgba(0,255,255,0.9)', 'rgba(0,229,255,0)', 128);
const glowSpriteMaterial = new THREE.SpriteMaterial({
  map: glowTexture,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  transparent: true,
});

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

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 2.0;
const mouse = new THREE.Vector2();

let cameraTarget = new THREE.Vector3(0, 0, 0);
let cameraLerpSpeed = 0.03;

const infoCard = document.getElementById('info-card');
const infoCardWord = document.getElementById('info-card-word');
const infoCardList = document.getElementById('info-card-list');
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

let infoCardTarget = null;
let infoCardVisible = false;

let ripples = [];
let autoRotatePaused = false;
let autoRotateTimer = 0;

function createRingTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(0,212,255,0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 16, 0, Math.PI * 2);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

let clickRingSprite = null;

function spawnClickRing(position) {
  removeClickRing();
  const mat = new THREE.SpriteMaterial({
    map: createRingTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
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

function spawnRipple(position) {
  const mat = new THREE.SpriteMaterial({
    map: glowTextureBright,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity: 0.3,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(0.15, 0.15, 1);
  spriteGroup.add(sprite);
  ripples.push({ sprite, age: 0, maxAge: 600 });
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

const MAX_TRAILS = 10;
let trails = [];
let lastFormula = null;
let lastFormulaTokens = [];
let lastFormulaOps = [];
let lastFormulaResultWord = null;

function createTrailObject(formula, resultWord) {
  return {
    id: Date.now(),
    formula,
    resultWord,
    glowSprites: [],
    labelSprites: [],
    lines: [],
    highlightedIndices: new Set(),
    resultGlow: null,
    resultLabel: null,
    resultPoint: null,
    opacity: 1.0,
    sourceClusters: [],
  };
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
    removed.glowSprites.forEach(s => spriteGroup.remove(s));
    removed.labelSprites.forEach(s => spriteGroup.remove(s));
    removed.lines.forEach(l => lineGroup.remove(l));
    if (removed.resultGlow) spriteGroup.remove(removed.resultGlow);
    if (removed.resultLabel) spriteGroup.remove(removed.resultLabel);
    for (const idx of removed.highlightedIndices) {
      colors[idx * 3] = BASE_COLORS[idx * 3];
      colors[idx * 3 + 1] = BASE_COLORS[idx * 3 + 1];
      colors[idx * 3 + 2] = BASE_COLORS[idx * 3 + 2];
    }
  }
}

function clearAllTrails() {
  removeClickRing();
  hideInfoCard();
  for (const trail of trails) {
    trail.glowSprites.forEach(s => spriteGroup.remove(s));
    trail.labelSprites.forEach(s => spriteGroup.remove(s));
    trail.lines.forEach(l => lineGroup.remove(l));
    if (trail.resultGlow) spriteGroup.remove(trail.resultGlow);
    if (trail.resultLabel) spriteGroup.remove(trail.resultLabel);
    for (const idx of trail.highlightedIndices) {
      colors[idx * 3] = BASE_COLORS[idx * 3];
      colors[idx * 3 + 1] = BASE_COLORS[idx * 3 + 1];
      colors[idx * 3 + 2] = BASE_COLORS[idx * 3 + 2];
    }
  }
  trails = [];
  lastFormula = null;
  lastFormulaTokens = [];
  lastFormulaOps = [];
  lastFormulaResultWord = null;
  updateTrailCount();
  updateURLHash('');
  inputContainer.classList.remove('active');
  hidePipeline();
  formulaInput.value = '';
  ghostText.classList.add('visible');
}

function updateTrailCount() {
  if (trails.length === 0) {
    trailCount.classList.remove('visible');
  } else {
    trailCount.textContent = `${trails.length} trail${trails.length !== 1 ? 's' : ''}`;
    trailCount.classList.add('visible');
  }
}

function addGlowAt(position, bright, trail) {
  const mat = bright
    ? new THREE.SpriteMaterial({
        map: glowTextureBright,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        opacity: 0.6,
      })
    : glowSpriteMaterial.clone();
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(bright ? 1.2 : 0.7, bright ? 1.2 : 0.7, 1);
  spriteGroup.add(sprite);
  trail.glowSprites.push(sprite);
  return sprite;
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

function addConnectorBetween(a, b, trail) {
  const dir = new THREE.Vector3().copy(b).sub(a);
  const len = dir.length();
  const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
  const geom = new THREE.CylinderGeometry(0.01, 0.015, len, 6, 1);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
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
    opacity: 0.9,
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

function getClusterPointPositions(clusterKey) {
  const cluster = WORD_CLUSTERS[clusterKey];
  const pts = [];
  const center = new THREE.Vector3(...cluster.center);
  pts.push({ pos: center, word: clusterKey, isCenter: true });
  for (let idx in RAY_POINTS) {
    if (RAY_POINTS[idx] === clusterKey) {
      const i = parseInt(idx);
      if (!pts.find(p => p.pos.distanceTo(new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])) < 0.01)) {
        pts.push({ pos: new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]), word: null, isCenter: false });
      }
    }
  }
  return pts;
}

function brightenCluster(clusterKey, maxNeighbors, trail) {
  const cluster = WORD_CLUSTERS[clusterKey];
  if (!cluster) return;
  const nDisplay = Math.min(maxNeighbors || cluster.neighbors.length, cluster.neighbors.length);

  for (let idx in RAY_POINTS) {
    if (RAY_POINTS[idx] === clusterKey) {
      const i = parseInt(idx);
      trail.highlightedIndices.add(i);
    }
  }

  const sortedPts = [];
  for (let idx in RAY_POINTS) {
    if (RAY_POINTS[idx] === clusterKey) {
      const i = parseInt(idx);
      const pos = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const dist = pos.distanceTo(new THREE.Vector3(...cluster.center));
      sortedPts.push({ idx: i, pos, dist });
    }
  }
  sortedPts.sort((a, b) => a.dist - b.dist);

  for (let i = 0; i < sortedPts.length; i++) {
    const { idx } = sortedPts[i];
    const t = 1 - (i / sortedPts.length);
    const bright = t > 0.85;
    const c = bright ? ACCENT_BRIGHT : ACCENT_COLOR.clone().multiplyScalar(0.4 + t * 0.6);
    colors[idx * 3] = c.r;
    colors[idx * 3 + 1] = c.g;
    colors[idx * 3 + 2] = c.b;

    if (i < nDisplay + 1 && i > 0 && sortedPts[i].dist > 0.02) {
      const centerPos = new THREE.Vector3(...cluster.center);
      addConnectorBetween(centerPos, sortedPts[i].pos, trail);
    }
  }

  const centerPos = new THREE.Vector3(...cluster.center);
  addGlowAt(centerPos, true, trail);

  const nHalo = Math.min(8, sortedPts.length);
  for (let i = 0; i < nHalo; i++) {
    const { pos } = sortedPts[i];
    if (pos.distanceTo(centerPos) < 0.01) continue;
    const haloMat = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
      opacity: 0.12 + (1 - i / nHalo) * 0.18,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(pos);
    halo.scale.set(0.45, 0.45, 1);
    spriteGroup.add(halo);
    trail.glowSprites.push(halo);
  }

  for (let i = 0; i < Math.min(nDisplay, 5); i++) {
    const neighbor = cluster.neighbors[i];
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * cluster.radius * 1.5,
      (Math.random() - 0.5) * cluster.radius * 1.5,
      (Math.random() - 0.5) * cluster.radius * 1.5,
    );
    const labelPos = centerPos.clone().add(dir).add(new THREE.Vector3(0, 0.3, 0));
    addLabelAt(labelPos, neighbor.word, 0.8, trail);
  }

  cameraTarget.copy(centerPos);
  cameraLerpSpeed = 0.03;
}

function handleFormula(formula) {
  const parts = formula.toLowerCase().trim().split(/\s+/);

  if (parts.length === 1) {
    const word = parts[0];
    const clusterKey = Object.keys(WORD_CLUSTERS).find(k => k.toLowerCase() === word);
    if (clusterKey) {
      const trail = createTrailObject(formula, clusterKey);
      brightenCluster(clusterKey, 20, trail);
      trail.sourceClusters.push(clusterKey);
      trails.push(trail);
      evictTrails();
      dimAllTrails();
      lastFormula = formula;
      lastFormulaTokens = [clusterKey];
      lastFormulaOps = [];
      lastFormulaResultWord = clusterKey;
      inputContainer.classList.add('active');
      updateURLHash(formula);
      showPipeline();
      setPipelineStage(3);
      setPipelineAnnotation(`single-word lookup — nearest neighbors by cosine similarity`);
      return;
    }
    inputContainer.classList.remove('active');
    hidePipeline();
    return;
  }

  if (parts.length >= 3) {
    const op1 = parts[0];
    const op = parts[1];
    const op2 = parts[2];

    if (op === '-' || op === '+') {
      const c1 = Object.keys(WORD_CLUSTERS).find(k => k.toLowerCase() === op1);
      const c2 = Object.keys(WORD_CLUSTERS).find(k => k.toLowerCase() === op2);

      const trail = createTrailObject(formula, null);

      if (c1) {
        brightenCluster(c1, 3, trail);
        trail.sourceClusters.push(c1);
      }
      if (c2) {
        brightenCluster(c2, 3, trail);
        trail.sourceClusters.push(c2);
      }

      if (c1 && c2) {
        const pos1 = new THREE.Vector3(...WORD_CLUSTERS[c1].center);
        const pos2 = new THREE.Vector3(...WORD_CLUSTERS[c2].center);

        const mid = pos1.clone().add(pos2).multiplyScalar(0.5);

        addConnectorBetween(pos1, pos2, trail);

        if (parts.length >= 5) {
          const op3 = parts[3];
          const op4 = parts[4];
          const c3 = Object.keys(WORD_CLUSTERS).find(k => k.toLowerCase() === op4);
          if (c3) {
            brightenCluster(c3, 3, trail);
            trail.sourceClusters.push(c3);
            const pos3 = new THREE.Vector3(...WORD_CLUSTERS[c3].center);
            addConnectorBetween(mid, pos3, trail);

            const resultOffset = pos1.clone().sub(pos2).add(pos3);
            trail.resultPoint = resultOffset;
            trail.resultWord = c3;

            const resultMat = new THREE.SpriteMaterial({
              map: glowTextureBright,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: true,
              transparent: true,
              opacity: 0.7,
            });
            trail.resultGlow = new THREE.Sprite(resultMat);
            trail.resultGlow.position.copy(resultOffset);
            trail.resultGlow.scale.set(1.6, 1.6, 1);
            spriteGroup.add(trail.resultGlow);

            const queenCluster = WORD_CLUSTERS['queen'];
            if (queenCluster) {
              const qCenter = new THREE.Vector3(...queenCluster.center);
              cameraTarget.copy(qCenter);
              cameraLerpSpeed = 0.025;

              for (let i = 0; i < Math.min(queenCluster.neighbors.length, 10); i++) {
                const n = queenCluster.neighbors[i];
                const dirOff = new THREE.Vector3(
                  (Math.random() - 0.5) * 2.5,
                  (Math.random() - 0.5) * 2.5,
                  (Math.random() - 0.5) * 2.5,
                );
                const labelPos = qCenter.clone().add(dirOff);
                addLabelAt(labelPos, n.word, 0.8, trail);
              }

              trail.resultLabel = addLabelAt(qCenter.clone().add(new THREE.Vector3(0, 0.5, 0)), 'queen', 0.95, trail);
              trail.resultWord = 'queen';
            }

            lastFormulaTokens = [c1, c2, c3];
            lastFormulaOps = [op, op3];
            lastFormulaResultWord = 'queen';
          }
        } else {
          lastFormulaTokens = [c1, c2];
          lastFormulaOps = [op];
          lastFormulaResultWord = null;
        }

        trails.push(trail);
        evictTrails();
        dimAllTrails();
        lastFormula = formula;
        inputContainer.classList.add('active');
        updateURLHash(formula);
        showPipeline();
        if (lastFormulaResultWord) {
          setPipelineStage(3);
          const opStr = lastFormulaTokens.length >= 3
            ? `${lastFormulaTokens[0]} ${lastFormulaOps[0]} ${lastFormulaTokens[1]} ${lastFormulaOps[1] || '+'} ${lastFormulaTokens[2]}`
            : `${lastFormulaTokens.join(` ${lastFormulaOps[0]} `)}`;
          setPipelineAnnotation(`vector arithmetic: ${opStr} = ${lastFormulaResultWord} — top-10 neighbors`);
        } else {
          setPipelineStage(1);
          setPipelineAnnotation(`vector arithmetic: ${lastFormulaTokens.join(` ${op} `)}`);
        }
        return;
      }

      trails.push(trail);
      evictTrails();
      dimAllTrails();
      return;
    }
  }

  inputContainer.classList.remove('active');
}

function getWorldPointAtScreen(x, y) {
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(pointCloud);
  if (intersects.length > 0) {
    return intersects.map(hit => ({ point: hit.point.clone(), idx: hit.index }));
  }
  return null;
}

function showInfoCard(worldPos, word) {
  const vec = worldPos.clone().project(camera);
  const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

  infoCard.style.left = `${x}px`;
  infoCard.style.top = `${y}px`;
  infoCardWord.textContent = word;

  const cluster = WORD_CLUSTERS[word];
  infoCardList.innerHTML = '';
  if (cluster) {
    const top5 = cluster.neighbors.slice(0, 5);
    top5.forEach(n => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="label">${n.word}</span><span class="score">${n.sim.toFixed(3)}</span>`;
      infoCardList.appendChild(li);
    });
  }

  infoCard.classList.remove('visible');
  void infoCard.offsetWidth;
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
}

function updateURLHash(formula) {
  const encoded = formula ? formula.replace(/\s+/g, '+') : '';
  const hash = encoded ? `#${encoded}` : '';
  const url = window.location.pathname + hash;
  history.pushState(null, '', url);
}

function loadFromHash() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const decoded = decodeURIComponent(hash).replace(/\+/g, ' ');
    formulaInput.value = decoded;
    ghostText.classList.remove('visible');
    setTimeout(() => handleFormula(decoded), 300);
  }
}

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
    const steps = [];
    steps.push({
      num: 1,
      label: 'tokenize',
      detail: lastFormulaTokens.join(' '),
      highlight: true,
    });
    steps.push({
      num: 2,
      label: 'embed (384-dim)',
      detail: lastFormulaTokens.map(t => `${t} → vector`).join('\n'),
      highlight: true,
    });
    steps.push({
      num: 3,
      label: 'arithmetic',
      detail: lastFormula || '',
      highlight: lastFormulaOps.length > 0,
    });
    steps.push({
      num: 4,
      label: 'PCA-3 projection',
      detail: 'project 384d → 3D point cloud position',
      highlight: true,
    });
    steps.push({
      num: 5,
      label: 'result',
      detail: lastFormulaResultWord
        ? `${lastFormulaResultWord} + top-10 neighbors`
        : 'nearest neighbor search',
      highlight: !!lastFormulaResultWord,
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
        model: sentence-transformers/all-MiniLM-L6-v2<br>
        corpus: ~3,000 AI/ML concepts<br>
        projection: PCA (3 components)<br>
        variance explained: ~14%
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

formulaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const value = formulaInput.value.trim();
    if (value === '/clear') {
      clearAllTrails();
      return;
    }
    if (value) {
      clearAllTrails();
      handleFormula(value);
      ghostText.classList.remove('visible');
      statusLine.classList.remove('visible');
    }
  }
  if (e.key === 'Escape') {
    hideInfoCard();
    hideObservatory();
    formulaInput.blur();
  }
});

formulaInput.addEventListener('input', () => {
  if (formulaInput.value.length > 0) {
    ghostText.classList.remove('visible');
  } else {
    ghostText.classList.add('visible');
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (infoCardVisible && !infoCard.contains(e.target)) {
    hideInfoCard();
    return;
  }

  const result = getWorldPointAtScreen(e.clientX, e.clientY);
  if (!result) { hideInfoCard(); return; }
  let word = null;
  for (const hit of result) {
    const w = RAY_POINTS[hit.idx];
    if (w) { word = w; break; }
  }
  if (!word) { hideInfoCard(); return; }
  showInfoCard(result[0].point, word);
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
  const hash = window.location.hash.slice(1);
  if (hash) {
    const decoded = decodeURIComponent(hash).replace(/\+/g, ' ');
    formulaInput.value = decoded;
    ghostText.classList.remove('visible');
    clearAllTrails();
    handleFormula(decoded);
  }
});

loadingEl.style.display = 'none';

function animate() {
  requestAnimationFrame(animate);

  controls.target.lerp(cameraTarget, cameraLerpSpeed);
  controls.update();

  geometry.attributes.color.needsUpdate = true;

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

  const dt = now;
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
    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
    infoCard.style.left = `${x}px`;
    infoCard.style.top = `${y}px`;
  }

  if (clickRingSprite) {
    const dist = camera.position.distanceTo(clickRingSprite.position);
    const s = dist * 0.013 + Math.sin(now * 0.005) * 0.02;
    clickRingSprite.scale.set(s, s, 1);
  }

  renderer.render(scene, camera);
}

animate();

formulaInput.focus();
loadFromHash();
