import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { SplatMesh, SparkRenderer } from "@sparkjsdev/spark";
import {
  OZ_WORLDS,
  getWorldById,
  getProgress,
  saveWorldProgress,
  isWorldUnlocked,
  getTotalStars,
  type OzWorld,
  type OzObject,
} from "./oz-data";

// ── Book catalog ──
interface AnimDef { name: string; url: string; }
interface BookDef {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  splatUrl: string;
  sceneTitle: string;
  sceneSubtitle: string;
  locked?: boolean;
  modelUrl?: string;
  modelScale?: number;
  modelPosition?: [number, number, number];
  modelRotation?: [number, number, number];
  extraAnims?: AnimDef[];
  isOzBook?: boolean;
}

const BOOKS: BookDef[] = [
  {
    id: "kite_runner",
    title: "The Kite Runner",
    author: "Khaled Hosseini",
    coverUrl: "./books/KiteRunner.jpg",
    splatUrl: "./splats/sensai.spz",
    sceneTitle: "Kabul, 1975",
    sceneSubtitle: "The kite-fighting tournament that changed everything",
  },
  {
    id: "wizard_of_oz",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    coverUrl: "./books/WizardOfOz.jpg",
    splatUrl: "",
    sceneTitle: "The Land of Oz",
    sceneSubtitle: "A STEM learning adventure through 8 magical worlds",
    isOzBook: true,
  },
  {
    id: "ww2",
    title: "Harry Potter",
    author: "J.K. Rowling",
    coverUrl: "./books/gobletoffire.jpg",
    splatUrl: "./splats/sensai.spz",
    sceneTitle: "The Goblet of Fire",
    sceneSubtitle: "Hogwarts — The Triwizard Tournament",
    locked: false,
  },
  {
    id: "apollo",
    title: "Apollo 13",
    author: "Jim Lovell",
    coverUrl: "./books/Apollo11.jpg",
    splatUrl: "./splats/LunarCrateredLandscape2.spz",
    sceneTitle: "Apollo 11",
    sceneSubtitle: "The First Moon Landing",
    locked: false,
    modelUrl: "./models/astronaut.fbx",
    modelScale: 0.3,
    extraAnims: [
      { name: "run", url: "./models/astronaut_run.fbx" },
    ],
  },
];

// ── DOM ──
const loadingOverlay = document.getElementById("loading-overlay")!;
const header = document.getElementById("header")!;
const tooltip = document.getElementById("book-tooltip")!;
const hint = document.getElementById("hint")!;
const sceneInfo = document.getElementById("scene-info")!;
const sceneTitleEl = document.getElementById("scene-title")!;
const sceneSubtitleEl = document.getElementById("scene-subtitle")!;
const backBtn = document.getElementById("back-btn")!;

// Oz-specific DOM
const ozMapOverlay = document.getElementById("oz-map-overlay")!;
const ozMapGrid = document.getElementById("oz-map-grid")!;
const ozMapBack = document.getElementById("oz-map-back")!;
const ozIntroOverlay = document.getElementById("oz-intro-overlay")!;
const ozDiscoveryPanel = document.getElementById("oz-discovery-panel")!;
const ozObjectPopup = document.getElementById("oz-object-popup")!;
const ozSceneHud = document.getElementById("oz-scene-hud")!;
const ozQuizOverlay = document.getElementById("oz-quiz-overlay")!;
const greenFilter = document.getElementById("green-filter")!;
const greenSpectaclesBtn = document.getElementById("green-spectacles-btn")! as HTMLButtonElement;
const vrBtn = document.getElementById("vr-btn") as HTMLButtonElement | null;

// Narration API (backend must run on 8080)
const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:8080";

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ── Scene ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a3a52, 0.018);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2.5, 7);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minPolarAngle = Math.PI * 0.25;
controls.minDistance = 4;
controls.maxDistance = 14;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
controls.enablePan = false;

// ── Library world ──
const libraryGroup = new THREE.Group();
scene.add(libraryGroup);

// ── Sky ──
const skyGeo = new THREE.SphereGeometry(80, 32, 32);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {},
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPos;
    void main() {
      float h = normalize(vWorldPos).y;
      vec3 horizon = vec3(0.25, 0.35, 0.50);
      vec3 zenith  = vec3(0.08, 0.12, 0.28);
      vec3 ground  = vec3(0.12, 0.20, 0.12);
      vec3 col = h > 0.0
        ? mix(horizon, zenith, smoothstep(0.0, 0.6, h))
        : mix(horizon, ground, smoothstep(0.0, -0.15, h));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
libraryGroup.add(new THREE.Mesh(skyGeo, skyMat));

// ── Stars ──
const starCount = 2500;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 0.85 + 0.15);
  const r = 70;
  starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.cos(phi);
  starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
libraryGroup.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.9,
})));

