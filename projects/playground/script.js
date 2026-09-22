import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ================= Config ================= */
const VERSION = 'v8.0.1';   // see VERSIONING.md — single source of truth for the statusbar label
const MAX_TRAILS = 10;
const MIN_POINTS = 5000;
const VOLUME_RADIUS = 14;
const DIM = 384;
const HEATMAP_BINS = 32;
const BIN_SIZE = DIM / HEATMAP_BINS;

/* ================= DOM ================= */
const root = document.documentElement;
const stage = document.getElementById('stage');
const tip = document.getElementById('tip'), tipDot = document.getElementById('tip-dot'), tipText = document.getElementById('tip-text');
const eq = document.getElementById('eq'), eqSend = document.getElementById('eq-send');
const clearBtn = document.getElementById('clear-btn');
const sbFormula = document.getElementById('sb-formula');
const sbNodes = document.getElementById('sb-nodes'), sbDim = document.getElementById('sb-dim');
const mNodes = document.getElementById('m-nodes'), mDim = document.getElementById('m-dim'), cseCount = document.getElementById('cse-count');
const leftpanel = document.getElementById('leftpanel'), lpCol = document.getElementById('lp-collapse'), lpHead = leftpanel.querySelector('.lp-head');
const lpList = document.getElementById('lp-list'), lpAll = document.getElementById('lp-all'), lpAllChk = document.getElementById('lp-all-chk'), lpFoot = document.getElementById('lp-foot');
const lpPoint = document.getElementById('lp-point'), lpPointBack = document.getElementById('lp-point-back');
const lpName = document.getElementById('lp-point-name'), lpDesc = document.getElementById('lp-point-desc'), lpNb = document.getElementById('lp-point-nb'), lpSrc = document.getElementById('lp-point-source'), lpFootEl = document.getElementById('lp-point-foot');
const mpoint = document.getElementById('mpoint'), mpointBack = document.getElementById('mpoint-back');
const mName = document.getElementById('mpoint-name'), mDesc = document.getElementById('mpoint-desc'), mNb = document.getElementById('mpoint-nb'), mSrc = document.getElementById('mpoint-source');
const detail = document.getElementById('detail'), obsBody = document.getElementById('obs-body');
const dbg = document.getElementById('dbg'), dbgBtn = document.getElementById('dbg-btn'), dbgClose = document.getElementById('dbg-close'), dbg2 = document.getElementById('dbg2'), dbg2Close = document.getElementById('dbg2-close');
document.getElementById('ver').textContent = VERSION;   // single source of truth (see VERSIONING.md)

/* ================= Corpus state ================= */
let corpusItems = null, corpusVectors = null, corpusPCA = null, corpusModel = null, nameToIdx = null;
let corpusLoaded = false, vectorsLoaded = false, vectorsHashMismatch = false;
let lastFormula = null, lastTokens = [], lastOps = [], lastResultName = null, lastResultVec = null, lastResultNeighbors = [];

/* Sources (derive from corpus; counts filled after load) */
const SRC_HUES = { huggingface: 205, wikipedia: 45, pytorch: 15, sklearn: 130, terminology: 270, 'ml-terminology': 310 };
let SOURCES = []; // {name, count, hue}
let onState = {};          // per-source on/off
let catOf = [];            // per-point source name (null = filler)
let baseColors = null;
let corpusPoints = null, corpusGeometry = null, corpusColors = null, corpusCount = 0;

/* ================= Theme ================= */
function isLight(){ const c = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); return c === 'light'; }
function paintTheme(){ document.getElementById('theme-ico').textContent = isLight() ? '☾' : '☀'; }
function themeToggle(){ root.dataset.theme = isLight() ? 'dark' : 'light'; paintTheme(); applySceneBg(); applyTrailTheme(); recolor(); applyFloor(); }
document.getElementById('theme-btn').addEventListener('click', themeToggle);
paintTheme();

/* ================= Scene ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const W = () => stage.clientWidth, H = () => stage.clientHeight;
renderer.setSize(W(), H());
stage.appendChild(renderer.domElement); renderer.domElement.id = 'canvas';
const scene = new THREE.Scene();
const clearLight = new THREE.Color('#d1d1d1'), clearDark = new THREE.Color('#05070c');
function applySceneBg(){ const c = isLight() ? clearLight : clearDark; renderer.setClearColor(c, 1); scene.background = c; }
applySceneBg();
const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.5, 150);
camera.position.set(0, 1, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.autoRotate = true; controls.autoRotateSpeed = 0.22;
controls.minDistance = 7; controls.maxDistance = 52; controls.target.set(0, 0, 0);

const lineGroup = new THREE.Group(); scene.add(lineGroup);
const spriteGroup = new THREE.Group(); scene.add(spriteGroup);
const cloud = new THREE.Group(); scene.add(cloud);

function centerStage(){
  const win = document.querySelector('.window').getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  const winC = win.left + win.width / 2, stC = st.left + st.width / 2;
  const px = Math.round(stC - winC);
  root.style.setProperty('--xc', px + 'px');
  camera.clearViewOffset();
  if (px > 0) camera.setViewOffset(st.width + 2 * px, st.height, 2 * px, 0, st.width, st.height);
  else if (px < 0) camera.setViewOffset(st.width - 2 * px, st.height, 0, 0, st.width, st.height);
  camera.updateProjectionMatrix();
}

/* ================= Textures (trail aides) ================= */
function createCircleTexture(){ const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32,32,0,32,32,26); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.25,'rgba(255,255,255,0.95)'); gr.addColorStop(0.6,'rgba(255,255,255,0.4)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); }
function createGlowTexture(inner, outer, size){ const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.redraw = (inner2, outer2) => { g.clearRect(0,0,size,size);
    const gr = g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2); gr.addColorStop(0,inner2); gr.addColorStop(0.3,inner2); gr.addColorStop(0.7,outer2); gr.addColorStop(1,'transparent');
    g.fillStyle = gr; g.fillRect(0,0,size,size); tex.needsUpdate = true; };
  tex.redraw(inner, outer); return tex; }
function createRingTexture(){ const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.strokeStyle = trailTheme().ring; g.lineWidth = 2; g.beginPath(); g.arc(128,128,104,0,Math.PI*2); g.stroke(); return new THREE.CanvasTexture(c); }
function createLabelTexture(text, opacity, rgb){ const ls = Math.max(1, trailTheme().labelScale||1);
  const cw = Math.round(256*ls), ch = Math.round(64*ls);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  g.clearRect(0,0,cw,ch); g.font = '500 ' + Math.round(20*ls) + 'px "JetBrains Mono",monospace';
  g.fillStyle = 'rgba(' + (rgb || '0,229,255') + ',' + Math.max(trailTheme().labelAlpha, opacity||0.8) + ')';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw/2, ch/2);
  const t = new THREE.CanvasTexture(c); t.format = THREE.RGBAFormat; t.needsUpdate = true; return t; }
