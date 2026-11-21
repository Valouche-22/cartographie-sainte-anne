import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { BuildingInfo, CameraPreset, RoomInfo, SchoolData } from '../types';

interface Props {
  data: SchoolData;
  isHero: boolean;
  activeSceneIndex: number;
  freeExplore: boolean;
  hideRoofs: boolean;
  showLabels: boolean;
  selectedBuilding: BuildingInfo | null;
  selectedRoom: RoomInfo | null;
  cameraPresetTrigger: { preset: CameraPreset; seq: number } | null;
  classBuildingFocus?: 'all' | 'S1' | 'N1' | 'E2';
  onSelectBuilding: (b: BuildingInfo) => void;
  onSelectRoom: (r: RoomInfo) => void;
  onLoadProgress: (pct: number) => void;
  onLoaded: () => void;
  onLoadError: (msg: string) => void;
}

interface ProjectedLabel {
  id: string;
  label: string;
  ax: number;
  ay: number;
  x: number;
  y: number;
  visible: boolean;
  kind: 'building' | 'room';
  color?: string;
}

function resolveLabelOverlaps(
  items: ProjectedLabel[],
  leftBound: number,
  rightBound: number,
  topBound: number,
  bottomBound: number
): ProjectedLabel[] {
  const vis = items.filter((it) => it.visible);
  if (vis.length <= 1) return items;

  const boxes = vis.map((it) => ({
    it,
    tx: it.x,
    ty: it.y,
    hw: (it.label.length * 6.4 + (it.color ? 30 : 20)) * 0.5 + 5,
    hh: 14.5,
  }));

  for (let iter = 0; iter < 18; iter++) {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = b.it.x - a.it.x;
        const dy = b.it.y - a.it.y;
        const minX = a.hw + b.hw;
        const minY = a.hh + b.hh;
        const ox = minX - Math.abs(dx);
        const oy = minY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          // Prefer vertical separation unless horizontal is much smaller
          if (oy <= ox * 0.85) {
            const sy = dy >= 0 ? 1 : -1;
            const shift = oy * 0.52 + 0.5;
            a.it.y -= sy * shift;
            b.it.y += sy * shift;
          } else {
            const sx = dx >= 0 ? 1 : -1;
            const shift = ox * 0.52 + 0.5;
            a.it.x -= sx * shift;
            b.it.x += sx * shift;
          }
        }
      }
    }
    // Gentle spring back toward preferred position + viewport clamping
    for (const b of boxes) {
      b.it.x += (b.tx - b.it.x) * 0.06;
      b.it.y += (b.ty - b.it.y) * 0.06;
      b.it.x = Math.max(leftBound + b.hw, Math.min(rightBound - b.hw, b.it.x));
      b.it.y = Math.max(topBound + b.hh, Math.min(bottomBound - b.hh, b.it.y));
    }
  }
  return items;
}

