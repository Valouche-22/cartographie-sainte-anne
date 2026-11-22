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
  courFocus?: 'elementaire' | 'maternelle';
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

// Strategic per-label screen offsets (dx, dy in px) crafted specifically for mobile portrait views
// so every label sits in open margin space with ZERO overlapping pills and ZERO crossed leader lines.
// Desktop PC never calls resolveMobileLabelOverlaps and remains 100% untouched.
const MOBILE_LABEL_OFFSETS: Record<string, [number, number]> = {
  // École overview & Classes overview (4 corners around the campus)
  Batiment_Nord_N1: [-34, -68],
  Batiment_Est_E2: [16, -72],
  Batiment_Principal_S1: [-86, 62],
  Batiment_Sud_Maternelle_S2: [34, 58],
  // Cour & Cantine/Périscolaire
  Preau_Ecole: [-10, -56],
  Zone_Cour_Elementaire: [-18, 44],
  Zone_Cour_Maternelle: [18, 48],
  Batiment_Periscolaire: [-14, -56],
  Batiment_Cantine: [14, 54],
  // Bâtiment Cycle 1 (9 rooms arranged in a 360° clockwise perimeter ring — zero wire crossings)
  Classe_GS: [-58, -56],
  Salle_Sieste_Motricite: [-24, -76],
  Sanitaires_Ecole: [2, -62],
  Salle_Profs: [34, -76],
  Classe_PS_MS: [66, -40],
  Classe_TPS_PS_MS: [78, 12],
  Preau_Maternelles: [74, 42],
  Prefabrique: [10, 56],
  Classe_CP: [-54, 78],
  // Bâtiment Cycle 2 (4 above + 2 below in strict left-to-right order — zero wire crossings)
  Sanitaires_Nord: [-46, -54],
  Local_Photocopieuse: [-10, -86],
  Local_Materiel: [-20, -64],
  Classe_CE2: [36, -56],
  Bureau_Directrice: [-38, 62],
  Classe_CP_CE1: [44, 68],
  // Bâtiment Cycle 3 (alternating 3 above + 2 below in strict left-to-right order — zero wire crossings)
  Classe_CM2: [-34, -58],
  Classe_CE2_CM1: [4, -60],
  Local_APEL_OGEC: [16, -66],
  Classe_CM1_CM2: [-24, 58],
  Sanitaires_Est: [6, 64],
  // Pôle culturel (clean triangle framing all 3 landmarks)
  Parc_Mediatheque: [14, -62],
  Mediatheque_Ic: [-10, 68],
  Centre_Culturel_Ville_Robert: [-18, -64],
};