// ── Ground ──
const groundGeo = new THREE.PlaneGeometry(120, 120, 128, 128);
groundGeo.rotateX(-Math.PI / 2);
const posAttr = groundGeo.getAttribute("position");
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i), z = posAttr.getZ(i);
  const dist = Math.sqrt(x * x + z * z);
  const h = Math.sin(x * 0.08) * 0.35 + Math.sin(z * 0.06 + 1) * 0.25 + Math.sin(x * 0.15 + z * 0.12) * 0.12 - dist * 0.004;
  posAttr.setY(i, Math.max(h, -0.3));
}
groundGeo.computeVertexNormals();
libraryGroup.add(new THREE.Mesh(groundGeo, new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `
    varying vec3 vWorldPos; varying vec3 vNormal;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz; vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPos; varying vec3 vNormal;
    void main() {
      float dist = length(vWorldPos.xz);
      vec3 near = vec3(0.14, 0.30, 0.10); vec3 far = vec3(0.08, 0.18, 0.07);
      vec3 col = mix(near, far, smoothstep(4.0, 35.0, dist));
      float light = dot(vNormal, normalize(vec3(0.3, 1.0, 0.2))) * 0.5 + 0.5;
      col *= 0.5 + light * 0.5;
      float fog = 1.0 - exp(-0.002 * dist * dist);
      col = mix(col, vec3(0.16, 0.22, 0.32), fog);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
})));

// ── Lighting ──
libraryGroup.add(new THREE.AmbientLight(0x8899bb, 1.6));
const moon = new THREE.DirectionalLight(0xaabbdd, 2.5);
moon.position.set(8, 18, 6);
libraryGroup.add(moon);
const fill = new THREE.DirectionalLight(0x99aacc, 1.0);
fill.position.set(-6, 10, -4);
libraryGroup.add(fill);
const bookSpot = new THREE.PointLight(0xfff0dd, 5, 14, 1.5);
bookSpot.position.set(0, 4, 2.5);
libraryGroup.add(bookSpot);
const portalLight = new THREE.PointLight(0xfff8e0, 0, 8, 1.5);
libraryGroup.add(portalLight);

// ── 3D Books ──
const textureLoader = new THREE.TextureLoader();
const bookGroup = new THREE.Group();
libraryGroup.add(bookGroup);

const PAGE_SEGS = 16;
interface PagePivot {
  pivot: THREE.Group;
  sheet: THREE.Mesh;
  restPositions: Float32Array;
  delay: number;
}
interface BookMesh {
  group: THREE.Group;
  def: BookDef;
  coverPivot: THREE.Group;
  pagePivots: PagePivot[];
  savedRotation: THREE.Euler;
  savedPosition: THREE.Vector3;
}
const bookMeshes: BookMesh[] = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const PAGE_COUNT = 20;
const W = 1.05, H = 1.55, DEPTH = 0.24;
const COVER_T = 0.025;

function createBook(def: BookDef, index: number, total: number): BookMesh {
  const root = new THREE.Group();
  const leatherColor = def.locked ? 0x444455 : (def.isOzBook ? 0x1a6b30 : 0x3a2215);
  const coverMat = new THREE.MeshStandardMaterial({ color: leatherColor, roughness: 0.65, metalness: 0.05 });
  const innerCoverMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
  const pageFaceMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.92 });
  const pageEdgeMat = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.85 });

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, COVER_T),
    [coverMat, coverMat, coverMat, coverMat, innerCoverMat, coverMat],
  );
  back.position.z = -DEPTH / 2 + COVER_T / 2;
  root.add(back);

  const spine = new THREE.Mesh(new THREE.BoxGeometry(COVER_T * 2, H, DEPTH + COVER_T), coverMat);
  spine.position.x = -W / 2 - COVER_T * 0.5;
  root.add(spine);

  const goldMat = new THREE.MeshBasicMaterial({ color: 0xd4a44a });
  for (let s = 0; s < 3; s++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.012, H * 0.55), goldMat);
    strip.position.set(-W / 2 - COVER_T * 1.51, 0, -DEPTH * 0.2 + s * DEPTH * 0.2);
    strip.rotation.y = Math.PI / 2;
    root.add(strip);
  }

  const blockDepth = DEPTH - COVER_T * 2 - 0.006;
  const pageBlock = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.03, H - 0.04, blockDepth),
    pageEdgeMat,
  );
  pageBlock.position.z = 0;
  root.add(pageBlock);

  const pagePivots: PagePivot[] = [];
  const pageW = W - 0.02;
  const pageH = H - 0.04;
  const pageZone = DEPTH - COVER_T * 2 - 0.01;

  for (let p = 0; p < PAGE_COUNT; p++) {
    const pivot = new THREE.Group();
    const zPos = DEPTH / 2 - COVER_T - 0.005 - (pageZone / PAGE_COUNT) * p;
    pivot.position.set(-W / 2 + 0.01, 0, zPos);
    const geo = new THREE.PlaneGeometry(pageW, pageH, PAGE_SEGS, 1);
    geo.translate(pageW / 2, 0, 0);
    const restPositions = new Float32Array(geo.attributes.position.array);
    const mat = pageFaceMat.clone();
    mat.side = THREE.DoubleSide;
    const sheet = new THREE.Mesh(geo, mat);
    pivot.add(sheet);
    root.add(pivot);
    pagePivots.push({ pivot, sheet, restPositions, delay: p * 0.03 });
  }

  const coverPivot = new THREE.Group();
  coverPivot.position.set(-W / 2, 0, DEPTH / 2 - COVER_T / 2);
  const frontCoverMat = new THREE.MeshStandardMaterial({ color: leatherColor, roughness: 0.6, metalness: 0.05 });
  if (def.coverUrl) {
    textureLoader.load(def.coverUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      frontCoverMat.map = tex;
      frontCoverMat.color.set(0xffffff);
      frontCoverMat.needsUpdate = true;
    });
  }
  const frontCover = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, COVER_T),
    [coverMat, coverMat, coverMat, coverMat, frontCoverMat, innerCoverMat],
  );
  frontCover.position.x = W / 2;
  coverPivot.add(frontCover);
  root.add(coverPivot);

  const spread = 3.6;
  const angleStep = (Math.PI * 0.45) / Math.max(total - 1, 1);
  const startAngle = -Math.PI * 0.225;
  const angle = startAngle + index * angleStep;

  root.position.set(Math.sin(angle) * spread, H / 2 + 0.12, -Math.cos(angle) * spread + 2);
  root.lookAt(new THREE.Vector3(0, H / 2, 8));
  root.rotation.x = -0.03;
  root.userData.bookId = def.id;
  root.userData.hoverY = root.position.y;

  const savedPosition = root.position.clone();
  const savedRotation = root.rotation.clone();

  const glow = new THREE.PointLight(def.locked ? 0x667788 : (def.isOzBook ? 0x44dd66 : 0xddccaa), 2.0, 4, 1.5);
  glow.position.set(Math.sin(angle) * spread, 0.5, -Math.cos(angle) * spread + 2);
  libraryGroup.add(glow);
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.7 }),
  );
  ped.position.set(Math.sin(angle) * spread, 0.04, -Math.cos(angle) * spread + 2);
  libraryGroup.add(ped);

  return { group: root, def, coverPivot, pagePivots, savedRotation, savedPosition };
}

BOOKS.forEach((def, i) => {
  const bm = createBook(def, i, BOOKS.length);
  bookGroup.add(bm.group);
  bookMeshes.push(bm);
});

// ── Fireflies ──
const ffCount = 80;
const ffGeo = new THREE.BufferGeometry();
const ffPos2 = new Float32Array(ffCount * 3);
const ffData: { baseY: number; speed: number; radius: number; angle: number }[] = [];
for (let i = 0; i < ffCount; i++) {
  const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 14, y = 0.3 + Math.random() * 3.5;
  ffPos2[i * 3] = Math.cos(a) * r; ffPos2[i * 3 + 1] = y; ffPos2[i * 3 + 2] = Math.sin(a) * r;
  ffData.push({ baseY: y, speed: 0.15 + Math.random() * 0.45, radius: r, angle: a });
}
ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos2, 3));
const ffMat = new THREE.PointsMaterial({
  color: 0xffee88, size: 0.1, sizeAttenuation: true,
  transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
});
libraryGroup.add(new THREE.Points(ffGeo, ffMat));

// ── Interaction state ──
let hoveredBook: BookMesh | null = null;
let openingBook: BookMesh | null = null;
let openProgress = 0;
let isOpening = false;
let activeSplat: SplatMesh | null = null;
let activeModel: THREE.Group | null = null;
let activeAnimMixer: THREE.AnimationMixer | null = null;
let activeAnimActions: Map<string, THREE.AnimationAction> = new Map();
let currentAction: THREE.AnimationAction | null = null;
const activeSceneLights: THREE.Object3D[] = [];
let inScene = false;
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// ── Oz state ──
let ozActive = false;
let currentOzWorld: OzWorld | null = null;
let ozNarrationAudio: HTMLAudioElement | null = null;
let ozNarrationMuted = false;
let ozNarrationRequestId = 0; // Guard against overlapping fetches playing multiple audios
let ozSplatUrls: Record<string, { spz_500k?: string; spz_100k?: string }> = {}; // Marble-generated splats from API
let ozDiscoveryOrbs: THREE.Mesh[] = [];
let ozWorldEnvironment: THREE.Group | null = null; // Ground plane and simple props when splat is sparse
let ozFoundObjects: Set<string> = new Set();
let greenFilterOn = false;

// ── Character controls ──
const keys: Record<string, boolean> = {};
const BASE_SPEED = 1.2;
const SPRINT_MULT = 2.5;
const TURN_SPEED = 6.0;
const CAM_OFFSET = new THREE.Vector3(0, 1.4, 3.0);
const CAM_LOOK_OFFSET = new THREE.Vector3(0, 0.8, 0);
const DEFAULT_FOV = 50;
let modelSpawnPos = new THREE.Vector3();
let modelSpawnRot = 0;

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") keys["space"] = true;
  if (e.shiftKey) keys["shift"] = true;
  if (!inScene) return;

  if (e.key === "[") {
    camera.fov = Math.max(20, camera.fov - 5);
    camera.updateProjectionMatrix();
  }
  if (e.key === "]") {
    camera.fov = Math.min(110, camera.fov + 5);
    camera.updateProjectionMatrix();
  }
  if (e.key === "0" && activeModel) {
    activeModel.position.copy(modelSpawnPos);
    activeModel.rotation.y = modelSpawnRot;
    camera.fov = DEFAULT_FOV;
    camera.updateProjectionMatrix();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === " ") keys["space"] = false;
  if (!e.shiftKey) keys["shift"] = false;
});

function updateCharacterMovement(dt: number) {
  if (!activeModel || !inScene) return;
  const moveDir = new THREE.Vector3();
  if (keys["w"]) moveDir.z -= 1;
  if (keys["s"]) moveDir.z += 1;
  if (keys["a"]) moveDir.x -= 1;
  if (keys["d"]) moveDir.x += 1;
  const vertDir = (keys["e"] || keys["space"] ? 1 : 0) + (keys["q"] ? -1 : 0);
  const sprinting = keys["shift"];
  const speed = BASE_SPEED * (sprinting ? SPRINT_MULT : 1);
  const isMoving = moveDir.lengthSq() > 0 || vertDir !== 0;
  if (currentAction) {
    currentAction.paused = !isMoving;
    currentAction.timeScale = isMoving && sprinting ? 2.0 : 1.0;
  }
  if (vertDir !== 0) activeModel.position.y += vertDir * speed * dt;
  if (moveDir.lengthSq() === 0) return;
  moveDir.normalize();
  const camForward = new THREE.Vector3();
  camera.getWorldDirection(camForward);
  camForward.y = 0; camForward.normalize();
  const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();
  const worldDir = new THREE.Vector3()
    .addScaledVector(camRight, moveDir.x)
    .addScaledVector(camForward, -moveDir.z)
    .normalize();
  activeModel.position.addScaledVector(worldDir, speed * dt);
  const targetAngle = Math.atan2(worldDir.x, worldDir.z);
  let angleDiff = targetAngle - activeModel.rotation.y;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  activeModel.rotation.y += angleDiff * Math.min(1, TURN_SPEED * dt);
}

function updateThirdPersonCamera(dt: number) {
  if (!activeModel || !inScene) return;
  const modelPos = activeModel.position;
  const behind = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), activeModel.rotation.y);
  const desiredPos = new THREE.Vector3()
    .copy(modelPos).add(new THREE.Vector3(0, CAM_OFFSET.y, 0))
    .addScaledVector(behind, CAM_OFFSET.z);
  const camSmooth = 1 - Math.pow(0.01, dt);
  camera.position.lerp(desiredPos, camSmooth);
  const lookAt = new THREE.Vector3().copy(modelPos).add(CAM_LOOK_OFFSET);
  controls.target.lerp(lookAt, camSmooth);
}
let cameraStartPos = new THREE.Vector3();
let cameraStartTarget = new THREE.Vector3();

renderer.domElement.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

renderer.domElement.addEventListener("click", (e) => {
  if (hoveredBook && !hoveredBook.def.locked && !isOpening) {
    startOpenBook(hoveredBook);
    return;
  }
  if (inScene && ozActive && currentOzWorld) {
    // Use event coords for raycast (in case mousemove lag)
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    const hit = checkOrbClick();
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
});

// Capture pointer events before OrbitControls when in Oz world — prevents orb clicks from triggering camera drag / accidental "back"
renderer.domElement.addEventListener(
  "pointerdown",
  (e: PointerEvent) => {
    if (!inScene || !ozActive || !currentOzWorld) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(ozDiscoveryOrbs, true);
    if (intersects.length > 0) {
      let hit = intersects[0].object as THREE.Mesh;
      while (hit && !hit.userData?.ozObject) hit = hit.parent as THREE.Mesh;
      const obj = hit?.userData?.ozObject as OzObject | undefined;
      if (obj && !ozFoundObjects.has(obj.id)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  },
  { capture: true }
);

// Document-level capture — handles orb clicks even when canvas doesn't receive events (e.g. Spark/SplatMesh setup)
document.addEventListener(
  "pointerdown",
  (e: PointerEvent) => {
    if (!inScene || !ozActive || !currentOzWorld || ozDiscoveryOrbs.length === 0) return;
    // Only handle when click target is the canvas (i.e. not a button or other overlay)
    if (e.target !== renderer.domElement) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(ozDiscoveryOrbs, true);
    if (intersects.length > 0) {
      let mesh = intersects[0].object as THREE.Mesh;
      while (mesh && !mesh.userData?.ozObject) mesh = mesh.parent as THREE.Mesh;
      const obj = mesh?.userData?.ozObject as OzObject | undefined;
      if (obj && !ozFoundObjects.has(obj.id)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        ozFoundObjects.add(obj.id);
        showObjectPopup(obj);
        markOrbFound(mesh, obj);
        updateHudFound();
      }
    }
  },
  { capture: true }
);

function checkHover() {
  if (isOpening) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(bookMeshes.map(b => b.group), true);
  let found: BookMesh | null = null;
  if (intersects.length > 0) {
    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj && !obj.userData.bookId) obj = obj.parent;
    if (obj) found = bookMeshes.find(b => b.group === obj) || null;
  }
  if (found !== hoveredBook) {
    hoveredBook = found;
    if (found) {
      tooltip.textContent = found.def.locked ? `${found.def.title} — Coming Soon` : `${found.def.title} — ${found.def.author}`;
      tooltip.classList.add("visible");
      renderer.domElement.style.cursor = found.def.locked ? "default" : "pointer";
    } else {
      tooltip.classList.remove("visible");
      renderer.domElement.style.cursor = "default";
    }
  }
}

// ══════════════════════════════════════════════════════
//  BOOK OPEN ANIMATION
// ══════════════════════════════════════════════════════
const ANIM_DURATION = 2.5;

function startOpenBook(bm: BookMesh) {
  isOpening = true;
  openingBook = bm;
  openProgress = 0;
  controls.autoRotate = false;
  controls.enabled = false;
  tooltip.classList.remove("visible");
  header.style.opacity = "0";
  hint.style.opacity = "0";
  renderer.domElement.style.cursor = "default";
  cameraStartPos.copy(camera.position);
  cameraStartTarget.copy(controls.target);
}

function curlPage(pp: PagePivot, flipT: number) {
  const pos = pp.sheet.geometry.attributes.position;
  const arr = pos.array as Float32Array;
  const rest = pp.restPositions;
  if (flipT <= 0) {
    arr.set(rest);
    pos.needsUpdate = true;
    pp.sheet.geometry.computeVertexNormals();
    return;
  }
  const eased = easeOutCubic(flipT);
  const totalAngle = -Math.PI * 0.93 * eased;
  const curlStrength = Math.sin(flipT * Math.PI) * 0.4;
  const pw = W - 0.02;
  for (let v = 0, n = pos.count; v < n; v++) {
    const rx = rest[v * 3];
    const ry = rest[v * 3 + 1];
    const frac = Math.max(0, Math.min(rx / pw, 1));
    const angle = totalAngle * frac;
    const radius = rx;
    const lift = curlStrength * frac * Math.sin(frac * Math.PI) * 0.25;
    arr[v * 3]     = radius * Math.cos(angle);
    arr[v * 3 + 1] = ry + lift;
    arr[v * 3 + 2] = -radius * Math.sin(angle);
  }
  pos.needsUpdate = true;
  pp.sheet.geometry.computeVertexNormals();
}

function updateBookOpen(dt: number) {
  if (!isOpening || !openingBook) return;
  openProgress += dt / ANIM_DURATION;
  const t = Math.min(openProgress, 1);
  const bm = openingBook;
  const root = bm.group;
  const bp = root.position;

  const riseT = easeOutCubic(smoothClamp(t, 0, 0.12));
  root.position.y = bm.savedPosition.y + riseT * 0.8;
  root.rotation.x = bm.savedRotation.x + riseT * (-Math.PI * 0.3);

  const coverT = easeOutCubic(smoothClamp(t, 0.08, 0.20));
  bm.coverPivot.rotation.y = coverT * (-Math.PI);

  const pageT = smoothClamp(t, 0.15, 0.45);
  const pagesToFlip = Math.floor(PAGE_COUNT * 0.55);
  for (let i = 0; i < bm.pagePivots.length; i++) {
    const pp = bm.pagePivots[i];
    if (i >= pagesToFlip) { curlPage(pp, 0); continue; }
    const normalized = i / pagesToFlip;
    const localT = Math.max(0, Math.min((pageT - normalized * 0.6) * 3.0, 1));
    curlPage(pp, localT);
  }

  const glowT = smoothClamp(t, 0.30, 0.75);
  portalLight.intensity = easeInOutCubic(glowT) * 30;
  portalLight.position.set(bp.x, bp.y + 0.4, bp.z + 0.15);

  const zoomT = easeInOutCubic(smoothClamp(t, 0.20, 0.75));
  const divePos = new THREE.Vector3(bp.x, bp.y + 0.5, bp.z + 0.6);
  const diveLook = new THREE.Vector3(bp.x, bp.y + 0.1, bp.z - 0.2);
  camera.position.lerpVectors(cameraStartPos, divePos, zoomT);
  controls.target.lerpVectors(cameraStartTarget, diveLook, zoomT);

  const fadeT = smoothClamp(t, 0.70, 1.0);
  if (fadeT > 0) {
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.transition = "none";
    loadingOverlay.style.opacity = String(easeInOutCubic(fadeT));
  }

  if (t >= 1.0) {
    isOpening = false;
    portalLight.intensity = 0;
    if (bm.def.isOzBook) {
      enterOzMap();
    } else {
      enterScene(bm.def);
    }
  }
}

// ══════════════════════════════════════════════════════
//  OZ MAP
// ══════════════════════════════════════════════════════

async function enterOzMap() {
  ozActive = true;
  libraryGroup.visible = false;
  header.style.display = "none";
  hint.style.display = "none";

  loadingOverlay.style.display = "none";
  loadingOverlay.style.opacity = "0";

  // Fetch Marble-generated splat URLs from backend (from generated_oz_worlds.json)
  try {
    const res = await fetch(`${API_BASE}/api/worlds`);
    if (res.ok) {
      const data = await res.json();
      const worlds = data.worlds || [];
      ozSplatUrls = {};
      worlds.forEach((w: { id?: string; splat_urls?: { spz_500k?: string; spz_100k?: string } }) => {
        if (w.id && w.splat_urls) {
          ozSplatUrls[w.id] = {
            spz_500k: w.splat_urls.spz_500k,
            spz_100k: w.splat_urls.spz_100k,
          };
        }
      });
    }
  } catch (_) {
    // Backend not running or CORS; keep ozSplatUrls empty, use placeholders
  }

  buildOzMap();
  ozMapOverlay.style.display = "flex";
}

function buildOzMap() {
  ozMapGrid.innerHTML = "";

  // Quadrant backgrounds — pointer-events: none so they never block clicks
  const quadrants = [
    { color: "rgba(123,63,160,0.15)", label: "Gillikin Country (North)", lColor: "#9B59B6",
      pos: "top:0;left:20%;width:60%;height:28%;border-radius:12px",
      lPos: "top:4px;left:50%;transform:translateX(-50%)" },
    { color: "rgba(74,144,217,0.15)", label: "Munchkin Country (East)", lColor: "#5DADE2",
      pos: "top:28%;right:0;width:35%;height:34%;border-radius:12px",
      lPos: "top:4px;right:8px;text-align:right" },
    { color: "rgba(241,196,15,0.15)", label: "Winkie Country (West)", lColor: "#F4D03F",
      pos: "top:28%;left:0;width:35%;height:34%;border-radius:12px",
      lPos: "top:4px;left:8px" },
    { color: "rgba(46,204,113,0.12)", label: "Emerald City (Center)", lColor: "#2ECC71",
      pos: "top:30%;left:36%;width:28%;height:30%;border-radius:12px",
      lPos: "top:4px;left:50%;transform:translateX(-50%);white-space:nowrap" },
    { color: "rgba(231,76,60,0.15)", label: "Quadling Country (South)", lColor: "#E74C3C",
      pos: "bottom:0;left:20%;width:60%;height:28%;border-radius:12px",
      lPos: "bottom:4px;left:50%;transform:translateX(-50%)" },
  ];

  quadrants.forEach(q => {
    const div = document.createElement("div");
    div.className = "oz-quadrant";
    div.style.cssText = `${q.pos};background:${q.color};`;
    ozMapGrid.appendChild(div);

    const label = document.createElement("div");
    label.className = "oz-quadrant-label";
    label.style.cssText = `${q.lPos};color:${q.lColor};`;
    label.textContent = q.label;
    ozMapGrid.appendChild(label);
  });

  const progress = getProgress();

  OZ_WORLDS.forEach((world) => {
    const node = document.createElement("div");
    node.className = "oz-world-node";
    const unlocked = isWorldUnlocked(world.id);
    if (!unlocked) node.classList.add("locked");

    node.style.left = `${world.mapPosition[0]}%`;
    node.style.top = `${world.mapPosition[1]}%`;

    const wp = progress.find(p => p.worldId === world.id);
    const stars = wp ? wp.stars : 0;

    const lockIcon = unlocked ? "" : '<div style="font-size:10px;opacity:0.6;margin-top:2px">🔒</div>';

    node.innerHTML = `
      <div class="oz-node-circle" style="background:${world.biomeColor}">
        ${world.badge.emoji}
        ${stars > 0 ? `<span class="oz-node-stars">${"★".repeat(stars)}</span>` : ""}
      </div>
      <div class="oz-node-label">${world.name}</div>
      <div class="oz-node-topic">${world.stemTitle}</div>
      ${lockIcon}
    `;
    node.dataset.worldId = world.id;

    if (unlocked) {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        showWorldIntro(world);
      });
    }

    ozMapGrid.appendChild(node);
  });

  const totalStars = getTotalStars();
  const worldsDone = progress.filter(p => p.completed).length;
  document.getElementById("oz-total-stars")!.innerHTML = `⭐ ${totalStars} stars`;
  document.getElementById("oz-worlds-done")!.innerHTML = `🗺️ ${worldsDone}/${OZ_WORLDS.length} worlds`;

  const badgeShelf = document.getElementById("oz-badge-shelf")!;
  badgeShelf.innerHTML = "";
  OZ_WORLDS.forEach((w) => {
    const earned = progress.some(p => p.worldId === w.id && p.completed);
    const badge = document.createElement("div");
    badge.className = `oz-badge${earned ? " earned" : ""}`;
    badge.textContent = earned ? w.badge.emoji : "?";
    badge.title = earned ? w.badge.name : "Locked";
    badgeShelf.appendChild(badge);
  });
}

// ══════════════════════════════════════════════════════
//  NARRATION (ElevenLabs via backend)
// ══════════════════════════════════════════════════════

function updateNarrationUI(status: "idle" | "loading" | "playing" | "paused" | "muted" | "error") {
  const playBtn = document.getElementById("narration-play-pause");
  const muteBtn = document.getElementById("narration-mute");
  const statusEl = document.getElementById("narration-status");
  if (playBtn) playBtn.textContent = status === "playing" ? "⏸ Pause" : "▶ Play";
  if (muteBtn) muteBtn.textContent = ozNarrationMuted ? "🔇" : "🔊";
  if (statusEl)
    statusEl.textContent =
      status === "loading"
        ? "Loading…"
        : status === "playing"
          ? "Listening…"
          : status === "paused"
            ? "Paused"
            : status === "muted"
              ? "Muted"
              : status === "error"
                ? "Unavailable"
                : "";
  // Sync HUD narration buttons (visible when in world)
  const hudPlay = document.getElementById("oz-hud-narration-play");
  const hudMute = document.getElementById("oz-hud-narration-mute");
  if (hudPlay) hudPlay.textContent = status === "playing" ? "⏸ Pause" : "▶ Listen";
  if (hudMute) hudMute.textContent = ozNarrationMuted ? "🔇" : "🔊";
}

function stopOzNarration() {
  if (ozNarrationAudio) {
    ozNarrationAudio.pause();
    ozNarrationAudio.currentTime = 0;
    ozNarrationAudio = null;
  }
  updateNarrationUI("idle");
}

async function playOzNarration(world: OzWorld) {
  stopOzNarration();
  const text = `${world.storySummary}\n\n${world.scienceIntro}`.trim();
  if (!text) return;
  const myId = ++ozNarrationRequestId;
  updateNarrationUI("loading");
  try {
    const res = await fetch(`${API_BASE}/api/narration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (myId !== ozNarrationRequestId) return; // Stale: another narration started
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    if (myId !== ozNarrationRequestId) return; // Stale: discard and don't play
    const url = URL.createObjectURL(blob);
    ozNarrationAudio = new Audio(url);
    ozNarrationAudio.volume = ozNarrationMuted ? 0 : 1;
    ozNarrationAudio.onended = () => {
      URL.revokeObjectURL(url);
      ozNarrationAudio = null;
      updateNarrationUI("idle");
    };
    ozNarrationAudio.onerror = () => {
      URL.revokeObjectURL(url);
      ozNarrationAudio = null;
      updateNarrationUI("error");
    };
    await ozNarrationAudio.play();
    if (myId !== ozNarrationRequestId) {
      stopOzNarration(); // We started an old request; stop it
      return;
    }
    updateNarrationUI(ozNarrationMuted ? "muted" : "playing");
  } catch (e) {
    if (myId !== ozNarrationRequestId) return;
    console.warn("Narration failed:", e);
    updateNarrationUI("error");
  }
}