/* Trail/connector color scheme, theme-aware (dark chip minted for dark; light chip for the light #d1d1d1 canvas).
   The "white lines + sky-blue neon" read on near-black but vanish on the light canvas, partly because the glows
   use AdditiveBlending (which can only ADD light — untraceable on a bright bg) and the white lines match the paper. */
const THEME_TRAIL = {
  dark : { line:0xffffff, add:true, labelScale:2.5, labelAlpha:0.85, labelOp:0.85, glowIn:'rgba(0,229,255,0.7)', glowOut:'rgba(0,229,255,0)', glowInB:'rgba(0,255,255,0.9)', glowOutB:'rgba(0,229,255,0)', ring:'rgba(0,212,255,0.4)', labelFill:'0,229,255', burstIn:'rgba(10,255,255,0.9)', burstOut:'rgba(10,229,255,0)' },
  light: { line:0x243447, add:false, labelScale:2.5, labelAlpha:1.0, labelOp:1.0, glowIn:'rgba(0,94,160,0.55)', glowOut:'rgba(0,94,160,0)', glowInB:'rgba(0,80,140,0.85)', glowOutB:'rgba(0,104,178,0)', ring:'rgba(0,96,165,0.6)', labelFill:'18,24,32', burstIn:'rgba(0,80,140,0.9)', burstOut:'rgba(0,104,178,0)' }
};
function trailTheme(){ return isLight() ? THEME_TRAIL.light : THEME_TRAIL.dark; }
let glowTex = createGlowTexture(trailTheme().glowIn, trailTheme().glowOut, 128);
let glowBright = createGlowTexture(trailTheme().glowInB, trailTheme().glowOutB, 128);
/* Recolor already-built trails + ripples in place when the theme flips. */
function applyTrailTheme(){
  const tt = trailTheme();
  glowTex.redraw(tt.glowIn, tt.glowOut);          // textures are shared by every source/result glow sprite
  glowBright.redraw(tt.glowInB, tt.glowOutB);
  const blend = tt.add ? THREE.AdditiveBlending : THREE.NormalBlending;
  const setSprite = s => { if (s && s.material){ s.material.blending = blend; s.material.needsUpdate = true; } };
  const setLine   = m => { if (m && m.material && m.material.color){ m.material.color.setHex(tt.line); m.material.needsUpdate = true; } };
  for (const t of trails){
    t.lines.forEach(setLine);
    t.glowSprites.forEach(setSprite);
    t.labelSprites.forEach(s => { if (s && s.material){ s.material.map = createLabelTexture(s.userData.__text || '', s.userData.__op || 0.8, tt.labelFill); s.material.opacity = (t.opacity||1) * tt.labelOp; s.material.needsUpdate = true; s.scale.set(3.5*tt.labelScale, 0.875*tt.labelScale, 1); } });
    if (t.resultGlow) setSprite(t.resultGlow);
  }
  ripples.forEach(r => { if (r.ring && r.ring.material){ r.ring.material.blending = blend; r.ring.material.needsUpdate = true; } if (r.gl && r.gl.material){ r.gl.material.blending = blend; r.gl.material.needsUpdate = true; } });
}

/* ================= Point cloud shader (theme/settings aware) ================= */
const vert = `attribute float pointSize;uniform float uSize;varying vec3 vColor;varying float vDist;
void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);vDist=length(mv.xyz);gl_PointSize=pointSize*uSize*(130.0/-mv.z);gl_Position=projectionMatrix*mv;}`;
const frag = `varying vec3 vColor;varying float vDist;
uniform float uBright;uniform float uGlow;uniform float uFloor;uniform float uPerf;
void main(){float dd=distance(gl_PointCoord,vec2(0.5));
float core=exp(-dd*dd*40.0);float halo=smoothstep(0.5,0.08,dd);float depth=smoothstep(80.0,16.0,vDist);
float a=(core+halo*uGlow)*depth*uBright;vec3 c=max(vColor,vec3(uFloor));
if(uPerf>0.5){float ddd=distance(gl_PointCoord,vec2(0.5));if(ddd>0.5)discard;a=1.0;c=vColor;}
gl_FragColor=vec4(c,a);}`;

let cloudMat = null, cloudGeo = null, points = null, cloudSizes = null;
let hoveredIdx = -1, savedHoverColor = null, clickRingSprite = null, hoverRingSprite = null, hoverLabelSprite = null;

function randomInSphere(radius){
  const u = Math.random(), v = Math.random(), th = 2*Math.PI*u, ph = Math.acos(2*v-1), r = radius*Math.cbrt(Math.random());
  return [r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph)];
}
function hexToRgb(hex){ const n = parseInt(hex.slice(1),16); return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]; }
function hueColor(hue, sat, light){ return new THREE.Color('hsl(' + hue + ',' + sat + '%,' + light + '%)'); }

function buildPointCloud(){
  const N = corpusItems.length;
  corpusCount = N;
  const filler = Math.max(0, MIN_POINTS - N);
  const total = N + filler;
  const positions = new Float32Array(total*3);
  const colors = new Float32Array(total*3);
  const sizes = new Float32Array(total);
  catOf = new Array(total).fill(null);
  for (let i=0;i<N;i++){
    const p = corpusItems[i].pos;
    positions[i*3]=p[0]; positions[i*3+1]=p[1]; positions[i*3+2]=p[2];
    catOf[i] = corpusItems[i].source || 'terminology';
    sizes[i] = 1.15 + Math.random()*0.9;
  }
  for (let f=0;f<filler;f++){
    const [x,y,z] = randomInSphere(VOLUME_RADIUS);
    const p = N+f;
    positions[p*3]=x; positions[p*3+1]=y; positions[p*3+2]=z;
    sizes[p] = 0.7 + Math.random()*0.9;
  }
  cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  cloudGeo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  cloudGeo.setAttribute('pointSize', new THREE.BufferAttribute(sizes,1));
  cloudMat = new THREE.ShaderMaterial({
    uniforms: { uSize:{value:1.60}, uBright:{value:1.50}, uGlow:{value:1.25}, uFloor:{value:0}, uPerf:{value:0} },
    vertexShader: vert, fragmentShader: frag, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending });
  points = new THREE.Points(cloudGeo, cloudMat);
  points.frustumCulled = false;
  cloud.add(points);
  corpusPoints = points;
  baseColors = new Float32Array(total*3);
  recolor();
}

function pushColors(){ if (cloudGeo) { cloudGeo.attributes.color.array = baseColors.slice(); cloudGeo.attributes.color.needsUpdate = true; } }

