import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { SplatMesh, SparkRenderer } from "@sparkjsdev/spark";

// ── Book catalog ──
interface AnimDef { name: string; url: string; }
interface PortalDef {
  position: [number, number, number];
  radius: number;
  targetSplatUrl: string;
  targetTitle?: string;
  targetSubtitle?: string;
  /** Optional text for bubble above portal (defaults to targetTitle); ready for LLM integration */
  bubbleText?: string;
  /** Scale factor for character when entering this scene only (e.g. 2 = 2x bigger) */
  targetModelScale?: number;
  /** Position [x, y, z] to place character when entering this scene (e.g. center) */
  targetModelPosition?: [number, number, number];
  /** Scale factor for the splat scene when entering (e.g. 2 = 200% bigger) */
  targetSplatScale?: number;
  /** Additional character models in the portal destination (same scale as player) */
  targetSceneModels?: { url: string; position?: [number, number, number]; rotation?: [number, number, number] }[];
}
interface BookDef {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  splatUrl: string;
  sceneTitle: string;
  sceneSubtitle: string;
  locked?: boolean;
  /** "low" = fewer splats rendered, better FPS for heavy scenes */
  splatQuality?: "low" | "medium" | "high";
  modelUrl?: string;
  modelScale?: number;
  modelPosition?: [number, number, number];
  modelRotation?: [number, number, number];
  extraAnims?: AnimDef[];
  portals?: PortalDef[];
  /** Additional static scene models (e.g. lunar lander on moon) */
  sceneModels?: { url: string; scale?: number; position?: [number, number, number]; rotation?: [number, number, number] }[];
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
    id: "ww2",
    title: "Harry Potter",
    author: "J.K. Rowling",
    coverUrl: "./books/gobletoffire.jpg",
    splatUrl: "./models/HogwartsGreatHall.spz",
    sceneTitle: "The Goblet of Fire",
    sceneSubtitle: "Hogwarts — The Triwizard Tournament",
    locked: false,
    splatQuality: "low",
    modelUrl: "./models/harry.fbx",
    modelScale: 0.25,
    modelRotation: [0, Math.PI, 0], // face backward (into scene)
    portals: [
      {
        position: [3, 0, 2],
        radius: 1.5, // slightly larger so portal is easier to enter
        targetSplatUrl: "./models/GryffindorCommonRoom.spz",
        targetTitle: "Gryffindor Common Room",
        targetSubtitle: "The cozy fireside haven",
        targetModelScale: 8, // Harry much bigger in Gryffindor scene only
        targetModelPosition: [0, 0, 0], // Harry in the middle
        targetSplatScale: 12, // Gryffindor Common Room — large, plenty of space
        targetSceneModels: [
          { url: "./models/hermione.fbx", position: [2, 0, -1.5], rotation: [0, Math.PI / 2, 0] },
          { url: "./models/ronald.fbx", position: [-2, 0, -1.5], rotation: [0, -Math.PI / 2, 0] },
          { url: "./models/dumbledore.fbx", position: [0, 0, -3], rotation: [0, 0, 0] },
        ],
      },
    ],
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
    splatQuality: "low", // reduce splat load for smooth moon performance
    modelUrl: "./models/astronaut_run.fbx",
    modelScale: 0.3,
    modelRotation: [0, Math.PI, 0], // face backward (into scene) so W moves forward
    sceneModels: [
      { url: "./models/lander.fbx", scale: 0.04, position: [5, 0.5, 8], rotation: [0, Math.PI / 4, 0] },
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

// ── Renderer ── (antialias: false = better perf for splats, no visual benefit)
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";

// ── CSS2D for portal labels (text bubbles in 3D space) ──
const css2DRenderer = new CSS2DRenderer();
css2DRenderer.setSize(window.innerWidth, window.innerHeight);
css2DRenderer.domElement.style.position = "absolute";
css2DRenderer.domElement.style.top = "0";
css2DRenderer.domElement.style.left = "0";
css2DRenderer.domElement.style.zIndex = "5"; // above canvas, below UI (10+)
css2DRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(css2DRenderer.domElement);

// ── Scene ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a3a52, 0.018);

const spark = new SparkRenderer({
  renderer,
  enableLod: true,
  lodSplatCount: 800000,
  lodSplatScale: 1.0,
});
scene.add(spark);

const DEFAULT_PIXEL_RATIO = Math.min(window.devicePixelRatio, 2);

function applySplatQuality(q: "low" | "medium" | "high" | undefined) {
  renderer.shadowMap.enabled = false; // splats don't use shadows
  if (q === "low") {
    spark.enableLod = true;
    spark.lodSplatCount = 80000;
    spark.lodSplatScale = 0.5;
    renderer.setPixelRatio(1);
  } else if (q === "medium") {
    spark.enableLod = true;
    spark.lodSplatCount = 400000;
    spark.lodSplatScale = 0.8;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  } else {
    spark.enableLod = true;
    spark.lodSplatCount = 800000;
    spark.lodSplatScale = 1.0;
    renderer.setPixelRatio(DEFAULT_PIXEL_RATIO);
  }
}

function restoreSplatQuality() {
  spark.enableLod = true;
  spark.lodSplatCount = 800000;
  spark.lodSplatScale = 1.0;
  renderer.setPixelRatio(DEFAULT_PIXEL_RATIO);
  renderer.shadowMap.enabled = true;
}

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

// ── Library world (everything toggled off when viewing a splat scene) ──
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

// ── Ground ── (64×64 = fewer vertices, faster)
const groundGeo = new THREE.PlaneGeometry(120, 120, 64, 64);
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

// ── Glow light that intensifies when book opens ──
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

  const leatherColor = def.locked ? 0x444455 : 0x3a2215;
  const coverMat = new THREE.MeshStandardMaterial({ color: leatherColor, roughness: 0.65, metalness: 0.05 });
  const innerCoverMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
  const pageFaceMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e5, roughness: 0.92 });
  const pageEdgeMat = new THREE.MeshStandardMaterial({ color: 0xe0d8c8, roughness: 0.85 });

  // Back cover
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, COVER_T),
    [coverMat, coverMat, coverMat, coverMat, innerCoverMat, coverMat],
  );
  back.position.z = -DEPTH / 2 + COVER_T / 2;
  root.add(back);

  // Spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(COVER_T * 2, H, DEPTH + COVER_T), coverMat);
  spine.position.x = -W / 2 - COVER_T * 0.5;
  root.add(spine);

  // Gold spine accents
  const goldMat = new THREE.MeshBasicMaterial({ color: 0xd4a44a });
  for (let s = 0; s < 3; s++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.012, H * 0.55), goldMat);
    strip.position.set(-W / 2 - COVER_T * 1.51, 0, -DEPTH * 0.2 + s * DEPTH * 0.2);
    strip.rotation.y = Math.PI / 2;
    root.add(strip);
  }

  // Page block (visible edge of closed pages)
  const blockDepth = DEPTH - COVER_T * 2 - 0.006;
  const pageBlock = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.03, H - 0.04, blockDepth),
    pageEdgeMat,
  );
  pageBlock.position.z = 0;
  root.add(pageBlock);

  // Flippable pages — PlaneGeometry grid so vertices can curl
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

  // Front cover on pivot
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

  // Position in arc — modest spread
  const spread = 3.5;
  const arcRadians = Math.PI * 0.4;
  const angleStep = arcRadians / Math.max(total - 1, 1);
  const startAngle = -arcRadians / 2;
  const angle = startAngle + index * angleStep;

  root.position.set(Math.sin(angle) * spread, H / 2 + 0.12, -Math.cos(angle) * spread + 2);
  root.lookAt(new THREE.Vector3(0, H / 2, 8));
  root.rotation.x = -0.03;
  root.userData.bookId = def.id;
  root.userData.hoverY = root.position.y;

  const savedPosition = root.position.clone();
  const savedRotation = root.rotation.clone();

  // Pedestal + glow
  const glow = new THREE.PointLight(def.locked ? 0x667788 : 0xddccaa, 2.0, 4, 1.5);
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
const activeSceneModels: THREE.Object3D[] = [];
const activePortals: { def: PortalDef; mesh: THREE.Group }[] = [];
let inScene = false;
let currentBookDef: BookDef | null = null;
let isInPortalDestination = false; // true when in Gryffindor — cannot go back to previous chapter
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