// ══════════════════════════════════════════════════════
//  WORLD INTRO
// ══════════════════════════════════════════════════════

function closeIntroOverlay(showMap = false) {
  ozIntroOverlay.style.display = "none";
  // Don't stop narration — user can control it from HUD when in world
  if (showMap) ozMapOverlay.style.display = "flex";
}

function showWorldIntro(world: OzWorld) {
  currentOzWorld = world;
  ozIntroOverlay.style.display = "flex";

  document.getElementById("intro-icon")!.textContent = world.badge.emoji;
  document.getElementById("intro-title")!.textContent = world.name;

  const stemBadge = document.getElementById("intro-stem-badge")!;
  stemBadge.textContent = world.stemTopic;
  stemBadge.style.background = `${world.biomeColor}33`;
  stemBadge.style.color = world.biomeColor;
  stemBadge.style.border = `1px solid ${world.biomeColor}66`;

  document.getElementById("intro-story")!.textContent = world.storySummary;
  document.getElementById("intro-science")!.textContent = world.scienceIntro;

  // Don't auto-start — user clicks Play when ready
  updateNarrationUI("idle");

  const enterBtn = document.getElementById("intro-enter-btn")! as HTMLButtonElement;
  enterBtn.style.background = `linear-gradient(135deg, ${world.biomeColor}, ${world.biomeColor}cc)`;
  enterBtn.onclick = () => {
    closeIntroOverlay();
    ozMapOverlay.style.display = "none";
    enterOzWorld(world);
  };
}