function recolor(){
  if (!baseColors) return;
  for (let i=0;i<corpusCount;i++){
    const src = catOf[i], on = onState[src] !== false;
    const hue = SRC_HUES[src] != null ? SRC_HUES[src] : 190;
    const c3 = on ? hueColor(hue, 84, on ? 55 : 6) : new THREE.Color(0.04,0.05,0.07);
    baseColors[i*3]=c3.r; baseColors[i*3+1]=c3.g; baseColors[i*3+2]=c3.b;
  }
  const fillerCol = isLight() ? new THREE.Color(0.50,0.52,0.55) : new THREE.Color(0.30,0.36,0.50);
  for (let i=corpusCount;i<baseColors.length/3;i++){ baseColors[i*3]=fillerCol.r; baseColors[i*3+1]=fillerCol.g; baseColors[i*3+2]=fillerCol.b; }
  pushColors();
}
function applyFloor(){ cloudMat.uniforms.uFloor.value = isLight() ? 0.22 : 0; }

function setHover(idx){ if (hoveredIdx === idx) return; clearHover(); hoveredIdx = idx; const i = idx*3;
  savedHoverColor = [baseColors[i], baseColors[i+1], baseColors[i+2]];
  baseColors[i]=0.0; baseColors[i+1]=0.85; baseColors[i+2]=1.0; pushColors(); }
function clearHover(){ if (hoveredIdx < 0) return; const i = hoveredIdx*3;
  if (savedHoverColor){ baseColors[i]=savedHoverColor[0]; baseColors[i+1]=savedHoverColor[1]; baseColors[i+2]=savedHoverColor[2]; }
  hoveredIdx = -1; savedHoverColor = null; pushColors(); }

/* ================= Composer / bloom ================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W(),H()), 0.2, 0.5, 0.05);
composer.addPass(bloomPass); composer.addPass(new OutputPass());
let perfMode = false;
const perfCheck = document.getElementById('d-perf');
function applyPerf(){ perfMode = perfCheck.checked; cloudMat.uniforms.uPerf.value = perfMode ? 1 : 0; }
perfCheck.addEventListener('change', applyPerf);

/* ================= Raycast / hover / click aides ================= */
const raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold = 2;
const mouse = new THREE.Vector2();
function worldHits(ev){
  const r = stage.getBoundingClientRect();
  mouse.x = ((ev.clientX - r.left)/r.width)*2-1;
  mouse.y = -((ev.clientY - r.top)/r.height)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const list = raycaster.intersectObject(points);
  return list.sort((a,b)=>a.distanceToRay-b.distanceToRay);
}
function clampScreen(x,y){ const r = stage.getBoundingClientRect();
  const nx = Math.min(Math.max(x, r.left+8), r.right - tip.offsetWidth - 8);
  const ny = Math.min(Math.max(y, r.top+8), r.bottom - tip.offsetHeight - 8); return [nx,ny]; }
function hideTip(){ tip.classList.remove('show'); }
function showHoverLabel(pos){ }

function clickBurst(pos){
  const tt = trailTheme();
  const blend = tt.add ? THREE.AdditiveBlending : THREE.NormalBlending;
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: createRingTexture(), transparent:true, blending:blend, depthWrite:false, depthTest:false, opacity:0.7 }));
  ring.position.copy(pos); ring.scale.set(1,1,1); spriteGroup.add(ring);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(tt.burstIn, tt.burstOut, 128), transparent:true, blending:blend, depthWrite:false, depthTest:false, opacity:0.35 }));
  gl.position.copy(pos); gl.scale.set(0.15,0.15,1); spriteGroup.add(gl);
  ripples.push({ring, gl, age:0, maxAge:900});
}

/* ================= Data loading ================= */
async function loadCorpusMeta(){
  try {
    const res = await fetch(new URL('./data/corpus.json.gz', import.meta.url));
    if (!res.ok) { status('corpus unavailable'); return false; }
    const ds = new DecompressionStream('gzip');
    const text = await new Response(res.body.pipeThrough(ds)).text();
    const data = JSON.parse(text);
    corpusItems = data.items;
    for (const it of corpusItems){
      if (it.nn && it.nn.length && Array.isArray(it.nn[0])) it.nn = it.nn.map(([name,score])=>({name,score}));
    }
    corpusPCA = data.pca; corpusModel = data.model;
    nameToIdx = new Map();
    for (let i=0;i<corpusItems.length;i++) nameToIdx.set(corpusItems[i].name, i);
    corpusLoaded = true;
    buildPointCloud();
    buildSources();
    setMetaTexts();
    applyFloor();
    return true;
  } catch (e) { status('corpus load failed'); console.error(e); return false; }
}
let vectorsPromise = null;
async function loadCorpusVectors(){
  if (vectorsLoaded) return true;
  if (vectorsPromise) return vectorsPromise;
  vectorsPromise = fetch(new URL('./data/corpus.vec.f32', import.meta.url)).then(async res => {
    if (!res.ok) { vectorsPromise = null; status('vector data unavailable'); return false; }
    const buf = await res.arrayBuffer();
    corpusVectors = new Float32Array(buf);
    vectorsLoaded = true;
    if (corpusModel && corpusModel.vec_sha256){
      const hb = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(hb)).map(b=>b.toString(16).padStart(2,'0')).join('');
      if (hex !== corpusModel.vec_sha256){ vectorsHashMismatch = true; console.warn('vec hash mismatch'); }
    }
    return true;
  }).catch(()=>{ vectorsPromise = null; status('vector load failed'); return false; });
  return vectorsPromise;
}

function setMetaTexts(){
  const n = corpusItems.length.toLocaleString();
  sbNodes.textContent = n; mNodes.textContent = n; cseCount.textContent = n;
  if (corpusModel) sbDim.textContent = (corpusModel.dim || 384).toString();
  lpFoot.textContent = 'AI/ML · ' + corpusItems.length;
}