function createPortalMesh(portal: PortalDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...portal.position);
  // Simplified geometry for performance (fewer segments)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(portal.radius, 0.06, 8, 16),
    new THREE.MeshBasicMaterial({
      color: 0x4499ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(portal.radius * 0.4, portal.radius * 0.9, 16),
    new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);

  // Text bubble above portal (clean, minimal; ready for LLM content)
  const bubbleText = portal.bubbleText ?? portal.targetTitle ?? "Enter";
  const bubbleEl = document.createElement("div");
  bubbleEl.className = "portal-bubble";
  bubbleEl.textContent = bubbleText;
  const bubbleLabel = new CSS2DObject(bubbleEl);
  bubbleLabel.position.set(0, portal.radius + 1.0, 0);
  group.add(bubbleLabel);

  return group;
}

// ── Character controls ──
const keys: Record<string, boolean> = {};
const BASE_SPEED = 1.2;
const SPRINT_MULT = 2.5;
const TURN_SPEED = 6.0;
const CAM_OFFSET = new THREE.Vector3(0, 1.4, 3.0);
const CAM_LOOK_OFFSET = new THREE.Vector3(0, 0.8, 0);
const DEFAULT_FOV = 50;
const CAMERA_INTRO_DURATION = 0.8; // fast revolve from front to back
let modelSpawnPos = new THREE.Vector3();
let modelSpawnRot = 0;
let cameraIntroProgress = 1; // 1 = done, 0 = starting (camera in front)

