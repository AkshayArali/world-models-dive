import * as THREE from "three";
import { BASE_SPEED, SPRINT_MULT, TURN_SPEED, CAM_OFFSET, CAM_LOOK_OFFSET } from "./constants";

export const keys: Record<string, boolean> = {};

export function setupKeyHandlers(deps: {
  renderer: THREE.WebGLRenderer;
  inScene: () => boolean;
  activeModel: () => THREE.Group | null;
  modelSpawnPos: THREE.Vector3;
  modelSpawnRot: { value: number };
  camera: THREE.PerspectiveCamera;
  DEFAULT_FOV: number;
}) {
  const { renderer, inScene, activeModel, modelSpawnPos, modelSpawnRot, camera, DEFAULT_FOV } = deps;
  renderer.domElement.setAttribute("tabindex", "0");
  renderer.domElement.style.outline = "none";

  window.addEventListener("keydown", (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (e.key === " ") keys["space"] = true;
    if (e.shiftKey) keys["shift"] = true;

    if (inScene() && activeModel() && ["w", "a", "s", "d", "e", "q", " ", "enter"].includes(k)) {
      e.preventDefault();
    }
    if (!inScene()) return;

    if (e.key === "[") {
      camera.fov = Math.max(20, camera.fov - 5);
      camera.updateProjectionMatrix();
    }
    if (e.key === "]") {
      camera.fov = Math.min(110, camera.fov + 5);
      camera.updateProjectionMatrix();
    }
    if (e.key === "0" && activeModel()) {
      activeModel()!.position.copy(modelSpawnPos);
      activeModel()!.rotation.y = modelSpawnRot.value;
      camera.fov = DEFAULT_FOV;
      camera.updateProjectionMatrix();
    }
  });

  window.addEventListener("keyup", (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    keys[e.key.toLowerCase()] = false;
    if (e.key === " ") keys["space"] = false;
    if (!e.shiftKey) keys["shift"] = false;
  });
}

export function updateCharacterMovement(
  dt: number,
  deps: {
    activeModel: THREE.Group | null;
    inScene: boolean;
    cameraIntroProgress: number;
    currentAction: THREE.AnimationAction | null;
    camera: THREE.PerspectiveCamera;
  }
) {
  const { activeModel, inScene, cameraIntroProgress, currentAction, camera } = deps;
  if (!activeModel || !inScene) return;
  if (cameraIntroProgress < 1) return;

  const moveDir = new THREE.Vector3();
  if (keys["w"]) moveDir.z -= 1;
  if (keys["s"]) moveDir.z += 1;
  if (keys["a"]) moveDir.x -= 1;
  if (keys["d"]) moveDir.x += 1;

  const vertDir = (keys["space"] ? 1 : 0) + (keys["q"] ? -1 : 0);
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
      if (!wasPaused) currentAction.reset();
    }
  }

  if (vertDir !== 0) {
    activeModel.position.y += vertDir * speed * dt;
  }

  const camForward = new THREE.Vector3();
  camera.getWorldDirection(camForward);
  camForward.y = 0;
  camForward.normalize();
  const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

  let targetAngle: number;
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    const worldDir = new THREE.Vector3()
      .addScaledVector(camRight, moveDir.x)
      .addScaledVector(camForward, -moveDir.z)
      .normalize();
    activeModel.position.addScaledVector(worldDir, speed * dt);
    targetAngle = Math.atan2(worldDir.x, worldDir.z);
  } else {
    targetAngle = Math.atan2(camForward.x, camForward.z);
  }

  let angleDiff = targetAngle - activeModel.rotation.y;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  activeModel.rotation.y += angleDiff * Math.min(1, TURN_SPEED * dt);
}

export { CAM_OFFSET, CAM_LOOK_OFFSET };