// ══════════════════════════════════════════════════════
//  OZ WORLD (3D Scene)
// ══════════════════════════════════════════════════════

function enterOzWorld(world: OzWorld) {
  currentOzWorld = world;
  ozFoundObjects = new Set();

  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";

  scene.fog = new THREE.FogExp2(0x87ceeb, 0.015); // Soft sky-blue fog for kids
  scene.background = new THREE.Color(0x87ceeb);   // Kid-friendly sky blue

  // Prefer Marble-generated splat if available (from /api/worlds); else fallback to oz-data placeholder
  const gen = ozSplatUrls[world.id];
  const splatUrl =
    (gen?.spz_500k || gen?.spz_100k) || world.splatUrl || "./splats/sensai.spz";
  const splat = new SplatMesh({
    url: splatUrl,
    onLoad: () => {
      activeSplat = splat;
      inScene = true;

      controls.enabled = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.minDistance = 0.5;
      controls.maxDistance = 50;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.enablePan = true;
      camera.position.set(0, 1.5, 4);
      controls.target.set(0, 0, 0);

      const amb = new THREE.AmbientLight(0xffffff, 1.5);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(5, 10, 5);
      scene.add(amb);
      scene.add(dirLight);
      activeSceneLights.push(amb, dirLight);

      // Ground and simple environment so scene isn't empty when splat is sparse
      if (ozWorldEnvironment) {
        scene.remove(ozWorldEnvironment);
        ozWorldEnvironment = null;
      }
      const env = new THREE.Group();
      const groundGeo = new THREE.PlaneGeometry(60, 60);
      groundGeo.rotateX(-Math.PI / 2);
      const groundMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(world.biomeColor),
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.position.y = -0.5;
      env.add(ground);
      scene.add(env);
      ozWorldEnvironment = env;

      spawnDiscoveryOrbs(world);
      showOzSceneHud(world);

      if (world.id === "emerald_city") {
        greenSpectaclesBtn.style.display = "block";
      }

      loadingOverlay.style.transition = "opacity 0.8s ease";
      loadingOverlay.style.opacity = "0";
      setTimeout(() => {
        loadingOverlay.style.display = "none";
        loadingOverlay.style.transition = "none";
      }, 900);
    },
  });
  scene.add(splat);
}

