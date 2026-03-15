import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { SplatMesh, SparkRenderer } from "@sparkjsdev/spark";

import type { BookDef, BookMesh, PortalDef } from "./types";
import { BOOKS } from "./config/books";
import { easeOutCubic, easeInOutCubic, smoothClamp } from "./utils/easing";
import { PAGE_COUNT, ANIM_DURATION, DEFAULT_FOV } from "./constants";
import { createLibrary } from "./scene/createLibrary";
import { createBooks } from "./scene/createBooks";
import { createPortalMesh } from "./scene/createPortal";
import { setupKeyHandlers, updateCharacterMovement, CAM_OFFSET, CAM_LOOK_OFFSET } from "./character";
import { updateCameraIntro, updateThirdPersonCamera } from "./camera";
import { curlPage } from "./animation/bookOpen";

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

// ── Library world (sky, ground, lights, books, fireflies) ──
const { group: libraryGroup, ffGeo, ffMat, ffData, ffCount, portalLight } = createLibrary(scene);
const { bookMeshes } = createBooks(BOOKS, libraryGroup);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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

// ── Character controls ──
let modelSpawnPos = new THREE.Vector3();
const modelSpawnRotRef = { value: 0 };
let cameraIntroProgress = 1; // 1 = done, 0 = starting (camera in front)

setupKeyHandlers({
  renderer,
  inScene: () => inScene,
  activeModel: () => activeModel,
  modelSpawnPos,
  modelSpawnRot: modelSpawnRotRef,
  camera,
  DEFAULT_FOV,
});

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
              const heightScale = npcHeight > 0 ? harryHeight / npcHeight : 1;
              const sceneScale = portal.targetSceneModelScale ?? portal.targetModelScale ?? 1;
              model.scale.setScalar(heightScale * sceneScale);
              box.setFromObject(model);
              const c = box.getCenter(new THREE.Vector3());
              model.position.set(-c.x, -box.min.y, -c.z);
              if (sm.position) {
                const [px, py = 0, pz] = sm.position;
                const floorY = portal.targetFloorY ?? -2.2; // tune per room: more negative = lower
                model.position.add(new THREE.Vector3(px, py + floorY, pz));
                // Face center at our height only (no tilt) — lookAt(0,1,0) made them lie backwards
                model.lookAt(0, model.position.y, 0);
              }
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
        modelSpawnRotRef.value = model.rotation.y;

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
  updateCharacterMovement(dt, { activeModel, inScene, cameraIntroProgress, currentAction, camera });
  if (activeModel && inScene) {
    if (cameraIntroProgress < 1) {
      cameraIntroProgress = updateCameraIntro(dt, { camera, controls, cameraIntroProgress });
    } else {
      updateThirdPersonCamera(dt, { activeModel, inScene, camera, controls, cameraIntroProgress });
    }
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