/* ================= Left panel: sources ================= */
function buildSources(){
  const counts = {};
  for (const it of corpusItems){ const s = it.source || 'terminology'; counts[s] = (counts[s]||0)+1; }
  SOURCES = Object.keys(counts).map(name => ({ name, count: counts[name], hue: SRC_HUES[name] != null ? SRC_HUES[name] : 190 }));
  SOURCES.sort((a,b)=>b.count-a.count);
  onState = {}; SOURCES.forEach(s => onState[s.name] = true);
  renderLP(); recolor();
}
function renderLP(){
  lpList.innerHTML = '';
  SOURCES.forEach(s => {
    const row = document.createElement('button');
    row.className = 'lp-row' + (onState[s.name] ? ' on' : ' off');
    row.innerHTML = `<span class="dot" style="background:hsl(${s.hue},84%,55%)"></span><span class="nm">${s.name}</span><span class="ct">${s.count}</span>`;
    row.addEventListener('click', () => { onState[s.name] = !onState[s.name]; recolor(); renderLP(); syncAll(); });
    lpList.appendChild(row);
  });
}
function syncAll(){ const allOn = SOURCES.every(s => onState[s.name]); lpAll.classList.toggle('on', allOn); lpAllChk.textContent = allOn ? '✓' : ''; }
lpAll.addEventListener('click', () => { const allOn = SOURCES.every(s => onState[s.name]); SOURCES.forEach(s => onState[s.name] = !allOn); recolor(); renderLP(); syncAll(); });
syncAll();
let lpDots = false;
function toggleLP(force){ lpDots = (force===undefined) ? !lpDots : force; leftpanel.classList.toggle('dots', lpDots); lpCol.textContent = lpDots ? '»' : '«'; lpCol.setAttribute('aria-label', lpDots?'Expand panel':'Collapse panel'); resizeCanvas(); scheduleRecentre(); }
// The left panel animates width over .22s (`transition:width`). resizeCanvas() reads the
// stage bounds synchronously, so it must be re-run AFTER that transition settles — otherwise
// the camera view-offset + `--xc` are computed for the pre-transition layout and the latent
// space never recenters ("doesn't stay center when I open/close").
function scheduleRecentre(){ setTimeout(recentreAfterPanel, 260); }
function recentreAfterPanel(){ resizeCanvas(); }
leftpanel.addEventListener('transitionend', e => { if (e.propertyName === 'width') resizeCanvas(); });
lpCol.addEventListener('click', e => { e.stopPropagation(); toggleLP(); });
let dragStartX = null, dragActive = false;
function onDragDown(e){ if (e.target.closest('button')) return; dragStartX = e.clientX; dragActive = true; lpHead.setPointerCapture(e.pointerId); }
function onDragUp(e){ if (!dragActive){ dragStartX = null; return; } dragActive = false; const dx = e.clientX - dragStartX; dragStartX = null; if (Math.abs(dx) > 40) toggleLP(dx < 0); }
lpHead.addEventListener('pointerdown', onDragDown); lpHead.addEventListener('pointerup', onDragUp); lpHead.addEventListener('pointercancel', ()=>{ dragActive=false; dragStartX=null; });
leftpanel.addEventListener('pointerdown', e => { if (!e.target.closest('.lp-list')) onDragDown(e); }); leftpanel.addEventListener('pointerup', onDragUp); leftpanel.addEventListener('pointercancel', ()=>{ dragActive=false; dragStartX=null; });

/* ================= Point selection / inspection ================= */
function selectPointRaw(it){
  document.getElementById('lp-point').style.display = 'block';
  lpName.innerHTML = `<span class="ppt-dot" style="background:hsl(${SRC_HUES[it.source]||190},84%,55%)"></span>${it.name}`;
  lpDesc.textContent = it.description || '—';
  lpNb.innerHTML = '';
  (it.nn || []).slice(0,6).forEach(n => {
    const li = document.createElement('li'); li.innerHTML = `<span class="n"></span><span class="s"></span>`;
    li.querySelector('.n').textContent = n.name; li.querySelector('.s').textContent = n.score.toFixed(3); lpNb.appendChild(li);
  });
  lpSrc.textContent = it.source ? 'source: ' + it.source : '';
  lpFootEl.textContent = it.source ? it.source.toUpperCase() + ' · ' + (it.nn ? it.nn.length : 0) + ' neighbors' : '';
  // hide list to show the point card
  lpAll.style.display = 'none'; lpList.style.display = 'none'; lpFoot.style.display = 'none';
  // mobile mirror
  mName.innerHTML = `<span class="ppt-dot" style="background:hsl(${SRC_HUES[it.source]||190},84%,55%)"></span>${it.name}`;
  mDesc.textContent = it.description || '—';
  mNb.innerHTML = '';
  (it.nn || []).slice(0,6).forEach(n => { const li = document.createElement('li'); li.innerHTML = `<span class="n"></span><span class="s"></span>`; li.querySelector('.n').textContent = n.name; li.querySelector('.s').textContent = n.score.toFixed(3); mNb.appendChild(li); });
  mSrc.textContent = it.source ? 'source: ' + it.source : '';
  mpoint.classList.add('open');
  pauseAutoRotate();
}
function showTypes(){
  lpPoint.style.display = 'none'; lpAll.style.display = ''; lpList.style.display = ''; lpFoot.style.display = '';
  mpoint.classList.remove('open');
  resumeAutoRotate();
}
lpPointBack.addEventListener('click', showTypes);
mpointBack.addEventListener('click', showTypes);

/* ================= Auto-rotate pacing ================= */
let autoRotatePaused = false, autoRotateTimer = 0;
function pauseAutoRotate(){ if (!autoRotatePaused){ controls.autoRotate = false; autoRotatePaused = true; } autoRotateTimer = 0; }
function resumeAutoRotate(){ if (autoRotatePaused){ controls.autoRotate = true; autoRotatePaused = false; } }

/* ================= Math core ================= */
function parseFormula(raw){
  const t = raw.toLowerCase().trim(); const parts = t.split(/\s+/);
  if (parts.length === 1) return { tokens: parts, ops: [] };
  const tokens = [], ops = []; let valid = true;
  for (let i=0;i<parts.length;i++){
    if (i%2===0) tokens.push(parts[i]);
    else if (parts[i]==='+' || parts[i]==='-') ops.push(parts[i]);
    else { valid = false; break; }
  }
  if (valid && ops.length>0 && tokens.length===ops.length+1) return { tokens, ops };
  return { tokens:[t], ops:[] };
}
function levenshtein(a,b){
  if (a.length===0) return b.length; if (b.length===0) return a.length;
  const m = []; for (let i=0;i<=b.length;i++) m[i]=[i];
  for (let j=0;j<=a.length;j++) m[0][j]=j;
  for (let i=1;i<=b.length;i++) for (let j=1;j<=a.length;j++)
    m[i][j] = (b.charAt(i-1)===a.charAt(j-1)) ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
  return m[b.length][a.length];
}
function lookupToken(token){
  if (!nameToIdx) return null;
  const exact = nameToIdx.get(token);
  if (exact !== undefined) return { name: token, idx: exact, exact: true, suggestion: null };
  let best = null;
  for (const name of nameToIdx.keys()){
    const d = levenshtein(token, name); const maxLen = Math.max(token.length, name.length);
    if (d > 3 || d/maxLen > 0.34) continue;
    const prefix = findCommonPrefix(token, name);
    if (!best || d < best.d || (d === best.d && (prefix > best.prefix || (prefix === best.prefix && name.length < best.name.length))))
      best = { name, d, prefix };
  }
  if (best) return { name: token, idx: nameToIdx.get(best.name), exact: false, suggestion: best.name };
  return { name: token, idx: -1, exact: false, suggestion: null };
}
function findCommonPrefix(a,b){ let i=0; while (i<a.length && i<b.length && a[i]===b[i]) i++; return i; }
function computeResult(tokens, ops){
  if (!vectorsLoaded || !corpusVectors) return null;
  const N = corpusVectors.length / DIM;
  const result = new Float32Array(DIM);
  let i0 = nameToIdx.get(tokens[0]);
  if (i0 === undefined || i0 >= N) return null;
  for (let d=0;d<DIM;d++) result[d] = corpusVectors[i0*DIM+d];
  for (let i=0;i<ops.length;i++){
    const idx = nameToIdx.get(tokens[i+1]);
    if (idx === undefined || idx >= N) return null;
    const sign = ops[i]==='-' ? -1 : 1;
    for (let d=0;d<DIM;d++) result[d] += sign * corpusVectors[idx*DIM+d];
  }
  return result;
}
function nearestNeighbors(vec, k){
  if (!vectorsLoaded || !corpusVectors || !corpusItems) return [];
  const N = corpusVectors.length / DIM;
  let vNorm = 0; for (let d=0;d<DIM;d++) vNorm += vec[d]*vec[d]; vNorm = Math.sqrt(vNorm) || 1;
  const heap = [];
  for (let i=0;i<N;i++){
    let dot = 0, iNorm = 0;
    for (let d=0;d<DIM;d++){ dot += vec[d]*corpusVectors[i*DIM+d]; iNorm += corpusVectors[i*DIM+d]*corpusVectors[i*DIM+d]; }
    iNorm = Math.sqrt(iNorm) || 1;
    const score = dot/(vNorm*iNorm);
    heap.push({ idx:i, name: corpusItems[i].name, score });
    heap.sort((a,b)=>b.score-a.score); if (heap.length>k) heap.length = k;
  }
  return heap;
}
function projectVec(vec){
  if (!corpusPCA) return [0,0,0];
  const mean = corpusPCA.mean, components = corpusPCA.components;
  const centered = new Float32Array(DIM);
  for (let d=0;d<DIM;d++) centered[d] = vec[d]-mean[d];
  const r = [0,0,0];
  for (let c=0;c<3;c++) for (let d=0;d<DIM;d++) r[c] += centered[d]*components[c][d];
  if (corpusPCA.pos_min && corpusPCA.pos_max){
    for (let c=0;c<3;c++){ const span = corpusPCA.pos_max[c]-corpusPCA.pos_min[c]; r[c] = span ? ((r[c]-corpusPCA.pos_min[c])/span)*20-10 : 0; }
  }
  return r;
}