function spawnDiscoveryOrbs(world: OzWorld) {
  ozDiscoveryOrbs.forEach(orb => scene.remove(orb));
  ozDiscoveryOrbs = [];

  const discoveryItems = document.getElementById("discovery-items")!;
  discoveryItems.innerHTML = "";
  ozDiscoveryPanel.style.display = "block";

  world.objects.forEach((obj) => {
    const geo = new THREE.SphereGeometry(0.35, 20, 20); // Larger for easier clicking
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(world.biomeColor),
      transparent: true,
      opacity: 0.7,
    });
    const orb = new THREE.Mesh(geo, mat);
    orb.position.set(...obj.position);
    orb.userData.ozObject = obj;
    orb.userData.baseY = obj.position[1];
    scene.add(orb);
    ozDiscoveryOrbs.push(orb);

    const outerGeo = new THREE.SphereGeometry(0.45, 20, 20);
    const outerMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(world.biomeColor),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    orb.add(outer);

    const item = document.createElement("div");
    item.className = "discovery-item";
    item.id = `disc-${obj.id}`;
    item.textContent = obj.emoji;
    item.title = "???";
    discoveryItems.appendChild(item);
  });
}

function checkOrbClick(): boolean {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(ozDiscoveryOrbs, true);
  if (intersects.length > 0) {
    let mesh = intersects[0].object as THREE.Mesh;
    while (mesh && !mesh.userData?.ozObject) mesh = mesh.parent as THREE.Mesh;
    const obj = mesh?.userData?.ozObject as OzObject | undefined;
    if (obj && !ozFoundObjects.has(obj.id)) {
      ozFoundObjects.add(obj.id);
      showObjectPopup(obj);
      markOrbFound(mesh, obj);
      updateHudFound();
      return true;
    }
    return true; // Hit orb (even if already found)
  }
  return false;
}

