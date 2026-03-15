import * as THREE from "three";

/** Book 3D dimensions */
export const PAGE_COUNT = 20;
export const PAGE_SEGS = 16;
export const W = 1.05;
export const H = 1.55;
export const DEPTH = 0.24;
export const COVER_T = 0.025;
export const BOOK_DIMS = { W, H, DEPTH, COVER_T };

/** Book open animation duration (seconds) */
export const ANIM_DURATION = 2.5;

/** Character movement */
export const BASE_SPEED = 1.2;
export const SPRINT_MULT = 2.5;
export const TURN_SPEED = 6.0;
export const CAM_OFFSET = new THREE.Vector3(0, 1.4, 3.0);
export const CAM_LOOK_OFFSET = new THREE.Vector3(0, 0.8, 0);
export const DEFAULT_FOV = 50;
export const CAMERA_INTRO_DURATION = 0.8;
