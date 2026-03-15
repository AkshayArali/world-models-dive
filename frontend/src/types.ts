import type * as THREE from "three";

export interface AnimDef {
  name: string;
  url: string;
}

export interface PortalDef {
  position: [number, number, number];
  radius: number;
  targetSplatUrl: string;
  targetTitle?: string;
  targetSubtitle?: string;
  bubbleText?: string;
  targetModelScale?: number;
  targetModelPosition?: [number, number, number];
  targetSplatScale?: number;
  targetFloorY?: number;
  targetSceneModelScale?: number;
  targetSceneModels?: {
    url: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
  }[];
}

export interface BookDef {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  splatUrl: string;
  sceneTitle: string;
  sceneSubtitle: string;
  locked?: boolean;
  splatQuality?: "low" | "medium" | "high";
  modelUrl?: string;
  modelScale?: number;
  modelPosition?: [number, number, number];
  modelRotation?: [number, number, number];
  extraAnims?: AnimDef[];
  portals?: PortalDef[];
  sceneModels?: {
    url: string;
    scale?: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
  }[];
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