// Ensure canvas can receive focus for WASD
renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (e.key === " ") keys["space"] = true;
  if (e.shiftKey) keys["shift"] = true;

  // When in scene with character, prevent browser defaults (Space=scroll, Enter=activate focused button)
  if (inScene && activeModel && ["w", "a", "s", "d", "e", "q", " ", "enter"].includes(k)) {
    e.preventDefault();
  }
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
  if (cameraIntroProgress < 1) return; // no movement until camera revolved to back

  // W=forward, S=backward, A=left, D=right | E/Space=up, Q=down
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
    const wasPaused = currentAction.paused;
    currentAction.paused = !isMoving;
    if (isMoving) {
      if (wasPaused) currentAction.play();
      currentAction.timeScale = sprinting ? 2.0 : 1.0;
    } else {
      currentAction.timeScale = 1.0;
      if (!wasPaused) currentAction.reset(); // return to standing pose
    }
  }

  if (vertDir !== 0) {
    activeModel.position.y += vertDir * speed * dt;
  }

  if (moveDir.lengthSq() === 0) return;
  moveDir.normalize();

  // Camera-relative: W=into scene (forward), S=back, A=left, D=right
  const camForward = new THREE.Vector3();
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  camForward.normalize();
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

let transitioningToSplat = false;

function updatePortalCheck() {
  if (!activeModel || !inScene || activePortals.length === 0 || transitioningToSplat || isInPortalDestination) return;
  const pos = activeModel.position;
  for (const { def } of activePortals) {
    const dx = pos.x - def.position[0], dz = pos.z - def.position[2];
    const dist2D = Math.sqrt(dx * dx + dz * dz);
    // Use 2D distance only; Y check was too strict (portal at floor level)
    if (dist2D < def.radius) {
      transitionToSplat(def);
      return;
    }
  }
}

