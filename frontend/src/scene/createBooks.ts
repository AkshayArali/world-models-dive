import * as THREE from "three";
import type { BookDef, BookMesh, PagePivot } from "../types";
import { BOOK_DIMS, PAGE_COUNT, PAGE_SEGS } from "../constants";

export function createBooks(
  bookDefs: BookDef[],
  libraryGroup: THREE.Group
): { bookMeshes: BookMesh[]; bookGroup: THREE.Group } {
  const textureLoader = new THREE.TextureLoader();
  const bookGroup = new THREE.Group();
  libraryGroup.add(bookGroup);

  const { W, H, DEPTH, COVER_T } = BOOK_DIMS;

  const bookMeshes: BookMesh[] = [];

  function createBook(def: BookDef, index: number, total: number): BookMesh {
    const root = new THREE.Group();

    const leatherColor = def.locked ? 0x444455 : 0x3a2215;
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
      const restPositions = new Float32Array(geo.attributes.position.array as ArrayBuffer);

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

  bookDefs.forEach((def, i) => {
    const bm = createBook(def, i, bookDefs.length);
    bookGroup.add(bm.group);
    bookMeshes.push(bm);
  });

  return { bookMeshes, bookGroup };
}
