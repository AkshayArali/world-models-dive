import * as THREE from "three";
import { CAM_OFFSET, CAM_LOOK_OFFSET, CAMERA_INTRO_DURATION } from "./constants";

export function updateCameraIntro(
  dt: number,
  deps: {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3 };
    cameraIntroProgress: number;
  }
): number {
  let { cameraIntroProgress } = deps;
  if (cameraIntroProgress >= 1) return cameraIntroProgress;
  cameraIntroProgress = Math.min(1, cameraIntroProgress + dt / CAMERA_INTRO_DURATION);
  const t = cameraIntroProgress;
  const eased = t * t * (3 - 2 * t);
  const angle = eased * Math.PI;
  const radius = 4;
  deps.camera.position.set(radius * Math.sin(angle), 1.5, radius * Math.cos(angle));
  deps.controls.target.set(0, 0.8, 0);
  return cameraIntroProgress;
}

export function updateThirdPersonCamera(
  dt: number,
  deps: {
    activeModel: THREE.Group | null;
    inScene: boolean;
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3 };
    cameraIntroProgress: number;
  }
) {
  const { activeModel, inScene, camera, controls, cameraIntroProgress } = deps;
  if (!activeModel || !inScene) return;
  if (cameraIntroProgress < 1) return;

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