function transitionToSplat(portal: PortalDef) {
  transitioningToSplat = true;
  isInPortalDestination = true; // block return immediately (even during load)
  backBtn.style.display = "none";
  backBtn.style.pointerEvents = "none";
  backBtn.style.visibility = "hidden";
  sceneInfo.style.pointerEvents = "none";

  loadingOverlay.style.display = "flex";
  loadingOverlay.style.transition = "none";
  loadingOverlay.style.opacity = "1";
  const loadingText = loadingOverlay.querySelector("h2");
  if (loadingText) loadingText.textContent = portal.targetTitle || "Entering...";

  // Remove and dispose old room assets completely
  if (activeSplat) {
    scene.remove(activeSplat);
    activeSplat.dispose();
    activeSplat = null;
  }
  activePortals.forEach(({ mesh }) => {
    scene.remove(mesh);
    // Dispose portal geometries, materials, and clean up CSS2D labels
    mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
      if ("element" in obj && obj.element instanceof HTMLElement) {
        obj.element.remove();
      }
    });
  });
  activePortals.length = 0;

  // Apply low quality for portal destination (also a heavy splat)
  spark.lodSplatCount = 80000;
  spark.lodSplatScale = 0.5;
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;

  const newSplat = new SplatMesh({
    url: portal.targetSplatUrl,
    maxSplats: 150000,
    onLoad: () => {
      // Only add to scene after load — ensures prev room is fully gone, no overlap
      scene.add(newSplat);
      activeSplat = newSplat;
      transitioningToSplat = false;
      if (portal.targetSplatScale != null) {
        const s = portal.targetSplatScale;
        newSplat.scale.set(s, s, s);
      }
      if (activeModel) {
        if (portal.targetModelScale != null) {
          activeModel.scale.multiplyScalar(portal.targetModelScale);
        }
        if (portal.targetModelPosition) {
          activeModel.position.set(...portal.targetModelPosition);
        }
      }

      // Load Hermione, Ron, Dumbledore in common room — same scale as Harry
      const playerScale = (currentBookDef?.modelScale ?? 0.25) * (portal.targetModelScale ?? 1);
      let harryHeight = 0;
      if (activeModel) {
        const harryBox = new THREE.Box3().setFromObject(activeModel);
        harryHeight = harryBox.max.y - harryBox.min.y;
      }
      if (portal.targetSceneModels?.length && harryHeight > 0) {
        activeSceneModels.length = 0;
        portal.targetSceneModels.forEach((sm) => {
          const isFbx = sm.url.toLowerCase().endsWith(".fbx");
          const loader = isFbx ? fbxLoader : gltfLoader;
          loader.load(
            sm.url,
            (result: THREE.Group | { scene: THREE.Group }) => {
              const model = isFbx ? (result as THREE.Group) : (result as { scene: THREE.Group }).scene;
              const box = new THREE.Box3().setFromObject(model);
              const npcHeight = box.max.y - box.min.y;
              const s = npcHeight > 0 ? harryHeight / npcHeight : 1;
              model.scale.setScalar(s);
              box.setFromObject(model);
              const c = box.getCenter(new THREE.Vector3());
              model.position.set(-c.x, -box.min.y, -c.z);
              if (sm.position) model.position.add(new THREE.Vector3(...sm.position));
              if (sm.rotation) model.rotation.set(...sm.rotation);
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.castShadow = false;
                  child.receiveShadow = false;
                }
              });
              scene.add(model);
              activeSceneModels.push(model);
            },
            undefined,
            () => {}
          );
        });
      }

      if (portal.targetTitle) sceneTitleEl.textContent = portal.targetTitle;
      if (portal.targetSubtitle) sceneSubtitleEl.textContent = portal.targetSubtitle;
      isInPortalDestination = true; // cannot go back to previous chapter
      backBtn.style.display = "none";
      backBtn.style.pointerEvents = "none";
      backBtn.style.visibility = "hidden";
      sceneInfo.style.display = "none"; // hide entire UI — nothing to click, cannot go back
      sceneInfo.style.pointerEvents = "none";
      // Block browser Back button now that we're in the next chapter
      history.pushState({ portalDestination: true }, "", location.href);
      const popHandler = () => {
        if (isInPortalDestination) history.pushState({ portalDestination: true }, "", location.href);
      };
      window.addEventListener("popstate", popHandler);
      loadingOverlay.style.transition = "opacity 0.6s ease";
      loadingOverlay.style.opacity = "0";
      setTimeout(() => {
        loadingOverlay.style.display = "none";
        loadingOverlay.style.transition = "none";
      }, 700);
    },
    onProgress: (e) => { if (e.lengthComputable && loadingText) loadingText.textContent = `${portal.targetTitle || "Loading"}… ${Math.round(100 * e.loaded / e.total)}%`; },
  });
  // Don't add to scene until loaded — prev room assets are fully removed during load
}

function updateCameraIntro(dt: number) {
  if (cameraIntroProgress >= 1) return;
  cameraIntroProgress = Math.min(1, cameraIntroProgress + dt / CAMERA_INTRO_DURATION);
  const t = cameraIntroProgress;
  const eased = t * t * (3 - 2 * t); // smoothstep for smooth revolve
  const angle = eased * Math.PI; // start 0, end PI — orbit from +Z to -Z
  const radius = 4;
  camera.position.set(radius * Math.sin(angle), 1.5, radius * Math.cos(angle));
  controls.target.set(0, 0.8, 0);
}