function markOrbFound(orb: THREE.Mesh, obj: OzObject) {
  (orb.material as THREE.MeshBasicMaterial).opacity = 0.2;
  const discItem = document.getElementById(`disc-${obj.id}`);
  if (discItem) {
    discItem.classList.add("found");
    discItem.title = obj.name;
  }
}

function showObjectPopup(obj: OzObject) {
  document.getElementById("popup-emoji")!.textContent = obj.emoji;
  document.getElementById("popup-name")!.textContent = obj.name;
  document.getElementById("popup-fact")!.textContent = obj.fact;
  document.getElementById("popup-stem")!.textContent = `🔬 ${obj.stemConnection}`;
  ozObjectPopup.style.display = "block";
}

document.getElementById("popup-close")!.addEventListener("click", () => {
  ozObjectPopup.style.display = "none";
});

// Narration controls
document.getElementById("narration-play-pause")?.addEventListener("click", () => {
  if (ozNarrationAudio) {
    if (ozNarrationAudio.paused) {
      ozNarrationAudio.play();
      updateNarrationUI(ozNarrationMuted ? "muted" : "playing");
    } else {
      ozNarrationAudio.pause();
      updateNarrationUI("paused");
    }
  } else if (currentOzWorld) {
    playOzNarration(currentOzWorld);
  }
});
document.getElementById("narration-mute")?.addEventListener("click", () => {
  ozNarrationMuted = !ozNarrationMuted;
  if (ozNarrationAudio) ozNarrationAudio.volume = ozNarrationMuted ? 0 : 1;
  const status = ozNarrationAudio?.paused ? "paused" : ozNarrationMuted ? "muted" : "playing";
  updateNarrationUI(status);
});
document.getElementById("intro-back-btn")?.addEventListener("click", () => {
  closeIntroOverlay();
  ozMapOverlay.style.display = "flex";
});

function showOzSceneHud(world: OzWorld) {
  ozSceneHud.style.display = "flex";
  document.getElementById("oz-hud-title")!.textContent = world.name;
  document.getElementById("oz-hud-stem")!.textContent = world.stemTopic;
  updateHudFound();
}

function updateHudFound() {
  if (!currentOzWorld) return;
  const total = currentOzWorld.objects.length;
  const found = ozFoundObjects.size;
  document.getElementById("oz-hud-found")!.textContent =
    found === total
      ? `All ${total} objects discovered!`
      : `${found}/${total} objects found — click glowing orbs!`;
}

document.getElementById("oz-hud-back")!.addEventListener("click", () => {
  exitOzWorld();
});

document.getElementById("oz-hud-quiz")!.addEventListener("click", () => {
  if (currentOzWorld) startQuiz(currentOzWorld);
});