function resolveMobileLabelOverlaps(
  items: ProjectedLabel[],
  leftBound: number,
  rightBound: number,
  topBound: number,
  bottomBound: number
): ProjectedLabel[] {
  const vis = items.filter((it) => it.visible);
  if (vis.length === 0) return items;

  const boxes = vis.map((it) => {
    const rawW = it.label.length * 5.3 + (it.color ? 24 : 16);
    const wrapped = rawW > 148;
    const hw = Math.min(78, rawW * 0.5) + 4;
    const hh = wrapped ? 19 : 13;
    const preset = MOBILE_LABEL_OFFSETS[it.id];
    const tx = preset ? it.ax + preset[0] : it.ax;
    const ty = preset ? it.ay + preset[1] : it.ay - 58;
    return { it, hw, hh, tx, ty, hasPreset: !!preset };
  });

  // Fallback radial push only for labels without an explicit strategic offset
  if (boxes.length >= 2 && boxes.some((b) => !b.hasPreset)) {
    const cx = boxes.reduce((s, b) => s + b.it.ax, 0) / boxes.length;
    const cy = boxes.reduce((s, b) => s + b.it.ay, 0) / boxes.length;
    const minAy = Math.min(...boxes.map((b) => b.it.ay));
    const maxAy = Math.max(...boxes.map((b) => b.it.ay));
    for (const b of boxes) {
      if (b.hasPreset) continue;
      const vx = b.it.ax - cx;
      const vy = b.it.ay - cy;
      const len = Math.hypot(vx, vy) || 1;
      const nx = vx / len;
      const ny = vy / len;
      if (vy <= 0) {
        b.tx = b.it.ax + nx * 56;
        b.ty = Math.min(minAy - 30, b.it.ay - 54) + ny * 18;
      } else {
        b.tx = b.it.ax + nx * 56;
        b.ty = Math.max(maxAy + 28, b.it.ay + 50) + ny * 16;
      }
    }
  }

  for (const b of boxes) {
    b.it.x = b.tx;
    b.it.y = b.ty;
  }

  // Clamp inside safe mobile bounds (below top bar, left of right rail, above bottom card)
  const clampBox = (b: { it: ProjectedLabel; hw: number; hh: number }) => {
    b.it.x = Math.max(leftBound + b.hw, Math.min(rightBound - b.hw, b.it.x));
    b.it.y = Math.max(topBound + b.hh, Math.min(bottomBound - b.hh, b.it.y));
  };
  boxes.forEach(clampBox);

  // 48 iterations: gentle tether toward strategic target (tx, ty) during first 28, pure hard non-overlap during final 20
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
    if (iter < 28) {
      for (const b of boxes) {
        b.it.x += (b.tx - b.it.x) * 0.05;
        b.it.y += (b.ty - b.it.y) * 0.05;
      }
    }
    boxes.forEach(clampBox);
    if (!anyOverlap && iter >= 28) break;
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
  ecole: 0.95,
  cour: 1.0,
  'cour-maternelle': 0.95,
  classes: 0.96,
  'cantine-periscolaire': 0.98,
  eglise: 0.76,
  sport: 0.94,
  culture: 1.18,
  S1: 0.96,
  N1: 0.88,
  E2: 0.96,
  general: 1.0,
  cantine: 1.0,
  church: 0.78,
  stadium: 0.96,
};

function getMobileCardHeight(sceneIdx: number, viewportH: number): number {
  const card = document.querySelector<HTMLElement>(
    `.mobile-reel-slide[data-reel-index="${sceneIdx + 1}"] .mobile-reel-card`
  );
  if (card && card.offsetHeight > 80) {
    return card.offsetHeight;
  }
  return viewportH * 0.42;
}

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
  const baseScale = Math.min(2.55, Math.max(1.12, 0.52 / Math.max(hTan, 0.12)));
  const mult = MOBILE_SCENE_MULTS[sceneKey] ?? 1.0;
  const s = baseScale * mult;

  const adjTarget: [number, number, number] =
    sceneKey === 'culture' ? [-190, 2, -194] : target;

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

const COUR_MATERNELLE_VIEW: { pos: [number, number, number]; target: [number, number, number] } = {
  pos: [-12, 54, 68],
  target: [16, 0, 28],
};

// Exact 3D ground polygons in Three.js (x, z) matching user's red (élémentaire) & blue (maternelle) courtyard zones
const COUR_ELEMENTAIRE_POLY: [number, number][] = [
  [-22.8, -27.5],
  [5.2, -36.8],
  [11.0, -23.5],
  [17.8, -18.5],
  [13.4, -12.4],
  [1.7, -8.1],
  [2.4, -6.5],
  [-8.9, -2.3],
  [-3.6, 12.4],
  [-4.2, 13.2],
  [-34.8, 28.5],
  [-35.8, 31.0],
  [-42.5, 24.5],
  [-47.2, 20.0],
  [-47.2, 16.5],
  [-34.0, 5.0],
  [-32.5, -11.5],
  [-22.5, -16.5],
];

