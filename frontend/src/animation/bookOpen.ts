import * as THREE from "three";
import type { BookDef, BookMesh, PagePivot } from "../types";
import { BOOK_DIMS, PAGE_COUNT, ANIM_DURATION } from "../constants";
import { easeOutCubic, easeInOutCubic, smoothClamp } from "../utils/easing";

export function curlPage(pp: PagePivot, flipT: number) {
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
  const pw = BOOK_DIMS.W - 0.02;

  for (let v = 0, n = pos.count; v < n; v++) {
    const rx = rest[v * 3];
    const ry = rest[v * 3 + 1];
    const frac = Math.max(0, Math.min(rx / pw, 1));
    const angle = totalAngle * frac;
    const radius = rx;
    const lift = curlStrength * frac * Math.sin(frac * Math.PI) * 0.25;
    arr[v * 3] = radius * Math.cos(angle);
    arr[v * 3 + 1] = ry + lift;
    arr[v * 3 + 2] = -radius * Math.sin(angle);
  }

  pos.needsUpdate = true;
  pp.sheet.geometry.computeVertexNormals();
}

export interface BookOpenDeps {
  openingBook: BookMesh | null;
  setOpeningBook: (bm: BookMesh | null) => void;
  isOpening: boolean;
  setIsOpening: (v: boolean) => void;
  openProgress: number;
  setOpenProgress: (v: number) => void;
  controls: { autoRotate: boolean; enabled: boolean; target: THREE.Vector3 };
  tooltip: HTMLElement;
  header: HTMLElement;
  hint: HTMLElement;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  cameraStartPos: THREE.Vector3;
  cameraStartTarget: THREE.Vector3;
  loadingOverlay: HTMLElement;
  portalLight: THREE.PointLight;
  enterScene: (def: BookDef) => void;
}

export function createBookOpenHandlers(deps: BookOpenDeps) {
  const {
    setOpeningBook,
    setIsOpening,
    setOpenProgress,
    controls,
    tooltip,
    header,
    hint,
    renderer,
    camera,
    cameraStartPos,
    cameraStartTarget,
    loadingOverlay,
    portalLight,
    enterScene,
  } = deps;

  return {
    startOpenBook(bm: BookMesh) {
      setIsOpening(true);
      setOpeningBook(bm);
      setOpenProgress(0);
      controls.autoRotate = false;
      controls.enabled = false;
      tooltip.classList.remove("visible");
      header.style.opacity = "0";
      hint.style.opacity = "0";
      renderer.domElement.style.cursor = "default";
      cameraStartPos.copy(camera.position as THREE.Vector3);
      cameraStartTarget.copy(controls.target);
    },

    updateBookOpen(dt: number) {
      const openingBook = deps.openingBook;
      const isOpening = deps.isOpening;
      const openProgress = deps.openProgress;

      if (!isOpening || !openingBook) return;

      setOpenProgress(openProgress + dt / ANIM_DURATION);
      const t = Math.min(openProgress + dt / ANIM_DURATION, 1);
      const bm = openingBook;
      const root = bm.group;
      const bp = root.position;

      // Rise + tilt
      const riseT = easeOutCubic(smoothClamp(t, 0, 0.12));
      root.position.y = bm.savedPosition.y + riseT * 0.8;
      root.rotation.x = bm.savedRotation.x + riseT * (-Math.PI * 0.3);

      // Cover opens fully
      const coverT = easeOutCubic(smoothClamp(t, 0.08, 0.20));
      bm.coverPivot.rotation.y = coverT * (-Math.PI);

      // Pages flip with curl
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

      // Glow from inside the book
      const glowT = smoothClamp(t, 0.30, 0.75);
      portalLight.intensity = easeInOutCubic(glowT) * 30;
      portalLight.position.set(bp.x, bp.y + 0.4, bp.z + 0.15);

      // Camera dive into pages
      const zoomT = easeInOutCubic(smoothClamp(t, 0.20, 0.75));
      const divePos = new THREE.Vector3(bp.x, bp.y + 0.5, bp.z + 0.6);
      const diveLook = new THREE.Vector3(bp.x, bp.y + 0.1, bp.z - 0.2);
      camera.position.lerpVectors(cameraStartPos, divePos, zoomT);
      controls.target.lerpVectors(cameraStartTarget, diveLook, zoomT);

      // White fade
      const fadeT = smoothClamp(t, 0.70, 1.0);
      if (fadeT > 0) {
        loadingOverlay.style.display = "flex";
        loadingOverlay.style.transition = "none";
        loadingOverlay.style.opacity = String(easeInOutCubic(fadeT));
      }

      // Done
      if (t >= 1.0) {
        setIsOpening(false);
        portalLight.intensity = 0;
        enterScene(bm.def);
      }
    },

    resetBookState(openingBook: BookMesh | null) {
      if (openingBook) {
        openingBook.coverPivot.rotation.y = 0;
        openingBook.pagePivots.forEach((pp) => curlPage(pp, 0));
        openingBook.group.position.copy(openingBook.savedPosition);
        openingBook.group.rotation.copy(openingBook.savedRotation);
      }
    },
  };
}