/* ================= Trails ================= */
let trails = [];
function createTrailObject(formula){ return { id: Date.now(), formula, glowSprites:[], labelSprites:[], lines:[], resultGlow:null, resultLabel:null, opacity:1.0 }; }
function addSourceGlow(idx, trail){
  const p = corpusItems[idx].pos, pos = new THREE.Vector3(p[0],p[1],p[2]);
  const blend = trailTheme().add ? THREE.AdditiveBlending : THREE.NormalBlending;
  const m1 = new THREE.SpriteMaterial({ map: glowBright, blending:blend, depthWrite:false, depthTest:true, transparent:true, opacity:0.25 });
  const s1 = new THREE.Sprite(m1); s1.position.copy(pos); s1.scale.set(2.2,2.2,1); spriteGroup.add(s1); trail.glowSprites.push(s1);
  const m2 = new THREE.SpriteMaterial({ map: glowTex, blending:blend, depthWrite:false, depthTest:true, transparent:true, opacity:0.45 });
  const s2 = new THREE.Sprite(m2); s2.position.copy(pos); s2.scale.set(0.8,0.8,1); spriteGroup.add(s2); trail.glowSprites.push(s2);
}
function addConnectorBetween(a, b, trail, bright){
  const dir = new THREE.Vector3().copy(b).sub(a); const len = dir.length();
  if (len < 0.01) return null;
  const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
  const geom = new THREE.CylinderGeometry(0.01, 0.015, len, 6, 1);
  const mat = new THREE.MeshBasicMaterial({ color: trailTheme().line, blending:THREE.NormalBlending, depthWrite:false, depthTest:false, transparent:true, opacity: bright?0.95:0.7 });
  const mesh = new THREE.Mesh(geom, mat); mesh.position.copy(mid);
  const up = new THREE.Vector3(0,1,0); mesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
  mesh.renderOrder = 999; lineGroup.add(mesh); trail.lines.push(mesh);
  const dotGeom = new THREE.SphereGeometry(0.04,6,4);
  const dotMat = new THREE.MeshBasicMaterial({ color:trailTheme().line, blending:THREE.NormalBlending, depthWrite:false, depthTest:false, transparent:true, opacity: bright?0.9:0.6 });
  const da = new THREE.Mesh(dotGeom, dotMat); da.position.copy(a); da.renderOrder = 1000; lineGroup.add(da); trail.lines.push(da);
  const db = new THREE.Mesh(dotGeom, dotMat); db.position.copy(b); db.renderOrder = 1000; lineGroup.add(db); trail.lines.push(db);
  return mesh;
}
function addLabelAt(position, text, opacity, trail){
  const ls = trailTheme().labelScale||1;
  const tex = createLabelTexture(text, opacity, trailTheme().labelFill);
  const mat = new THREE.SpriteMaterial({ map: tex, blending:THREE.NormalBlending, depthWrite:false, depthTest:false, transparent:true, alphaTest:0.01, opacity:trailTheme().labelOp });
  const spr = new THREE.Sprite(mat); spr.position.copy(position).add(new THREE.Vector3(0,0.35*ls,0)); spr.scale.set(3.5*ls,0.875*ls,1);
  spr.userData.__text = text; spr.userData.__op = opacity;
  spriteGroup.add(spr); trail.labelSprites.push(spr); return spr;
}
function addResultGlow(pos, trail){
  const blend = trailTheme().add ? THREE.AdditiveBlending : THREE.NormalBlending;
  const mat = new THREE.SpriteMaterial({ map: glowBright, blending:blend, depthWrite:false, depthTest:true, transparent:true, opacity:0.7 });
  const spr = new THREE.Sprite(mat); spr.position.copy(pos); spr.scale.set(1.6,1.6,1); spriteGroup.add(spr); trail.resultGlow = spr; return spr;
}
function dimAllTrails(){
  const op = trailTheme().labelOp;
  for (let i=0;i<trails.length-1;i++){
    const t = trails[i], age = trails.length-1-i;
    t.opacity = Math.max(0.12, 0.18 + age*0.02);
    t.lines.forEach(l => { if (l.material) l.material.opacity = t.opacity*0.85; });
    t.labelSprites.forEach(s => { if (s.material) s.material.opacity = t.opacity*op; });
    t.glowSprites.forEach(s => { if (s.material) s.material.opacity = t.opacity*0.6; });
    if (t.resultGlow && t.resultGlow.material) t.resultGlow.material.opacity = t.opacity*0.7;
  }
  if (trails.length){ const t = trails[trails.length-1]; t.opacity = 1.0;
    t.lines.forEach(l => { if (l.material) l.material.opacity = 0.85; });
    t.labelSprites.forEach(s => { if (s.material) s.material.opacity = op; });
    t.glowSprites.forEach(s => { if (s.material) s.material.opacity = 0.6; });
    if (t.resultGlow && t.resultGlow.material) t.resultGlow.material.opacity = 0.7; }
}
function evictTrails(){
  while (trails.length > MAX_TRAILS){
    const r = trails.shift();
    r.glowSprites.forEach(s => { spriteGroup.remove(s); s.material.dispose(); });
    r.labelSprites.forEach(s => { spriteGroup.remove(s); if (s.material.map) s.material.map.dispose(); s.material.dispose(); });
    r.lines.forEach(l => { lineGroup.remove(l); l.geometry.dispose(); l.material.dispose(); });
    if (r.resultGlow) { spriteGroup.remove(r.resultGlow); r.resultGlow.material.dispose(); }
    if (r.resultLabel) { spriteGroup.remove(r.resultLabel); r.resultLabel.material.map.dispose(); r.resultLabel.material.dispose(); }
  }
}
function clearAllTrails(){
  for (const t of trails){
    t.glowSprites.forEach(s => { spriteGroup.remove(s); s.material.dispose(); });
    t.labelSprites.forEach(s => { spriteGroup.remove(s); if (s.material.map) s.material.map.dispose(); s.material.dispose(); });
    t.lines.forEach(l => { lineGroup.remove(l); l.geometry.dispose(); l.material.dispose(); });
    if (t.resultGlow) { spriteGroup.remove(t.resultGlow); t.resultGlow.material.dispose(); }
    if (t.resultLabel) { spriteGroup.remove(t.resultLabel); t.resultLabel.material.map.dispose(); t.resultLabel.material.dispose(); }
  }
  trails = []; lastFormula = null; lastTokens = []; lastOps = []; lastResultName = null; lastResultVec = null; lastResultNeighbors = [];
  eq.value = ''; sbFormula.textContent = ''; updateURLHash('');
  if (detail.classList.contains('open')) renderObserve();
}
clearBtn.addEventListener('click', e => { e.stopPropagation(); clearAllTrails(); });