const COUR_MATERNELLE_POLY: [number, number][] = [
  [23.3, 12.6],
  [27.1, 11.2],
  [28.1, 13.6],
  [28.6, 15.9],
  [31.8, 24.5],
  [34.6, 32.0],
  [-1.8, 44.6],
  [-2.6, 40.2],
  [0.6, 39.0],
  [-0.5, 36.2],
  [2.3, 35.1],
  [1.2, 31.7],
  [4.6, 30.4],
  [10.7, 27.9],
  [8.5, 22.4],
  [13.3, 20.6],
  [13.9, 22.3],
  [21.4, 19.5],
  [19.3, 13.8],
  [22.7, 12.5],
];

function createCourZoneOverlay(pts: [number, number][], colorHex: string, ribbonWidth = 0.65) {
  const group = new THREE.Group();
  // Translucent ground fill on XZ plane (shape uses x, -z then rotateX(-PI/2) -> (x, 0, z))
  const shape = new THREE.Shape();
  pts.forEach(([x, z], idx) => {
    if (idx === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();

  const fillGeo = new THREE.ShapeGeometry(shape);
  fillGeo.rotateX(-Math.PI / 2);
  const fillMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.y = 0.14;
  fillMesh.renderOrder = 2;
  group.add(fillMesh);

  // Crisp flat perimeter ribbon (thick visible border on all WebGL drivers)
  const positions: number[] = [];
  const halfW = ribbonWidth * 0.5;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % n];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * halfW;
    const nz = (dx / len) * halfW;
    const ax = x1 + nx, az = z1 + nz;
    const bx = x1 - nx, bz = z1 - nz;
    const cx = x2 - nx, cz = z2 - nz;
    const dxp = x2 + nx, dzp = z2 + nz;
    positions.push(ax, 0.18, az, bx, 0.18, bz, cx, 0.18, cz);
    positions.push(ax, 0.18, az, cx, 0.18, cz, dxp, 0.18, dzp);
  }
  const borderGeo = new THREE.BufferGeometry();
  borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const borderMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.renderOrder = 3;
  group.add(borderMesh);

  return { group, fillMat, borderMat };
}

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
  courFocus = 'elementaire',
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
  const courOverlaysRef = useRef<{
    root: THREE.Group;
    elemFill: THREE.MeshBasicMaterial;
    elemBorder: THREE.MeshBasicMaterial;
    matFill: THREE.MeshBasicMaterial;
    matBorder: THREE.MeshBasicMaterial;
  } | null>(null);
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
  const courFocusRef = useRef(courFocus);
  showLabelsRef.current = showLabels;
  hideRoofsRef.current = hideRoofs;
  freeExploreRef.current = freeExplore;
  isHeroRef.current = isHero;
  activeSceneIndexRef.current = activeSceneIndex;
  classBuildingFocusRef.current = classBuildingFocus;
  courFocusRef.current = courFocus;

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

    // Courtyard zone overlays (red = élémentaire, blue = maternelle), visible only on the "La cour" step
    const courRoot = new THREE.Group();
    courRoot.visible = false;
    const elemOv = createCourZoneOverlay(COUR_ELEMENTAIRE_POLY, '#ef4444', 0.65);
    const matOv = createCourZoneOverlay(COUR_MATERNELLE_POLY, '#2563eb', 0.65);
    courRoot.add(elemOv.group);
    courRoot.add(matOv.group);
    scene.add(courRoot);
    courOverlaysRef.current = {
      root: courRoot,
      elemFill: elemOv.fillMat,
      elemBorder: elemOv.borderMat,
      matFill: matOv.fillMat,
      matBorder: matOv.borderMat,
    };

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
        if (isMob) {
          const cardH = getMobileCardHeight(activeSceneIndexRef.current, h);
          viewOffsetRef.current.y = Math.max(0, (cardH - 44) * 0.5);
        } else {
          viewOffsetRef.current.y = 0;
        }
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
            const isMatCour = sc.id === 'cour' && courFocusRef.current === 'maternelle';
            const rawPos = isMatCour
              ? COUR_MATERNELLE_VIEW.pos
              : fm !== 'all'
              ? CLASS_FOCUS_VIEWS[fm].pos
              : sc.camera.pos;
            const rawTgt = isMatCour
              ? COUR_MATERNELLE_VIEW.target
              : fm !== 'all'
              ? CLASS_FOCUS_VIEWS[fm].target
              : sc.camera.target;
            const key = isMatCour ? 'cour-maternelle' : fm !== 'all' ? fm : sc.id;
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
          const mobileCardH =
            !freeExploreRef.current && !isHeroRef.current && w <= MOBILE_BREAKPOINT
              ? getMobileCardHeight(activeSceneIndexRef.current, h)
              : 0;
          const bottomBound =
            !freeExploreRef.current && !isHeroRef.current && w <= MOBILE_BREAKPOINT
              ? h - mobileCardH - 12
              : h - 12;

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

          const isCourStep = !freeExploreRef.current && !isHeroRef.current && activeScene?.id === 'cour';
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
            : [
                ...data.buildings
                  .filter((b) => !effectiveFocusIds || effectiveFocusIds.includes(b.id))
                  .map((b) => ({
                    id: b.id,
                    label: b.name,
                    color: b.color,
                    pos: [b.position[0], b.position[1] + b.height_m * 0.92, b.position[2]] as [number, number, number],
                    kind: 'building' as const,
                    offsetOutside: false,
                    offsetAbove: false,
                  })),
                ...(isCourStep
                  ? [
                      {
                        id: 'Zone_Cour_Elementaire',
                        label: 'Cour élémentaire',
                        color: '#ef4444',
                        pos: [-16.5, 1.8, 4.5] as [number, number, number],
                        kind: 'building' as const,
                        offsetOutside: false,
                        offsetAbove: false,
                      },
                      {
                        id: 'Zone_Cour_Maternelle',
                        label: 'Cour maternelle',
                        color: '#2563eb',
                        pos: [16.5, 1.8, 29.0] as [number, number, number],
                        kind: 'building' as const,
                        offsetOutside: false,
                        offsetAbove: false,
                      },
                    ]
                  : []),
              ];

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

    const targetOffX = !isHero && w > MOBILE_BREAKPOINT ? -COL_WIDTH_PX / 2 : 0;
    const mobileCardH = !isHero && w <= MOBILE_BREAKPOINT ? getMobileCardHeight(activeSceneIndex, h) : 0;
    const targetOffY = !isHero && w <= MOBILE_BREAKPOINT ? Math.max(0, (mobileCardH - 44) * 0.5) : 0;

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
      } else if (sc.id === 'cour' && courFocus === 'maternelle') {
        const p = adaptPoseForMobile(COUR_MATERNELLE_VIEW.pos, COUR_MATERNELLE_VIEW.target, 'cour-maternelle', w, h);
        animateGuidedCamera(p.pos, p.target, 1.15);
      } else {
        const p = adaptPoseForMobile(sc.camera.pos, sc.camera.target, sc.id, w, h);
        animateGuidedCamera(p.pos, p.target, 1.35);
      }
    }
  }, [isHero, activeSceneIndex, freeExplore, classBuildingFocus, courFocus, data]);

  // Toggle & highlight red (élémentaire) and blue (maternelle) courtyard overlays on the "La cour" step
  useEffect(() => {
    const ov = courOverlaysRef.current;
    if (!ov) return;
    const sc = data.scenes[activeSceneIndex];
    const show = !freeExplore && !isHero && sc?.id === 'cour';
    ov.root.visible = show;
    if (!show) return;
    const isMat = courFocus === 'maternelle';
    ov.elemFill.opacity = isMat ? 0.08 : 0.2;
    ov.elemBorder.opacity = isMat ? 0.45 : 0.92;
    ov.matFill.opacity = isMat ? 0.22 : 0.08;
    ov.matBorder.opacity = isMat ? 0.94 : 0.48;
  }, [isHero, activeSceneIndex, freeExplore, courFocus, data]);

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
