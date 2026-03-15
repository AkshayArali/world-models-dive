import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { PortalDef } from "../types";

export function createPortalMesh(portal: PortalDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...portal.position);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(portal.radius, 0.06, 8, 16),
    new THREE.MeshBasicMaterial({
      color: 0x4499ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
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
    })
  );
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);

  const bubbleText = portal.bubbleText ?? portal.targetTitle ?? "Enter";
  const bubbleEl = document.createElement("div");
  bubbleEl.className = "portal-bubble";
  bubbleEl.textContent = bubbleText;
  const bubbleLabel = new CSS2DObject(bubbleEl);
  bubbleLabel.position.set(0, portal.radius + 1.0, 0);
  group.add(bubbleLabel);

  return group;
}