/* ================= Formula handling ================= */
function status(text){ sbFormula.textContent = text || ''; }

async function handleFormula(formula){
  if (!corpusLoaded) return;
  const { tokens, ops } = parseFormula(formula);
  const resolved = tokens.map(t => lookupToken(t));
  const allResolved = resolved.every(r => r && r.idx >= 0);
  if (!allResolved){
    const bad = tokens.filter((t,i) => !resolved[i] || resolved[i].idx < 0);
    status('token not found: ' + bad.join(', '));
    return;
  }
  const names = resolved.map(r => r.suggestion || r.name);
  if (lastFormula && lastFormula.toLowerCase() === formula.toLowerCase()){ status('already on screen'); return; }

  if (tokens.length === 1){
    const idx = resolved[0].idx;
    const trail = createTrailObject(formula);
    const p = corpusItems[idx].pos;
    trail.resultPos = new THREE.Vector3(p[0],p[1],p[2]);
    addSourceGlow(idx, trail);
    const item = corpusItems[idx];
    const nn = item.nn || [];
    addResultGlow(trail.resultPos, trail);
    trail.resultLabel = addLabelAt(trail.resultPos.clone().add(new THREE.Vector3(0,0.5,0)), item.name, 0.95, trail);
    trails.push(trail); evictTrails(); dimAllTrails();
    lastFormula = formula; lastTokens = [names[0]]; lastOps = []; lastResultName = item.name; lastResultNeighbors = nn;
    lastResultVec = null;
    status(item.name + ' — nearest neighbors by cosine');
    updateURLHash(formula);
    if (detail.classList.contains('open')) renderObserve();
    return;
  }

  // Multi-token: need vectors
  const vOk = await ensureVectorsLoaded();
  if (!vOk) return;
  const resultVec = computeResult(names, ops);
  if (!resultVec){ status('could not compute vector arithmetic'); return; }
  const rpos = projectVec(resultVec);
  const resultPos = new THREE.Vector3(rpos[0], rpos[1], rpos[2]);
  const neighbors = nearestNeighbors(resultVec, 10);
  const topName = neighbors.length ? neighbors[0].name : null;

  const trail = createTrailObject(formula);
  const srcPoses = [];
  for (const r of resolved){ addSourceGlow(r.idx, trail); const p = corpusItems[r.idx].pos; srcPoses.push(new THREE.Vector3(p[0],p[1],p[2])); }
  for (let i=1;i<srcPoses.length;i++) addConnectorBetween(srcPoses[i-1], srcPoses[i], trail, false);
  if (srcPoses.length) addConnectorBetween(srcPoses[srcPoses.length-1], resultPos, trail, true);
  trails.push(trail); tracesNeighbors(trail, resultPos, neighbors);
  addResultGlow(resultPos, trail);
  if (topName) trail.resultLabel = addLabelAt(resultPos.clone().add(new THREE.Vector3(0,0.5,0)), topName, 0.95, trail);
  evictTrails(); dimAllTrails();
    lastFormula = formula; lastTokens = names; lastOps = ops; lastResultName = topName; lastResultVec = resultVec; lastResultNeighbors = neighbors;
    let expr = names[0]; for (let i=0;i<ops.length;i++) expr += ' ' + ops[i] + ' ' + names[i+1];
    status(topName ? (expr + ' → ' + topName) : expr);
    updateURLHash(formula);
    if (detail.classList.contains('open')) renderObserve();
  }
function tracesNeighbors(trail, resultPos, neighbors){
  neighbors.slice(0,10).forEach(n => {
    const idx = nameToIdx.get(n.name);
    if (idx !== undefined && corpusItems[idx]){
      addConnectorBetween(resultPos, new THREE.Vector3(corpusItems[idx].pos[0], corpusItems[idx].pos[1], corpusItems[idx].pos[2]), trail, false);
      addLabelAt(new THREE.Vector3(corpusItems[idx].pos[0], corpusItems[idx].pos[1], corpusItems[idx].pos[2]), n.name, 0.8, trail);
    }
  });
}
function ensureVectorsLoaded(){ if (!vectorsLoaded) return loadCorpusVectors(); return true; }

/* did-you-mean live status on input */
let didYouMeanTimer = null;
eq.addEventListener('input', () => {
  const v = eq.value.trim();
  if (!corpusLoaded){ status(''); return; }
  if (!v){ status(''); return; }
  const parts = v.split(/\s+/); const sug = []; let notFound = [];
  for (let i=0;i<parts.length;i++){ if (i%2!==0) continue; const t = parts[i].toLowerCase(); if (t.length<2) continue;
    const r = lookupToken(t); if (r && !r.exact && r.suggestion) sug.push('"' + t + '" → ' + r.suggestion);
    else if (r && r.idx < 0) notFound.push(t); }
  if (sug.length) status('did you mean: ' + sug.join(', ') + ' (tab to accept)');
  else if (notFound.length) status('token not found: ' + notFound.join(', '));
  else status('');
});
eq.addEventListener('keydown', e => {
  if (e.key === 'Enter'){
    e.preventDefault();
    const v = eq.value.trim();
    if (!v) return;
    if (v === '/clear'){ clearAllTrails(); return; }
    handleFormula(v);
  } else if (e.key === 'Tab'){
    e.preventDefault();
    const v = eq.value.trim(); if (!v || !corpusLoaded) return;
    const parts = v.split(/\s+/); let changed = false;
    for (let i=0;i<parts.length;i++){ if (i%2!==0) continue; const t = parts[i].toLowerCase(); const r = lookupToken(t);
      if (r && r.suggestion){ parts[i] = r.suggestion; changed = true; } }
    if (changed){ eq.value = parts.join(' '); status(''); }
  } else if (e.key === 'Escape'){
    if (detail.classList.contains('open')) closeDetail();
    showTypes(); clearHover(); hideTip();
  }
});
eqSend.addEventListener('click', () => { const v = eq.value.trim(); if (v) handleFormula(v); });