function resolveMobileLabelOverlaps(
  items: ProjectedLabel[],
  leftBound: number,
  rightBound: number,
  topBound: number,
  bottomBound: number
): ProjectedLabel[] {
  const vis = items.filter((it) => it.visible);
  if (vis.length === 0) return items;

  const boxes = vis.map((it) => ({
    it,
    hw: Math.min(86, (it.label.length * 5.2 + (it.color ? 22 : 14)) * 0.5) + 4,
    hh: 12.5,
  }));

  // Fan labels gently outward from their cluster center so they clear the building & spread into margins
  if (boxes.length >= 2) {
    const cx = boxes.reduce((s, b) => s + b.it.ax, 0) / boxes.length;
    const cy = boxes.reduce((s, b) => s + b.it.ay, 0) / boxes.length;
    for (const b of boxes) {
      const vx = b.it.ax - cx;
      const vy = b.it.ay - cy;
      const len = Math.hypot(vx, vy) || 1;
      const pushX = (vx / len) * 24;
      const pushY = vy >= 0 ? Math.max(20, (vy / len) * 32) : Math.min(-24, (vy / len) * 34);
      b.it.x = b.it.ax + pushX;
      b.it.y = b.it.ay + pushY;
    }
  }

  // Clamp initial positions inside safe mobile bounds (avoiding top-right Vue libre button)
  const clampBox = (b: { it: ProjectedLabel; hw: number; hh: number }) => {
    b.it.x = Math.max(leftBound + b.hw, Math.min(rightBound - b.hw, b.it.x));
    const effTop = b.it.x + b.hw > rightBound - 108 ? Math.max(topBound, 48) : topBound;
    b.it.y = Math.max(effTop + b.hh, Math.min(bottomBound - b.hh, b.it.y));
  };
  boxes.forEach(clampBox);

  // 48 iterations: gentle tether during first 32, pure hard non-overlapping separation during final 16
  for (let iter = 0; iter < 48; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = b.it.x - a.it.x;
        const dy = b.it.y - a.it.y;
        const minX = a.hw + b.hw;
        const minY = a.hh + b.hh;
        const ox = minX - Math.abs(dx);
        const oy = minY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          anyOverlap = true;
          // Strongly prefer vertical stacking on narrow portrait screens unless horizontal gap is tiny
          if (oy <= ox * 1.35) {
            const sy = dy >= 0 ? 1 : -1;
            const shift = oy * 0.54 + 0.8;
            a.it.y -= sy * shift;
            b.it.y += sy * shift;
          } else {
            const sx = dx >= 0 ? 1 : -1;
            const shift = ox * 0.54 + 0.8;
            a.it.x -= sx * shift;
            b.it.x += sx * shift;
          }
        }
      }
    }
    if (iter < 32) {
      for (const b of boxes) {
        b.it.x += (b.it.ax - b.it.x) * 0.035;
        b.it.y += (b.it.ay - b.it.y) * 0.025;
      }
    }
    boxes.forEach(clampBox);
    if (!anyOverlap && iter >= 32) break;
  }

  return items;
}

const CLASSROOM_ROOF_PREFIXES = [
  'Toit_Batiment_Principal_S1',
  'Toit_Batiment_Sud_Maternelle_S2',
  'Toit_Pavillon_Central_S4',
  'Toit_Annexe_Sud_S5',
  'Toit_Sas_Entree_S7',
  'Toit_Batiment_Nord_N1',
  'Toit_Batiment_Est_Principal_E2',
  'Toit_E2_Velux_',
];

const COL_WIDTH_PX = 380;

const FLAT_GROUND_PREFIXES = [
  'Terrain_',
  'Route_',
  'Sol_',
  'Cour_',
  'Parvis_Eglise',
  'Parvis_Allee',
  'Parvis_Mediatheque',
  'Parking_',
  'Pelouse_',
  'Espace_Herbe_',
  'Parc_Mediatheque_Pelouse',
  'Parc_Mediatheque_Allee',
  'Aire_Jeux_',
  'Trottoir_',
  'PassagePieton_',
  'Jardins_',
  'Square_Nord_VilleRobert_Parking',
  'City_Stade_Sol',
  'City_Stade_Ligne_',
  'Archers_Terrain_',
  'Stade_Tennis_Pourtour',
  'Stade_Tennis_Court',
  'Stade_Piste',
  'Stade_Ligne',
  'Jeu_Sol_',
  'Extra_Jeu_Sol_',
  'Gravillons_',
  'Foot_Ligne_',
];

function isFlatGroundObject(name: string): boolean {
  return FLAT_GROUND_PREFIXES.some((p) => name.startsWith(p));
}