function exitOzWorld() {
  if (activeSplat) { scene.remove(activeSplat); activeSplat.dispose(); activeSplat = null; }
  if (ozWorldEnvironment) {
    scene.remove(ozWorldEnvironment);
    ozWorldEnvironment = null;
  }
  ozDiscoveryOrbs.forEach(orb => scene.remove(orb));
  ozDiscoveryOrbs = [];
  activeSceneLights.forEach(l => scene.remove(l));
  activeSceneLights.length = 0;
  inScene = false;

  ozSceneHud.style.display = "none";
  ozDiscoveryPanel.style.display = "none";
  ozObjectPopup.style.display = "none";
  greenSpectaclesBtn.style.display = "none";
  greenFilter.style.display = "none";
  greenFilterOn = false;

  scene.fog = null;
  scene.background = new THREE.Color(0x000000);

  buildOzMap();
  ozMapOverlay.style.display = "flex";
}

// ══════════════════════════════════════════════════════
//  GREEN SPECTACLES (Emerald City)
// ══════════════════════════════════════════════════════

greenSpectaclesBtn.addEventListener("click", () => {
  greenFilterOn = !greenFilterOn;
  greenFilter.style.display = greenFilterOn ? "block" : "none";
  greenSpectaclesBtn.textContent = greenFilterOn
    ? "Remove Green Spectacles"
    : "Put on Green Spectacles";
});

// ══════════════════════════════════════════════════════
//  QUIZ SYSTEM
// ══════════════════════════════════════════════════════

let quizWorldId = "";
let quizQuestions: OzWorld["quiz"] = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function startQuiz(world: OzWorld) {
  quizWorldId = world.id;
  quizQuestions = [...world.quiz];
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;

  ozQuizOverlay.style.display = "flex";
  document.getElementById("quiz-results")!.style.display = "none";
  document.getElementById("quiz-container")!.style.display = "block";

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizQuestions[quizIndex];
  quizAnswered = false;

  const progressEl = document.getElementById("quiz-progress")!;
  progressEl.innerHTML = quizQuestions.map((_, i) => {
    let cls = "quiz-dot";
    if (i === quizIndex) cls += " active";
    return `<div class="${cls}" id="qdot-${i}"></div>`;
  }).join("");

  document.getElementById("quiz-question")!.textContent = q.question;

  const optionsEl = document.getElementById("quiz-options")!;
  optionsEl.innerHTML = q.options.map((opt, i) =>
    `<button class="quiz-option" data-idx="${i}">${opt}</button>`
  ).join("");

  document.getElementById("quiz-explanation")!.style.display = "none";
  document.getElementById("quiz-next-btn")!.style.display = "none";

  optionsEl.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => handleQuizAnswer(parseInt((btn as HTMLElement).dataset.idx!)));
  });
}

function handleQuizAnswer(idx: number) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = quizQuestions[quizIndex];
  const correct = idx === q.correctIndex;
  if (correct) quizScore++;

  const options = document.querySelectorAll(".quiz-option");
  options.forEach((opt, i) => {
    if (i === q.correctIndex) opt.classList.add("correct-answer");
    if (i === idx && !correct) opt.classList.add("wrong-answer");
    (opt as HTMLButtonElement).style.pointerEvents = "none";
  });

  const dot = document.getElementById(`qdot-${quizIndex}`);
  if (dot) {
    dot.classList.remove("active");
    dot.classList.add(correct ? "correct" : "wrong");
  }

  const explEl = document.getElementById("quiz-explanation")!;
  explEl.textContent = q.explanation;
  explEl.style.display = "block";
  explEl.style.borderLeftColor = correct ? "#2ecc71" : "#e74c3c";

  const nextBtn = document.getElementById("quiz-next-btn")! as HTMLButtonElement;
  nextBtn.style.display = "block";
  nextBtn.textContent = quizIndex < quizQuestions.length - 1 ? "Next Question" : "See Results";
}

document.getElementById("quiz-next-btn")!.addEventListener("click", () => {
  quizIndex++;
  if (quizIndex < quizQuestions.length) {
    renderQuizQuestion();
  } else {
    showQuizResults();
  }
});

function showQuizResults() {
  document.getElementById("quiz-container")!.style.display = "none";
  const resultsEl = document.getElementById("quiz-results")!;
  resultsEl.style.display = "block";

  const total = quizQuestions.length;
  const pct = quizScore / total;
  let stars = 0;
  if (pct >= 0.25) stars = 1;
  if (pct >= 0.5) stars = 2;
  if (pct >= 0.75) stars = 3;
  if (pct === 1) stars = 4;

  document.getElementById("results-stars")!.textContent = "⭐".repeat(stars) + "☆".repeat(4 - stars);

  const titles = ["Keep Exploring!", "Good Start!", "Great Work!", "Amazing!", "Perfect Score!"];
  document.getElementById("results-title")!.textContent = titles[stars];
  document.getElementById("results-score")!.textContent = `${quizScore} out of ${total} correct`;

  const world = getWorldById(quizWorldId);
  if (world && stars > 0) {
    saveWorldProgress(quizWorldId, stars);
    document.getElementById("results-badge")!.textContent =
      `${world.badge.emoji} Badge earned: ${world.badge.name}!`;
  } else {
    document.getElementById("results-badge")!.textContent = "Try again to earn the badge!";
  }
}

document.getElementById("results-back-btn")!.addEventListener("click", () => {
  ozQuizOverlay.style.display = "none";
  exitOzWorld();
});

document.getElementById("quiz-exit-btn")!.addEventListener("click", () => {
  ozQuizOverlay.style.display = "none";
});

// ══════════════════════════════════════════════════════
//  STANDARD SCENE (non-Oz books)
// ══════════════════════════════════════════════════════