/* ================= Inspect (right panel) — real observatory ================= */
function getVecForToken(name){ if (!vectorsLoaded || !corpusVectors) return null; const idx = nameToIdx.get(name); if (idx === undefined || idx >= corpusCount) return null; return corpusVectors.subarray(idx*DIM,(idx+1)*DIM); }
function computeHeatmapBins(vec){
  const bins = new Float32Array(HEATMAP_BINS);
  for (let i=0;i<HEATMAP_BINS;i++){ let s=0; for (let d=i*BIN_SIZE; d<(i+1)*BIN_SIZE; d++) s += vec[d]; bins[i]=s; }
  let max=0; for (let i=0;i<HEATMAP_BINS;i++) max = Math.max(max, Math.abs(bins[i]));
  if (max>0) for (let i=0;i<HEATMAP_BINS;i++) bins[i] = Math.abs(bins[i])/max;
  return bins;
}
function renderObserve(){
  let body = '';
  if (!lastFormula){
    body = `<div class="obs-section" style="text-align:center;color:var(--muted);font-size:12px;padding:26px 0;">run a formula in the search bar<br><br>try <span style="color:var(--accent)">transformer - attention + diffusion</span></div>`;
    obsBody.innerHTML = body; return;
  }
  // formula bar
  let fb = '';
  lastTokens.forEach((t,i) => { fb += `<span class="t">${t}</span>`; if (i<lastOps.length) fb += ` <span class="op">${lastOps[i]==='-'?'\u2212':'+'}</span> `; });
  if (lastResultName) fb += ` <span class="arw">\u2192</span> <span class="res">${lastResultName}</span>`;
  body += `<div class="obs-section"><div class="obs-label">FORMULA</div><div class="obs-formula-bar">${fb}</div></div>`;
  // heatmaps (real vectors)
  if (vectorsLoaded && corpusVectors){
    let hm = '';
    lastTokens.forEach(t => { const vec = getVecForToken(t); if (vec) hm += heatRow(t, vec); });
    if (lastResultVec && lastTokens.length > 1) hm += heatRow('result', lastResultVec);
    if (hm){
      const labels = []; for (let i=0;i<HEATMAP_BINS;i++){ labels.push(`<span class="obs-btick">${[0,8,16,24,31].includes(i) ? [0,96,192,288,384][[0,8,16,24,31].indexOf(i)] : ''}</span>`); }
      body += `<div class="obs-section"><div class="obs-label">384-DIM VECTOR HEATMAPS (32 BINS)</div><div class="obs-heatmap">${hm}</div><div class="obs-binlabels">${labels.join('')}</div></div>`;
    }
  }
  // arithmetic
  let ar = '';
  lastTokens.forEach((t,i) => { ar += `<span class="sym">V</span>(${t})`; if (i<lastOps.length) ar += ` <span class="sym">${lastOps[i]==='-'?'\u2212':'+'}</span> `; });
  if (lastResultName){ ar += ` <span class="sym">\u2248</span> <span class="sym">V</span>(${lastResultName})`; }
  if (lastResultNeighbors.length) ar += ` <span class="cos">cos = ${lastResultNeighbors[0].score.toFixed(3)}</span>`;
  body += `<div class="obs-section"><div class="obs-label">ARITHMETIC</div><div class="obs-arith">${ar}</div></div>`;
  // PCA chip
  let pca = null;
  if (lastResultVec) pca = projectVec(lastResultVec);
  else if (lastTokens.length){ const idx = nameToIdx.get(lastTokens[0]); if (idx !== undefined && idx < corpusCount) pca = corpusItems[idx].pos; }
  if (pca){
    const dn = lastResultName || lastTokens[0];
    body += `<div class="obs-section"><div class="obs-label">PCA-3 PROJECTION</div><div class="obs-pca"><span>${dn}</span> \u2192 [x: <span>${pca[0]>=0?'+':''}${pca[0].toFixed(2)}</span> y: <span>${pca[1]>=0?'+':''}${pca[1].toFixed(2)}</span> z: <span>${pca[2]>=0?'+':''}${pca[2].toFixed(2)}</span>]</div></div>`;
  }
  // top-10
  if (lastResultNeighbors.length){
    const maxS = lastResultNeighbors[0].score;
    let nb = '';
    lastResultNeighbors.slice(0,10).forEach((n,k) => { const pct = maxS>0 ? Math.round(n.score/maxS*100) : 0;
      nb += `<div class="obs-nrow"><span class="rk">${k+1}</span><span class="nm">${n.name}</span><div class="barwrap"><div class="bar" style="width:${pct}%"></div></div><span class="sc">${n.score.toFixed(3)}</span></div>`; });
    body += `<div class="obs-section"><div class="obs-label">TOP-10 NEIGHBORS (COSINE)</div><div class="obs-nb">${nb}</div></div>`;
  }
  // footer
  const modelId = corpusModel ? corpusModel.id : 'all-MiniLM-L6-v2';
  const size = corpusModel ? corpusModel.corpus_size.toLocaleString() : corpusItems.length.toLocaleString();
  const variance = corpusPCA && corpusPCA.explained_variance_ratio ? (corpusPCA.explained_variance_ratio.reduce((a,b)=>a+b,0)*100).toFixed(1) : '?';
  body += `<div class="obs-section"><div class="obs-label">MODEL</div><div class="obs-pca">${modelId}<br><span>${size}</span> items · PCA-3 <span>${variance}%</span> variance</div></div>`;
  if (vectorsHashMismatch) body += `<div class="obs-section" style="color:oklch(0.50 0.10 20);font-size:11px;">vector integrity mismatch — reload</div>`;
  obsBody.innerHTML = body;
}
function heatRow(name, vec){ const b = computeHeatmapBins(vec); const cells = []; for (let i=0;i<HEATMAP_BINS;i++) cells.push(`<div class="obs-cell" style="opacity:${b[i].toFixed(3)}"></div>`);
  return `<div class="obs-hrow"><span class="obs-hname">${name}</span><div class="obs-cells">${cells.join('')}</div></div>`; }
function openInspect(){ detail.classList.add('open'); resizeCanvas(); renderObserve(); }
function closeDetail(){ detail.classList.remove('open'); }
function toggleInspect(){ if (detail.classList.contains('open')) closeDetail(); else openInspect(); resizeCanvas(); }
document.getElementById('inspect-btn').addEventListener('click', toggleInspect);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