function isClassroomRoofObject(obj: THREE.Object3D): boolean {
  let curr: THREE.Object3D | null = obj;
  while (curr) {
    if (CLASSROOM_ROOF_PREFIXES.some((p) => curr!.name.startsWith(p))) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

const MOBILE_BREAKPOINT = 860;
const MOBILE_FOV = 52;

const MOBILE_SCENE_MULTS: Record<string, number> = {
  hero: 1.0,
  ecole: 1.0,
  cour: 1.08,
  classes: 1.0,
  'cantine-periscolaire': 1.04,
  eglise: 0.8,
  sport: 1.0,
  culture: 1.48,
  S1: 1.0,
  N1: 0.92,
  E2: 1.0,
  general: 1.0,
  cantine: 1.04,
  church: 0.8,
  stadium: 1.0,
};

function adaptPoseForMobile(
  pos: [number, number, number],
  target: [number, number, number],
  sceneKey: string,
  w: number,
  h: number
): { pos: [number, number, number]; target: [number, number, number] } {
  // Desktop PC: strictly untouched
  if (w > MOBILE_BREAKPOINT || w <= 0 || h <= 0) {
    return { pos, target };
  }
  const hTan = Math.tan(THREE.MathUtils.degToRad(MOBILE_FOV / 2)) * (w / h);
  const baseScale = Math.min(2.65, Math.max(1.15, 0.54 / Math.max(hTan, 0.12)));
  const mult = MOBILE_SCENE_MULTS[sceneKey] ?? 1.0;
  const s = baseScale * mult;

  const adjTarget: [number, number, number] =
    sceneKey === 'culture' ? [-208, 2, -192] : target;

  return {
    pos: [
      adjTarget[0] + (pos[0] - adjTarget[0]) * s,
      adjTarget[1] + (pos[1] - adjTarget[1]) * s,
      adjTarget[2] + (pos[2] - adjTarget[2]) * s,
    ],
    target: adjTarget,
  };
}

const PRESET_VIEWS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  general: { pos: [-74, 46, 82], target: [10, 0, 8] },
  cantine: { pos: [90, 44, 92], target: [32, 0, 32] },
  church: { pos: [-252, 54, 4], target: [-142, 16, -64] },
  culture: { pos: [-146, 65, -104], target: [-194, 2, -194] },
  stadium: { pos: [126, 100, 192], target: [372, 0, 113] },
};

const CLASS_FOCUS_VIEWS: Record<'S1' | 'N1' | 'E2', { pos: [number, number, number]; target: [number, number, number]; buildings: string[] }> = {
  S1: {
    pos: [-16, 68, 42],
    target: [6, 0, 10],
    buildings: ['Batiment_Principal_S1', 'Pavillon_Central_S4', 'Batiment_Sud_Maternelle_S2'],
  },
  N1: {
    pos: [-18, 44, -6],
    target: [-11, 1, -36],
    buildings: ['Batiment_Nord_N1'],
  },
  E2: {
    pos: [18, 54, 4],
    target: [47, 1, -14],
    buildings: ['Batiment_Est_E2'],
  },
};

export const SchoolScene3D: React.FC<Props> = ({
  data,
  isHero,
  activeSceneIndex,
  freeExplore,
  hideRoofs,
  showLabels,
  selectedBuilding,
  selectedRoom,
  cameraPresetTrigger,
  classBuildingFocus = 'all',
  onSelectBuilding,
  onSelectRoom,
  onLoadProgress,
  onLoaded,
  onLoadError,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const classroomRoofsRef = useRef<THREE.Object3D[]>([]);
  const roomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);

  // Animated base camera pose (separated from gentle orbital sway to prevent any stutter or jump)
  const basePosRef = useRef({ x: data.heroCamera.pos[0], y: data.heroCamera.pos[1], z: data.heroCamera.pos[2] });
  const baseTargetRef = useRef({ x: data.heroCamera.target[0], y: data.heroCamera.target[1], z: data.heroCamera.target[2] });
  // Smooth optical frustum offset (centers the 3D scene in the right viewport WITHOUT resizing the WebGL canvas!)
  const viewOffsetRef = useRef({ x: 0, y: 0 });
  const swayStateRef = useRef({ amp: 0.145, vert: 1.5, zoom: 0.03 });

  const showLabelsRef = useRef(showLabels);
  const hideRoofsRef = useRef(hideRoofs);
  const freeExploreRef = useRef(freeExplore);
  const isHeroRef = useRef(isHero);
  const activeSceneIndexRef = useRef(activeSceneIndex);
  const classBuildingFocusRef = useRef(classBuildingFocus);
  showLabelsRef.current = showLabels;
  hideRoofsRef.current = hideRoofs;
  freeExploreRef.current = freeExplore;
  isHeroRef.current = isHero;
  activeSceneIndexRef.current = activeSceneIndex;
  classBuildingFocusRef.current = classBuildingFocus;

  const animateGuidedCamera = (
    pos: [number, number, number],
    target: [number, number, number],
    duration = 1.25
  ) => {
    gsap.killTweensOf(basePosRef.current);
    gsap.killTweensOf(baseTargetRef.current);
    gsap.to(basePosRef.current, { x: pos[0], y: pos[1], z: pos[2], duration, ease: 'power2.inOut' });
    gsap.to(baseTargetRef.current, { x: target[0], y: target[1], z: target[2], duration, ease: 'power2.inOut' });
  };

  const animateFreeCamera = (pos: [number, number, number], target: [number, number, number], duration = 1.05) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    gsap.killTweensOf(cam.position);
    gsap.killTweensOf(ctrl.target);
    gsap.to(cam.position, { x: pos[0], y: pos[1], z: pos[2], duration, ease: 'power2.inOut' });
    gsap.to(ctrl.target, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration,
      ease: 'power2.inOut',
      onUpdate: () => ctrl.update(),
    });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isMobInit = container.clientWidth <= MOBILE_BREAKPOINT;
    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color('#d8eaf7');
    scene.background = horizonColor;
    // Atmospheric horizon fog dissolving distant edges seamlessly into the sky (pushed slightly back on mobile for zoomed-out framing)
    const fog = new THREE.Fog(horizonColor, isMobInit ? 760 : 520, isMobInit ? 1800 : 1420);
    scene.fog = fog;

    // Smooth blue sky dome that ALWAYS follows the camera so it can NEVER be clipped by camera.far!
    const skyGeo = new THREE.SphereGeometry(2000, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color('#5a9de0') },
        midColor: { value: new THREE.Color('#97c8f2') },
        horizonColor: { value: horizonColor },
      },
      vertexShader: `
        varying vec3 vLocalDir;
        void main() {
          vLocalDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        varying vec3 vLocalDir;
        void main() {
          float h = max(vLocalDir.y, 0.0);
          float t1 = smoothstep(0.0, 0.22, h);
          float t2 = smoothstep(0.16, 0.68, h);
          vec3 col = mix(horizonColor, midColor, t1);
          col = mix(col, topColor, t2);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.frustumCulled = false;
    scene.add(skyDome);

    const initialFov = isMobInit ? MOBILE_FOV : 44;
    const camera = new THREE.PerspectiveCamera(initialFov, container.clientWidth / container.clientHeight, 2.5, 2600);
    const initHero = adaptPoseForMobile(
      data.heroCamera.pos,
      data.heroCamera.target,
      'hero',
      container.clientWidth,
      container.clientHeight
    );
    basePosRef.current = { x: initHero.pos[0], y: initHero.pos[1], z: initHero.pos[2] };
    baseTargetRef.current = { x: initHero.target[0], y: initHero.target[1], z: initHero.target[2] };
    camera.position.set(...initHero.pos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 12;
    controls.maxDistance = isMobInit ? 960 : 680;
    controls.target.set(...initHero.target);
    controls.enabled = freeExploreRef.current;
    controls.update();
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xf0f7ff, 0x7c8774, 0.92);
    scene.add(hemi);

    const shadowRes = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
    const sun = new THREE.DirectionalLight(0xfff9ee, 1.82);
    sun.position.set(160, 260, 140);
    sun.castShadow = true;
    sun.shadow.mapSize.width = shadowRes;
    sun.shadow.mapSize.height = shadowRes;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 1100;
    const d = 480;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.08;
    scene.add(sun);

    const loader = new GLTFLoader();
    loader.load(
      `./models/ecole_sainte_anne.glb?v=${__BUILD_ID__}`,
      (gltf) => {
        const root = gltf.scene;
        const classroomRoofs: THREE.Object3D[] = [];
        const roomMap = new Map<string, THREE.Mesh>();

        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = !isFlatGroundObject(mesh.name);
            mesh.receiveShadow = true;
            if (mesh.name === 'Terrain_Base') {
              // Replace square ground plane with a smooth circular disk
              const diskGeo = new THREE.CircleGeometry(952, 96);
              diskGeo.rotateX(-Math.PI / 2);
              diskGeo.translate(160, -0.12, -20);
              mesh.geometry.dispose();
              mesh.geometry = diskGeo;
            }
            if (isClassroomRoofObject(mesh)) {
              classroomRoofs.push(mesh);
            }
            const matchedRoom = data.rooms.find((r) => r.id === mesh.name || mesh.name.startsWith(`${r.id}_`));
            if (matchedRoom) {
              roomMap.set(mesh.name, mesh);
            }
          }
        });

        classroomRoofsRef.current = classroomRoofs;
        roomMeshesRef.current = roomMap;
        for (const r of classroomRoofs) {
          r.visible = !hideRoofsRef.current;
        }
        scene.add(root);
        onLoaded();
      },
      (xhr) => {
        if (xhr.total > 0) {
          onLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('GLB load error:', err);
        onLoadError('Impossible de charger le modèle 3D.');
      }
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!freeExploreRef.current) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        if (!hit.object.visible) continue;
        const name = hit.object.name;
        const room = data.rooms.find((r) => r.id === name || name.startsWith(`${r.id}_`));
        if (room) {
          onSelectRoom(room);
          return;
        }
        const bldg = data.buildings.find((b) => name.includes(b.id) || name.startsWith(b.meshPrefix));
        if (bldg) {
          onSelectBuilding(bldg);
          return;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onWindowResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      const isMob = w <= MOBILE_BREAKPOINT;
      camera.fov = isMob ? MOBILE_FOV : 44;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fog.near = isMob ? 760 : 520;
      fog.far = isMob ? 1800 : 1420;
      controls.maxDistance = isMob ? 960 : 680;
      renderer.setSize(w, h);
      const isSplitNow = !freeExploreRef.current && !isHeroRef.current;
      if (isSplitNow) {
        viewOffsetRef.current.x = w > MOBILE_BREAKPOINT ? -COL_WIDTH_PX / 2 : 0;
        viewOffsetRef.current.y = isMob ? h * 0.275 : 0;
      } else {
        viewOffsetRef.current.x = 0;
        viewOffsetRef.current.y = 0;
      }
      camera.setViewOffset(w, h, viewOffsetRef.current.x, viewOffsetRef.current.y, w, h);

      // Keep mobile framing cleanly adapted on orientation change
      if (!freeExploreRef.current) {
        if (isHeroRef.current) {
          const p = adaptPoseForMobile(data.heroCamera.pos, data.heroCamera.target, 'hero', w, h);
          basePosRef.current = { x: p.pos[0], y: p.pos[1], z: p.pos[2] };
          baseTargetRef.current = { x: p.target[0], y: p.target[1], z: p.target[2] };
        } else {
          const sc = data.scenes[activeSceneIndexRef.current];
          if (sc) {
            const fm = sc.id === 'classes' ? classBuildingFocusRef.current : 'all';
            const rawPos = fm !== 'all' ? CLASS_FOCUS_VIEWS[fm].pos : sc.camera.pos;
            const rawTgt = fm !== 'all' ? CLASS_FOCUS_VIEWS[fm].target : sc.camera.target;
            const key = fm !== 'all' ? fm : sc.id;
            const p = adaptPoseForMobile(rawPos, rawTgt, key, w, h);
            basePosRef.current = { x: p.pos[0], y: p.pos[1], z: p.pos[2] };
            baseTargetRef.current = { x: p.target[0], y: p.target[1], z: p.target[2] };
          }
        }
      }
    };
    window.addEventListener('resize', onWindowResize);

    let rafId = 0;
    let frameCount = 0;
    let prevTime = performance.now();
    let swayPhase = 0;
    const tmpVec = new THREE.Vector3();

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      const w = container.clientWidth;
      const h = container.clientHeight;

      if (!freeExploreRef.current) {
        swayPhase += dt * 0.28;
        const angle = Math.sin(swayPhase) * swayStateRef.current.amp;
        const zoomScale = 1 - Math.sin(swayPhase * 0.5) * swayStateRef.current.zoom;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const tx = baseTargetRef.current.x;
        const ty = baseTargetRef.current.y;
        const tz = baseTargetRef.current.z;
        const dx = (basePosRef.current.x - tx) * zoomScale;
        const dy = (basePosRef.current.y - ty) * zoomScale;
        const dz = (basePosRef.current.z - tz) * zoomScale;

        const rx = dx * cosA - dz * sinA;
        const rz = dx * sinA + dz * cosA;
        const ry = dy + Math.sin(swayPhase * 0.7) * swayStateRef.current.vert;

        camera.position.set(tx + rx, ty + ry, tz + rz);
        controls.target.set(tx, ty, tz);

        if (w > 0 && h > 0) {
          const ox = viewOffsetRef.current.x;
          const oy = viewOffsetRef.current.y;
          if (Math.abs(ox) > 0.2 || Math.abs(oy) > 0.2) {
            camera.setViewOffset(w, h, ox, oy, w, h);
          } else if (camera.view && camera.view.enabled) {
            camera.clearViewOffset();
          }
        }
        camera.lookAt(tx, ty, tz);
      } else {
        if (camera.view && camera.view.enabled) {
          camera.clearViewOffset();
        }
        controls.update();
      }

      skyDome.position.copy(camera.position);
      renderer.render(scene, camera);

      frameCount++;
      if (frameCount % 3 === 0) {
        if (!showLabelsRef.current || (isHeroRef.current && !freeExploreRef.current)) {
          setLabels((prev) => (prev.length ? [] : prev));
        } else {
          const activeScene = data.scenes[activeSceneIndexRef.current];
          const focusIds = !freeExploreRef.current ? activeScene?.focusLabels : undefined;
          const leftBound = !freeExploreRef.current && !isHeroRef.current && w > 860 ? COL_WIDTH_PX + 12 : 12;
          const bottomBound = !freeExploreRef.current && !isHeroRef.current && w <= 860 ? h * 0.45 - 12 : h - 12;

          const isMobileNow = w <= MOBILE_BREAKPOINT;
          const focusMode = !freeExploreRef.current && activeScene?.id === 'classes' ? classBuildingFocusRef.current : 'all';
          const allowedBuildings = focusMode !== 'all' ? CLASS_FOCUS_VIEWS[focusMode].buildings : null;
          // On mobile in "Les salles de classe" overview (Vue globale), show the 4 building labels instead of 20 cramped rooms;
          // tapping Cycle 1 / Cycle 2 / Cycle 3 zooms in and reveals all individual rooms cleanly. Desktop is untouched.
          const mobileClassesOverview =
            isMobileNow && !freeExploreRef.current && activeScene?.id === 'classes' && focusMode === 'all';
          const effectiveFocusIds = mobileClassesOverview
            ? ['Batiment_Principal_S1', 'Batiment_Nord_N1', 'Batiment_Est_E2', 'Batiment_Sud_Maternelle_S2']
            : focusIds;

          const items = hideRoofsRef.current && !mobileClassesOverview
            ? data.rooms
                .filter((r) => !allowedBuildings || allowedBuildings.includes(r.building))
                .map((r) => ({
                  id: r.id,
                  label: r.name,
                  color: r.color,
                  pos: r.position,
                  kind: 'room' as const,
                  offsetOutside: !isMobileNow && focusMode === 'all' && r.building === 'Batiment_Nord_N1',
                  offsetAbove: !isMobileNow && focusMode === 'all' && r.building === 'Batiment_Est_E2',
                }))
            : data.buildings
                .filter((b) => !effectiveFocusIds || effectiveFocusIds.includes(b.id))
                .map((b) => ({
                  id: b.id,
                  label: b.name,
                  color: b.color,
                  pos: [b.position[0], b.position[1] + b.height_m * 0.92, b.position[2]] as [number, number, number],
                  kind: 'building' as const,
                  offsetOutside: false,
                  offsetAbove: false,
                }));

          const next: ProjectedLabel[] = [];
          for (const it of items) {
            tmpVec.set(it.pos[0], it.pos[1], it.pos[2]).project(camera);
            const ax = (tmpVec.x * 0.5 + 0.5) * w;
            const ay = (-tmpVec.y * 0.5 + 0.5) * h;
            const visible = tmpVec.z < 1 && ax >= leftBound && ax <= w - 12 && ay >= 18 && ay <= bottomBound;
            if (isMobileNow) {
              next.push({ id: it.id, label: it.label, color: it.color, ax, ay, x: ax, y: ay - 24, visible, kind: it.kind });
            } else {
              // Desktop (untouched): Place Bureau directrice label BELOW its room (stem pointing UP), N1 up-left, E2 above
              const isDirectrice = it.id === 'Bureau_Directrice';
              const initX = isDirectrice ? ax + 10 : it.offsetOutside ? ax - 42 : ax;
              const initY = isDirectrice ? ay + 46 : it.offsetOutside ? ay - 48 : it.offsetAbove ? ay - 42 : ay - 22;
              next.push({ id: it.id, label: it.label, color: it.color, ax, ay, x: initX, y: initY, visible, kind: it.kind });
            }
          }
          if (isMobileNow) {
            resolveMobileLabelOverlaps(next, leftBound, w - 30, 54, bottomBound);
          } else {
            resolveLabelOverlaps(next, leftBound, w - 12, 18, bottomBound);
          }
          setLabels(next);
        }
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onWindowResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  // Sync freeExplore toggle cleanly
  useEffect(() => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.enabled = freeExplore;
    }
    if (freeExplore) {
      gsap.killTweensOf(viewOffsetRef.current);
      viewOffsetRef.current.x = 0;
      viewOffsetRef.current.y = 0;
      if (cam && cam.view && cam.view.enabled) {
        cam.clearViewOffset();
      }
    } else if (cam && ctrl) {
      // Seed base pose from current free camera so returning to guided tour transitions smoothly
      basePosRef.current.x = cam.position.x;
      basePosRef.current.y = cam.position.y;
      basePosRef.current.z = cam.position.z;
      baseTargetRef.current.x = ctrl.target.x;
      baseTargetRef.current.y = ctrl.target.y;
      baseTargetRef.current.z = ctrl.target.z;
    }
  }, [freeExplore]);

  // Guided camera, frustum offset (zero-stutter split framing), and sway amplitude
  useEffect(() => {
    if (freeExplore) return;
    const container = mountRef.current;
    const w = container?.clientWidth || window.innerWidth;
    const h = container?.clientHeight || window.innerHeight;

    const targetOffX = !isHero && w > 860 ? -COL_WIDTH_PX / 2 : 0;
    const targetOffY = !isHero && w <= 860 ? h * 0.275 : 0;

    gsap.killTweensOf(viewOffsetRef.current);
    gsap.to(viewOffsetRef.current, {
      x: targetOffX,
      y: targetOffY,
      duration: 1.1,
      ease: 'power2.inOut',
    });

    const sc = !isHero ? data.scenes[activeSceneIndex] : undefined;
    const targetAmp = isHero ? 0.145 : (sc?.swayAmp ?? 0.105);
    const targetVert = isHero ? 1.5 : sc?.id === 'sport' ? 2.2 : 0.85;
    const targetZoom = sc?.id === 'sport' ? 0.065 : isHero ? 0.03 : 0.025;

    gsap.killTweensOf(swayStateRef.current);
    gsap.to(swayStateRef.current, {
      amp: targetAmp,
      vert: targetVert,
      zoom: targetZoom,
      duration: 1.15,
      ease: 'power2.inOut',
    });

    if (isHero) {
      const p = adaptPoseForMobile(data.heroCamera.pos, data.heroCamera.target, 'hero', w, h);
      animateGuidedCamera(p.pos, p.target, 1.25);
      return;
    }
    if (sc) {
      if (sc.id === 'classes' && classBuildingFocus !== 'all') {
        const sub = CLASS_FOCUS_VIEWS[classBuildingFocus];
        const p = adaptPoseForMobile(sub.pos, sub.target, classBuildingFocus, w, h);
        animateGuidedCamera(p.pos, p.target, 1.05);
      } else {
        const p = adaptPoseForMobile(sc.camera.pos, sc.camera.target, sc.id, w, h);
        animateGuidedCamera(p.pos, p.target, 1.35);
      }
    }
  }, [isHero, activeSceneIndex, freeExplore, classBuildingFocus, data]);

  useEffect(() => {
    for (const r of classroomRoofsRef.current) {
      r.visible = !hideRoofs;
    }
  }, [hideRoofs]);

  useEffect(() => {
    roomMeshesRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (selectedRoom && (selectedRoom.id === id || id.startsWith(`${selectedRoom.id}_`))) {
        mat.emissive = new THREE.Color('#1e5f8a');
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive = new THREE.Color('#000000');
        mat.emissiveIntensity = 0;
      }
    });
    if (selectedRoom) {
      const [x, y, z] = selectedRoom.position;
      animateFreeCamera([x - 16, y + 20, z + 18], [x, y, z], 1.0);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedBuilding) {
      animateFreeCamera(selectedBuilding.cameraOffset, selectedBuilding.position, 1.05);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (!cameraPresetTrigger) return;
    const raw = PRESET_VIEWS[cameraPresetTrigger.preset];
    if (!raw) return;
    const container = mountRef.current;
    const w = container?.clientWidth || window.innerWidth;
    const h = container?.clientHeight || window.innerHeight;
    const p = adaptPoseForMobile(raw.pos, raw.target, cameraPresetTrigger.preset, w, h);
    animateFreeCamera(p.pos, p.target, 1.05);
  }, [cameraPresetTrigger]);

  return (
    <div className="viewport-frame">
      <div className={`canvas-container ${freeExplore ? 'interactive' : 'scroll-locked'}`} ref={mountRef} />
      {showLabels && !(isHero && !freeExplore) && (
        <div className="labels-layer">
          <svg className="labels-lines" aria-hidden="true">
            {labels
              .filter((l) => l.visible)
              .map((l) => (
                <g key={`line-${l.id}`}>
                  <line x1={l.ax} y1={l.ay} x2={l.x} y2={l.y} className="label-leader" />
                  <circle cx={l.ax} cy={l.ay} r={2.8} fill={l.color || '#111827'} className="label-anchor-dot" />
                </g>
              ))}
          </svg>
          {labels
            .filter((l) => l.visible)
            .map((l) => {
              const isSelected = selectedRoom?.id === l.id || selectedBuilding?.id === l.id;
              return (
                <div
                  key={l.id}
                  className={`label-pin ${isSelected ? 'selected' : ''} ${freeExplore ? 'clickable' : ''}`}
                  style={{ left: `${l.x}px`, top: `${l.y}px` }}
                  onClick={() => {
                    if (!freeExplore) return;
                    if (l.kind === 'room') {
                      const r = data.rooms.find((x) => x.id === l.id);
                      if (r) onSelectRoom(r);
                    } else {
                      const b = data.buildings.find((x) => x.id === l.id);
                      if (b) onSelectBuilding(b);
                    }
                  }}
                >
                  <span
                    className="label-pill"
                    style={l.color && !isSelected ? { borderColor: `${l.color}66` } : undefined}
                  >
                    {l.color && <span className="label-dot" style={{ background: l.color }} />}
                    {l.label}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