function enterScene(def: BookDef) {
  header.style.display = "none";
  hint.style.display = "none";
  sceneInfo.style.display = "block";
  sceneTitleEl.textContent = def.sceneTitle;
  sceneSubtitleEl.textContent = def.sceneSubtitle;

  libraryGroup.visible = false;
  scene.fog = null;
  scene.background = new THREE.Color(0x000000);

  if (def.splatUrl) {
    const splat = new SplatMesh({
      url: def.splatUrl,
      onLoad: () => {
        activeSplat = splat;
        inScene = true;

        controls.enabled = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.minDistance = 0.5;
        controls.maxDistance = 50;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.enablePan = true;
        camera.position.set(0, 1.5, 4);
        controls.target.set(0, 0, 0);

        loadingOverlay.style.transition = "opacity 0.8s ease";
        loadingOverlay.style.opacity = "0";
        setTimeout(() => {
          loadingOverlay.style.display = "none";
          loadingOverlay.style.transition = "none";
        }, 900);
      },
    });
    scene.add(splat);

    if (def.modelUrl) {
      const amb = new THREE.AmbientLight(0xffffff, 1.5);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(5, 10, 5);
      scene.add(amb);
      scene.add(dirLight);
      activeSceneLights.push(amb, dirLight);

      const setupModel = (model: THREE.Group) => {
        const box = new THREE.Box3().setFromObject(model);
        const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
        const s = (def.modelScale ?? 1.7) / maxDim;
        model.scale.multiplyScalar(s);
        box.setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x, -box.min.y, -c.z);
        scene.add(model);
        activeModel = model;
        modelSpawnPos.copy(model.position);
        modelSpawnRot = model.rotation.y;
        activeAnimMixer = new THREE.AnimationMixer(model);
        activeAnimActions.clear();
        currentAction = null;
        controls.autoRotate = false;
        if (def.extraAnims && def.extraAnims.length > 0) {
          def.extraAnims.forEach((ad) => {
            fbxLoader.load(ad.url, (animFbx) => {
              if (animFbx.animations.length > 0 && activeAnimMixer) {
                const action = activeAnimMixer.clipAction(animFbx.animations[0]);
                action.play();
                action.paused = true;
                activeAnimActions.set(ad.name, action);
                if (!currentAction) currentAction = action;
              }
            });
          });
        }
      };
      const isFbx = def.modelUrl.toLowerCase().endsWith(".fbx");
      if (isFbx) fbxLoader.load(def.modelUrl, setupModel);
      else gltfLoader.load(def.modelUrl, (gltf) => setupModel(gltf.scene));
    }
  } else {
    inScene = true;
    setTimeout(() => {
      loadingOverlay.style.transition = "opacity 0.6s ease";
      loadingOverlay.style.opacity = "0";
      setTimeout(() => {
        loadingOverlay.style.display = "none";
        loadingOverlay.style.transition = "none";
      }, 700);
    }, 500);
  }
}

function resetToLibrary() {
  stopOzNarration();
  if (activeSplat) { scene.remove(activeSplat); activeSplat.dispose(); activeSplat = null; }
  if (activeModel) { scene.remove(activeModel); activeModel = null; }
  if (activeAnimMixer) { activeAnimMixer.stopAllAction(); activeAnimMixer = null; }
  activeAnimActions.clear();
  currentAction = null;
  activeSceneLights.forEach(l => scene.remove(l));
  activeSceneLights.length = 0;
  ozDiscoveryOrbs.forEach(orb => scene.remove(orb));
  ozDiscoveryOrbs = [];
  inScene = false;
  ozActive = false;
  currentOzWorld = null;

  loadingOverlay.style.display = "none";
  loadingOverlay.style.opacity = "0";
  loadingOverlay.style.transition = "none";
  sceneInfo.style.display = "none";
  ozMapOverlay.style.display = "none";
  ozIntroOverlay.style.display = "none";
  ozSceneHud.style.display = "none";
  ozDiscoveryPanel.style.display = "none";
  ozObjectPopup.style.display = "none";
  ozQuizOverlay.style.display = "none";
  greenSpectaclesBtn.style.display = "none";
  greenFilter.style.display = "none";
  greenFilterOn = false;
  header.style.display = "block";
  header.style.opacity = "1";
  hint.style.display = "block";
  hint.style.opacity = "1";

  libraryGroup.visible = true;
  scene.fog = new THREE.FogExp2(0x2a3a52, 0.018);
  scene.background = null;

  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.enabled = true;
  controls.minDistance = 4;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.enablePan = false;

  if (openingBook) {
    openingBook.coverPivot.rotation.y = 0;
    openingBook.pagePivots.forEach(pp => curlPage(pp, 0));
    openingBook.group.position.copy(openingBook.savedPosition);
    openingBook.group.rotation.copy(openingBook.savedRotation);
    openingBook = null;
  }
  camera.position.set(0, 2.5, 7);
  controls.target.set(0, 1.2, 0);
}

backBtn.addEventListener("click", resetToLibrary);
ozMapBack.addEventListener("click", resetToLibrary);

 // ── WebXR (Pico VR, Quest, etc.) ──
if (vrBtn) {
  if (!("xr" in navigator)) {
    vrBtn.textContent = "VR not supported";
    vrBtn.classList.add("unsupported");
    vrBtn.disabled = true;
  } else {
    vrBtn.addEventListener("click", async () => {
      if (renderer.xr.isPresenting) {
        const session = renderer.xr.getSession();
        if (session) await session.end();
        return;
      }
      try {
        const session = await navigator.xr!.requestSession("immersive-vr", {
          optionalFeatures: ["local-floor"],
        });
        await renderer.xr.setSession(session);
        vrBtn.textContent = "Exit VR";
        vrBtn.classList.add("vr-active");
        session.addEventListener("end", () => {
          vrBtn.textContent = "🥽 Enter VR";
          vrBtn.classList.remove("vr-active");
          if (!isOpening) controls.enabled = true;
        });
      } catch (e) {
        console.warn("WebXR session failed:", e);
      }
    });
  }
}

// ── Easing helpers ──
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function smoothClamp(t: number, start: number, end: number) {
  return Math.max(0, Math.min((t - start) / (end - start), 1));
}

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();
  const inVR = renderer.xr.isPresenting;

  if (inVR) {
    controls.enabled = false;
  }

  bookMeshes.forEach((b, i) => {
    if (b === openingBook) return;
    const baseY = b.group.userData.hoverY as number;
    const isHovered = b === hoveredBook && !isOpening;
    const floatY = baseY + Math.sin(t * 0.7 + i * 1.8) * 0.05 + (isHovered ? 0.12 : 0);
    b.group.position.y += (floatY - b.group.position.y) * 0.07;
    const s = isHovered && !b.def.locked ? 1.08 : 1.0;
    b.group.scale.lerp(new THREE.Vector3(s, s, s), 0.07);
  });

  const fp = ffGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < ffCount; i++) {
    const d = ffData[i];
    d.angle += d.speed * 0.003;
    fp.setX(i, Math.cos(d.angle) * d.radius);
    fp.setY(i, d.baseY + Math.sin(t * d.speed + i) * 0.5);
    fp.setZ(i, Math.sin(d.angle) * d.radius);
  }
  fp.needsUpdate = true;
  ffMat.opacity = 0.5 + Math.sin(t * 1.8) * 0.2;

  // Animate discovery orbs (non-cumulative, subtle bobbing)
  ozDiscoveryOrbs.forEach((orb, i) => {
    const baseY = orb.userData.baseY as number ?? orb.position.y;
    orb.position.y = baseY + Math.sin(t * 0.8 + i * 1.2) * 0.04;
    const mat = orb.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.6 + Math.sin(t * 1.2 + i) * 0.15;
    orb.scale.setScalar(1 + Math.sin(t * 1 + i * 0.5) * 0.04);
  });

  if (activeAnimMixer) activeAnimMixer.update(dt);
  if (!inVR) updateCharacterMovement(dt);
  if (activeModel && inScene && !inVR) updateThirdPersonCamera(dt);
  updateBookOpen(dt);
  if (!inScene && !ozActive) checkHover();
  if (!inVR) controls.update();
  spark.render(scene, camera);
}

// ── Resize ──
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Start ──
renderer.setAnimationLoop(animate);