function updateThirdPersonCamera(dt: number) {
  if (!activeModel || !inScene) return;
  if (cameraIntroProgress < 1) return; // use camera intro until done

  const modelPos = activeModel.position;
  const behind = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), activeModel.rotation.y);

  const desiredPos = new THREE.Vector3()
    .copy(modelPos)
    .add(new THREE.Vector3(0, CAM_OFFSET.y, 0))
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
renderer.domElement.addEventListener("click", () => {
  if (inScene || isInPortalDestination) return; // never open book when inside a scene or common room
  if (hoveredBook && !hoveredBook.def.locked && !isOpening) startOpenBook(hoveredBook);
});

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
//  BOOK OPEN ANIMATION — clean, cinematic
// ══════════════════════════════════════════════════════
//
//  Timeline (2.5s total):
//    0.00–0.12  Book rises, tilts toward camera
//    0.08–0.20  Cover opens smoothly
//    0.15–0.45  Pages flip halfway (stop mid-book)
//    0.35–0.75  Camera dives straight into the open pages
//    0.50–0.80  Golden glow intensifies from the pages
//    0.70–1.00  Clean white fade
//
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

  // ── Rise + tilt ──
  const riseT = easeOutCubic(smoothClamp(t, 0, 0.12));
  root.position.y = bm.savedPosition.y + riseT * 0.8;
  root.rotation.x = bm.savedRotation.x + riseT * (-Math.PI * 0.3);

  // ── Cover opens fully ──
  const coverT = easeOutCubic(smoothClamp(t, 0.08, 0.20));
  bm.coverPivot.rotation.y = coverT * (-Math.PI);

  // ── Pages flip with curl — only first half, stop mid-book ──
  const pageT = smoothClamp(t, 0.15, 0.45);
  const pagesToFlip = Math.floor(PAGE_COUNT * 0.55);
  for (let i = 0; i < bm.pagePivots.length; i++) {
    const pp = bm.pagePivots[i];
    if (i >= pagesToFlip) {
      curlPage(pp, 0);
      continue;
    }
    const normalized = i / pagesToFlip;
    const localT = Math.max(0, Math.min((pageT - normalized * 0.6) * 3.0, 1));
    curlPage(pp, localT);
  }

  // ── Glow from inside the book ──
  const glowT = smoothClamp(t, 0.30, 0.75);
  portalLight.intensity = easeInOutCubic(glowT) * 30;
  portalLight.position.set(bp.x, bp.y + 0.4, bp.z + 0.15);

  // ── Camera: smooth dive into the open pages ──
  const zoomT = easeInOutCubic(smoothClamp(t, 0.20, 0.75));
  const divePos = new THREE.Vector3(bp.x, bp.y + 0.5, bp.z + 0.6);
  const diveLook = new THREE.Vector3(bp.x, bp.y + 0.1, bp.z - 0.2);
  camera.position.lerpVectors(cameraStartPos, divePos, zoomT);
  controls.target.lerpVectors(cameraStartTarget, diveLook, zoomT);

  // ── White fade ──
  const fadeT = smoothClamp(t, 0.70, 1.0);
  if (fadeT > 0) {
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.transition = "none";
    loadingOverlay.style.opacity = String(easeInOutCubic(fadeT));
  }

  // ── Done ──
  if (t >= 1.0) {
    isOpening = false;
    portalLight.intensity = 0;
    enterScene(bm.def);
  }
}

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
    const q = def.splatQuality ?? "high";
    if (q === "low") {
      spark.lodSplatCount = 80000;  // fewer splats = less lag (moon, etc.)
      spark.lodSplatScale = 0.5;
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
    } else if (q === "medium") {
      spark.lodSplatCount = 500000;
      spark.lodSplatScale = 0.8;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = false;
    } else {
      spark.lodSplatCount = 800000;
      spark.lodSplatScale = 1.0;
      renderer.setPixelRatio(DEFAULT_PIXEL_RATIO);
      renderer.shadowMap.enabled = true;
    }

    const splat = new SplatMesh({
      url: def.splatUrl,
      maxSplats: (def.splatQuality === "low") ? 120000 : undefined,
      onLoad: () => {
        activeSplat = splat;
        inScene = true;
        // Pass clicks through to canvas; only Back button captures (when visible)
        sceneInfo.style.pointerEvents = "none";
        backBtn.style.pointerEvents = "auto";

        if (def.portals) {
          activePortals.length = 0;
          def.portals.forEach((p) => {
            const mesh = createPortalMesh(p);
            scene.add(mesh);
            activePortals.push({ def: p, mesh });
          });
        }

        // Load additional static scene models (e.g. lunar lander on moon)
        if (def.sceneModels) {
          activeSceneModels.length = 0;
          def.sceneModels.forEach((sm) => {
            const isFbx = sm.url.toLowerCase().endsWith(".fbx");
            const loader = isFbx ? fbxLoader : gltfLoader;
            loader.load(
              sm.url,
              (result: THREE.Group | { scene: THREE.Group }) => {
                const model = result instanceof THREE.Group ? result : (result as { scene: THREE.Group }).scene;
                if (sm.scale != null) model.scale.setScalar(sm.scale);
                if (sm.position) model.position.set(...sm.position);
                if (sm.rotation) model.rotation.set(...sm.rotation);
                // Disable shadows on scene models for better performance (moon/lander)
                model.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                  }
                });
                scene.add(model);
                activeSceneModels.push(model);
              },
              undefined,
              () => {}
            );
          });
        }

        controls.enabled = true;
        controls.autoRotate = !def.modelUrl;
        controls.autoRotateSpeed = 0.4;
        controls.minDistance = 0.5;
        controls.maxDistance = 50;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.enablePan = true;
        // Start camera in front of character, then revolve to back
        camera.position.set(0, 1.5, def.modelUrl ? 4 : 4); // start at +Z, intro orbits to -Z (back)
        controls.target.set(0, 0.8, 0);
        if (def.modelUrl) cameraIntroProgress = 0;

        // Scene-info passes clicks through to canvas; only Back button captures clicks (avoids accidental return when orbiting)
        sceneInfo.style.pointerEvents = "none";
        backBtn.style.pointerEvents = "auto";

        // Focus canvas so WASD works (click canvas if keys don't register)
        renderer.domElement.focus();

        // Let clicks pass through to canvas; only Back button captures (avoids accidental returns when orbiting)
        sceneInfo.style.pointerEvents = "none";
        backBtn.style.pointerEvents = "auto";

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

      const setupModel = (model: THREE.Group, baseClips: THREE.AnimationClip[] = []) => {
        try {
          const box = new THREE.Box3().setFromObject(model);
          const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
          const s = (def.modelScale ?? 1.7) / Math.max(maxDim, 0.001);
          model.scale.multiplyScalar(s);

          box.setFromObject(model);
          const c = box.getCenter(new THREE.Vector3());
          model.position.set(-c.x, -box.min.y, -c.z);
          if (def.modelRotation) model.rotation.set(...def.modelRotation);

          scene.add(model);
        activeModel = model;
        modelSpawnPos.copy(model.position);
        modelSpawnRot = model.rotation.y;

        // Focus canvas when character loads so WASD works
        renderer.domElement.focus();

        activeAnimMixer = new THREE.AnimationMixer(model);
          activeAnimActions.clear();
          currentAction = null;
          controls.autoRotate = false;

          const walkKeywords = ["walk", "run", "jog", "locomotion", "move", "mixamo"];
          for (const clip of baseClips) {
            const name = clip.name?.toLowerCase() || "";
            const isWalk = walkKeywords.some((kw) => name.includes(kw));
            const action = activeAnimMixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            activeAnimActions.set(isWalk ? "run" : clip.name || "idle", action);
            if (isWalk && !currentAction) {
              action.play();
              action.paused = true;
              currentAction = action;
            }
          }
          if (!currentAction && baseClips.length > 0) {
            const first = activeAnimMixer.clipAction(baseClips[0]);
            first.setLoop(THREE.LoopRepeat, Infinity);
            first.play();
            first.paused = true;
            activeAnimActions.set("run", first);
            currentAction = first;
          }

          if (def.extraAnims?.length) {
            def.extraAnims.forEach((ad) => {
              fbxLoader.load(ad.url, (animFbx) => {
                if (animFbx.animations?.length && activeAnimMixer) {
                  const action = activeAnimMixer.clipAction(animFbx.animations[0]);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  action.setEffectiveWeight(1);
                  action.play();
                  action.paused = true;
                  activeAnimActions.set(ad.name, action);
                  if (ad.name === "run" || !currentAction) currentAction = action;
                }
              }, undefined, () => { /* ignore extra anim load errors */ });
            });
          }
        } catch (err) {
          console.warn("Model setup failed:", err);
        }
      };

      const isFbx = def.modelUrl.toLowerCase().endsWith(".fbx");
      if (isFbx) {
        fbxLoader.load(def.modelUrl, (fbx) => setupModel(fbx, fbx.animations || []), undefined, (err) => {
          console.warn("Model load failed, continuing without character:", err);
          loadingOverlay.style.transition = "opacity 0.6s ease";
          loadingOverlay.style.opacity = "0";
          setTimeout(() => { loadingOverlay.style.display = "none"; }, 600);
        });
      } else {
        gltfLoader.load(def.modelUrl, (gltf) => setupModel(gltf.scene, gltf.animations || []), undefined, (err) => {
          console.warn("Model load failed, continuing without character:", err);
          loadingOverlay.style.transition = "opacity 0.6s ease";
          loadingOverlay.style.opacity = "0";
          setTimeout(() => { loadingOverlay.style.display = "none"; }, 600);
        });
      }
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
  if (isInPortalDestination) return; // cannot go back from inner chapter
  if (activeSplat) {
    scene.remove(activeSplat);
    activeSplat.dispose();
    activeSplat = null;
  }
  if (activeModel) {
    scene.remove(activeModel);
    activeModel = null;
  }
  if (activeAnimMixer) {
    activeAnimMixer.stopAllAction();
    activeAnimMixer = null;
  }
  activeAnimActions.clear();
  currentAction = null;
  cameraIntroProgress = 1;
  activeSceneLights.forEach((l) => scene.remove(l));
  activeSceneLights.length = 0;
  activeSceneModels.forEach((obj) => {
    scene.remove(obj);
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  });
  activeSceneModels.length = 0;
  activePortals.forEach(({ mesh }) => {
    scene.remove(mesh);
    mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
      if ("element" in obj && obj.element instanceof HTMLElement) obj.element.remove();
    });
  });
  activePortals.length = 0;
  activeSceneModels.forEach((obj) => {
    scene.remove(obj);
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  });
  activeSceneModels.length = 0;
  cameraIntroProgress = 1;
  inScene = false;
  transitioningToSplat = false;
  isInPortalDestination = false;

  loadingOverlay.style.display = "none";
  loadingOverlay.style.opacity = "0";
  loadingOverlay.style.transition = "none";
  sceneInfo.style.display = "none";
  backBtn.style.display = "";
  backBtn.style.pointerEvents = "";
  backBtn.style.visibility = "";
  sceneInfo.style.pointerEvents = ""; // restore for next book
  header.style.display = "block";
  header.style.opacity = "1";
  hint.style.display = "block";
  hint.style.opacity = "1";

  // Restore splat quality defaults
  spark.enableLod = true;
  spark.lodSplatCount = 800000;
  spark.lodSplatScale = 1.0;
  renderer.setPixelRatio(DEFAULT_PIXEL_RATIO);

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

