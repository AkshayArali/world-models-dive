import * as THREE from "three";

export interface LibraryResult {
  group: THREE.Group;
  ffGeo: THREE.BufferGeometry;
  ffMat: THREE.PointsMaterial;
  ffData: { baseY: number; speed: number; radius: number; angle: number }[];
  ffCount: number;
  portalLight: THREE.PointLight;
}

export function createLibrary(scene: THREE.Scene): LibraryResult {
  const libraryGroup = new THREE.Group();
  scene.add(libraryGroup);

  // Sky
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

  // Stars
  const starCount = 2500;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85 + 0.15);
    const r = 70;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  libraryGroup.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
      })
    )
  );

  // Ground
  const groundGeo = new THREE.PlaneGeometry(120, 120, 64, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.getAttribute("position");
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i),
      z = posAttr.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    const h =
      Math.sin(x * 0.08) * 0.35 +
      Math.sin(z * 0.06 + 1) * 0.25 +
      Math.sin(x * 0.15 + z * 0.12) * 0.12 -
      dist * 0.004;
    posAttr.setY(i, Math.max(h, -0.3));
  }
  groundGeo.computeVertexNormals();
  libraryGroup.add(
    new THREE.Mesh(
      groundGeo,
      new THREE.ShaderMaterial({
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
      })
    )
  );

  // Lighting
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

  const portalLight = new THREE.PointLight(0xfff8e0, 0, 8, 1.5);
  libraryGroup.add(portalLight);

  // Fireflies
  const ffCount = 80;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos2 = new Float32Array(ffCount * 3);
  const ffData: { baseY: number; speed: number; radius: number; angle: number }[] = [];
  for (let i = 0; i < ffCount; i++) {
    const a = Math.random() * Math.PI * 2,
      r = 2 + Math.random() * 14,
      y = 0.3 + Math.random() * 3.5;
    ffPos2[i * 3] = Math.cos(a) * r;
    ffPos2[i * 3 + 1] = y;
    ffPos2[i * 3 + 2] = Math.sin(a) * r;
    ffData.push({ baseY: y, speed: 0.15 + Math.random() * 0.45, radius: r, angle: a });
  }
  ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos2, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xffee88,
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  libraryGroup.add(new THREE.Points(ffGeo, ffMat));

  return { group: libraryGroup, ffGeo, ffMat, ffData, ffCount, portalLight };
}