/* ================= Hash deep-links ================= */
function parseHash(hash){
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return { formula: null };
  if (raw.includes('=') || raw.includes('&')){ const p = new URLSearchParams(raw); return { formula: p.get('f') ? decodeURIComponent(p.get('f')) : null }; }
  return { formula: decodeURIComponent(raw.replace(/\+/g,' ')) };
}
function updateURLHash(formula){ const url = window.location.pathname + (formula ? '#f=' + encodeURIComponent(formula) : ''); history.pushState(null, '', url); }
window.addEventListener('popstate', () => { const { formula } = parseHash(window.location.hash); if (formula){ eq.value = formula; clearAllTrails(); handleFormula(formula); } });

/* ================= Canvas interaction ================= */
renderer.domElement.addEventListener('pointermove', ev => {
  if (!corpusLoaded || !points){ return; }
  const hits = worldHits(ev);
  if (hits.length){ let b = hits[0]; for (let i=1;i<hits.length;i++) if (hits[i].distanceToRay < b.distanceToRay) b = hits[i];
    if (b.index >= 0 && b.index < corpusCount){ setHover(b.index); renderer.domElement.style.cursor = 'pointer';
      const it = corpusItems[b.index]; tipDot.style.background = 'hsl(' + (SRC_HUES[it.source]||190) + ',84%,55%)'; tipText.textContent = it.name;
      tip.classList.add('show'); const [nx,ny] = clampScreen(ev.clientX+12, ev.clientY+14); tip.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
    } else { clearHover(); hideTip(); } }
  else { clearHover(); hideTip(); renderer.domElement.style.cursor = ''; }
});
renderer.domElement.addEventListener('pointerleave', () => { clearHover(); hideTip(); });
renderer.domElement.addEventListener('click', ev => {
  const hits = worldHits(ev);
  const c = hits.find(h => h.index >= 0 && h.index < corpusCount);
  if (c){ clickBurst(c.point); selectPointRaw(corpusItems[c.index]); }
});
renderer.domElement.addEventListener('pointerdown', () => pauseAutoRotate());

/* ================= Settings ================= */
const settingsOpen = (()=>{ let o=false; return ()=>{ o=!o; dbg.classList.toggle('open',o); dbgBtn.classList.toggle('active',o); }; })();
dbgBtn.addEventListener('click', settingsOpen);
dbgClose.addEventListener('click', e => { e.stopPropagation(); if (dbg.classList.contains('open')) settingsOpen(); });
dbg.addEventListener('click', e => e.stopPropagation());
function bindRange(id, valId, cb){ const el = document.getElementById(id), v = document.getElementById(valId); el.addEventListener('input', () => { v.textContent = Number(el.value).toFixed(2); cb(parseFloat(el.value)); }); }
bindRange('d-bright','v-bright', v => { cloudMat.uniforms.uBright.value = v; });
bindRange('d-glow','v-glow', v => { cloudMat.uniforms.uGlow.value = v; });
bindRange('d-size','v-size', v => { cloudMat.uniforms.uSize.value = v; });
bindRange('d-thresh','v-thresh', v => { bloomPass.userThreshold = v; bloomPass.threshold = v; });
bindRange('d-zoom','v-zoom', v => { const t = camera.position.length(); if (t>1e-6){ const s=v/t; camera.position.multiplyScalar(s); } controls.target.set(0,0,0); controls.update(); });
bindRange('d-theme','v-theme', v => { root.style.setProperty('--theme-ms', v + 'ms'); });
const lbgEl = document.getElementById('d-lbg'), lbgVal = document.getElementById('v-lbg');
lbgEl.addEventListener('input', () => { const hex = lbgEl.value; lbgVal.textContent = hex; clearLight.set(hex); root.style.setProperty('--canv-bg', hex); if (isLight()) applySceneBg(); });
document.getElementById('d-stats').addEventListener('change', e => { showStats = e.target.checked; statsEl.style.display = showStats ? 'block' : 'none'; });

/* ================= Stats overlay ================= */
const statsEl = document.createElement('div'); statsEl.className = 'stats-overlay'; statsEl.id = 'stats-overlay'; stage.appendChild(statsEl);
let showStats = false, fps = 0, frames = 0, fpsT = performance.now();

/* ================= Ripples ================= */
const ripples = [];

/* ================= Resize / loop ================= */
function resizeCanvas(){ const w = W(), h = H(); if (w>0 && h>0){ camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); composer.setSize(w,h); bloomPass.setSize(w,h); } centerStage(); }
window.addEventListener('resize', resizeCanvas);

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  if (showStats){ frames++; if (performance.now() - fpsT >= 500){ fps = Math.round(frames*1000/(performance.now()-fpsT)); frames = 0; fpsT = performance.now(); statsEl.textContent = fps + ' fps · ' + corpusCount.toLocaleString() + ' pts · perf ' + (perfMode?'on':'off'); } }
  const now = Date.now();
  if (autoRotatePaused){ autoRotateTimer += 16; if (autoRotateTimer > 5000 && !lpPointVisible() && !detail.classList.contains('open')) resumeAutoRotate(); }
  for (let i = trails.length-1; i >= 0; i--){
    const t = trails[i], isLatest = t === trails[trails.length-1];
    if (t.resultGlow){ const s = (isLatest ? 1.4 : 0.6) + Math.sin(now*0.004)*0.3; t.resultGlow.scale.set(s,s,1); }
  }
  for (let i=ripples.length-1;i>=0;i--){ const r = ripples[i]; r.age += 16; const t = r.age/r.maxAge;
    if (t>=1){ spriteGroup.remove(r.ring); spriteGroup.remove(r.gl); r.ring.material.map.dispose(); r.ring.material.dispose(); r.gl.material.map.dispose(); r.gl.material.dispose(); ripples.splice(i,1); }
    else { r.ring.scale.set(0.5+t*1.6, 0.5+t*1.6, 1); r.ring.material.opacity = 0.7*(1-t); r.gl.scale.set(0.15+t*0.9, 0.15+t*0.9, 1); r.gl.material.opacity = 0.35*(1-t); } }
  if (hoverRingSprite || clickRingSprite){ }
  if (perfMode) renderer.render(scene, camera); else composer.render();
}
function lpPointVisible(){ return lpPoint && lpPoint.style.display === 'block'; }

/* ================= Init / demo ================= */
const DEMO = 'transformer - attention + diffusion';
function startDemo(){
  setTimeout(() => {
    eq.value = DEMO;
    status('running: ' + DEMO);
    handleFormula(DEMO);
  }, 800);
}
async function init(){
  const { formula } = parseHash(window.location.hash);
  const ok = await loadCorpusMeta();
  if (!ok) return;
  if (formula){ eq.value = formula; await loadCorpusVectors(); handleFormula(formula); }
  else startDemo();
}
animate();
resizeCanvas();   // initial center: without this, centerStage never runs on first load
                   // and the latent space sits stage-centered until the first panel toggle shifts it.
setTimeout(() => eq.focus(), 100);
init();