backBtn.addEventListener("click", () => {
  if (isInPortalDestination) return;
  resetToLibrary();
});

// ── Easing helpers ──
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function smoothClamp(t: number, start: number, end: number) {
  return Math.max(0, Math.min((t - start) / (end - start), 1));
}

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // Float books
  bookMeshes.forEach((b, i) => {
    if (b === openingBook) return;
    const baseY = b.group.userData.hoverY as number;
    const isHovered = b === hoveredBook && !isOpening;
    const floatY = baseY + Math.sin(t * 0.7 + i * 1.8) * 0.05 + (isHovered ? 0.12 : 0);
    b.group.position.y += (floatY - b.group.position.y) * 0.07;
    const s = isHovered && !b.def.locked ? 1.08 : 1.0;
    b.group.scale.lerp(new THREE.Vector3(s, s, s), 0.07);
  });

  // Fireflies
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

  if (activeAnimMixer) activeAnimMixer.update(dt);
  updateCharacterMovement(dt);
  if (activeModel && inScene) {
    if (cameraIntroProgress < 1) updateCameraIntro(dt);
    else updateThirdPersonCamera(dt);
    updatePortalCheck();
  }
  updateBookOpen(dt);
  if (!inScene) checkHover();
  controls.update();
  spark.render(scene, camera);
  css2DRenderer.render(scene, camera);
}

// ── Resize ──
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  css2DRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Start ──
animate();
