import type * as THREE from "three";

export interface AnimDef {
  name: string;
  url: string;
}

export interface SceneModelDef {
  url: string;
  name?: string;
  greeting?: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface PortalDef {
  position: [number, number, number];
  radius: number;
  targetSplatUrl: string;
  targetTitle?: string;
  targetSubtitle?: string;
  targetNarrativeText?: string;
  targetChapterNumber?: string;
  targetChapterDescription?: string;
  bubbleText?: string;
  targetModelScale?: number;
  targetModelPosition?: [number, number, number];
  targetModelRotation?: [number, number, number];
  targetSplatScale?: number;
  targetFloorY?: number;
  targetSceneModelScale?: number;
  targetCameraOffsetZ?: number;
  targetCameraOffsetY?: number;
  targetSceneModels?: SceneModelDef[];
}

export interface BookDef {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  splatUrl: string;
  sceneTitle: string;
  sceneSubtitle: string;
  narrativeText?: string;
  chapterNumber?: string;
  chapterDescription?: string;
  locked?: boolean;
  splatQuality?: "low" | "medium" | "high";
  modelUrl?: string;
  modelScale?: number;
  modelPosition?: [number, number, number];
  modelRotation?: [number, number, number];
  sceneCameraOffsetY?: number;
  sceneCameraOffsetZ?: number;
  extraAnims?: AnimDef[];
  portals?: PortalDef[];
  sceneModels?: SceneModelDef[];
}

export interface PagePivot {
  pivot: THREE.Group;
  sheet: THREE.Mesh;
  restPositions: Float32Array;
  delay: number;
}

export interface BookMesh {
  group: THREE.Group;
  def: BookDef;
  coverPivot: THREE.Group;
  pagePivots: PagePivot[];
  savedRotation: THREE.Euler;
  savedPosition: THREE.Vector3;
}
