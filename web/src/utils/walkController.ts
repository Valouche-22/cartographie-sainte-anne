import * as THREE from 'three';

export interface WallSeg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  minY: number;
  maxY: number;
}

export interface StepBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
}

export interface WalkWorldData {
  grid: Map<string, WallSeg[]>;
  cellSize: number;
  stepBoxes: StepBox[];
  gateLeaves: THREE.Object3D[];
}

export interface WalkSpawnPreset {
  id: string;
  keyNum: string;
  label: string;
  pos: [number, number, number];
  yaw: number;
}

export const WALK_TELEPORT_PRESETS: WalkSpawnPreset[] = [
  { id: 'cour', keyNum: '1', label: 'Cour élémentaire', pos: [-14, 0.06, 4], yaw: -0.7 },
  { id: 'maternelle', keyNum: '2', label: 'Cour maternelle', pos: [17, 0.06, 29], yaw: 2.5 },
  { id: 'cantine', keyNum: '3', label: 'Cantine / Périscolaire', pos: [46, 0.06, 30], yaw: 0.7 },
  { id: 'eglise', keyNum: '4', label: 'Église', pos: [-174, 0.06, -56], yaw: -1.35 },
  { id: 'culture', keyNum: '5', label: 'Médiathèque / Ville Robert', pos: [-204, 0.06, -162], yaw: 0.3 },
  { id: 'stadium', keyNum: '6', label: 'Complexe sportif', pos: [305, 0.06, 118], yaw: -1.4 },
];

const NON_COLLIDER_PREFIXES = [
  'Toit_',
  'Contexte_Toit',
  'Contexte_Bourg_Toits',
  'Terrain_Base',
  'Route_',
  'Sol_',
  'Cour_',
  'Parvis_Eglise',
  'Parvis_Allee',
  'Parvis_Mediatheque',
  'Parvis_Passage',
  'Parvis_Terrasse',
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
  'Allee_',
  'Sentier_',
  'VilleRobert_Cour',
  'Skatepark_Dalle',
  'Portail_Principal_Vantaux',
  'Portail_Secondaire_Vantaux',
  'Ballon_Basket',
  'Classe_',
  'Salle_',
  'Bureau_',
  'Sanitaires_',
  'Local_',
  'Preau_Maternelles',
  'Poutre_Preau',
];

const WALKABLE_PLATFORM_PREFIXES = [
  'Parvis_Escalier_',
  'Escalier_',
  'Banc_',
  'Table_',
  'Bac_Sable_',
  'Skatepark_',
  'Theatre_Verdure',
  'Bordure_',
  'Muret_',
];

const CELL_SIZE = 8;

function cellKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function buildWalkWorldData(root: THREE.Object3D): WalkWorldData {
  root.updateMatrixWorld(true);
  const grid = new Map<string, WallSeg[]>();
  const stepBoxes: StepBox[] = [];
  const gateLeaves: THREE.Object3D[] = [];
  const dedupe = new Set<string>();

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const triN = new THREE.Vector3();
  const tmpBox = new THREE.Box3();

  const insertSeg = (x1: number, z1: number, x2: number, z2: number, minY: number, maxY: number) => {
    const lenSq = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (lenSq < 0.0025) return; // < 5cm

    // Canonicalize order & round to 5cm to merge paired quad triangles
    let ax = x1;
    let az = z1;
    let bx = x2;
    let bz = z2;
    if (ax > bx || (ax === bx && az > bz)) {
      ax = x2;
      az = z2;
      bx = x1;
      bz = z1;
    }
    const key = `${Math.round(ax * 20)},${Math.round(az * 20)},${Math.round(bx * 20)},${Math.round(bz * 20)},${Math.round(maxY * 5)}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);

    const seg: WallSeg = { x1: ax, z1: az, x2: bx, z2: bz, minY, maxY };
    const minCx = Math.floor(Math.min(ax, bx) / CELL_SIZE);
    const maxCx = Math.floor(Math.max(ax, bx) / CELL_SIZE);
    const minCz = Math.floor(Math.min(az, bz) / CELL_SIZE);
    const maxCz = Math.floor(Math.max(az, bz) / CELL_SIZE);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const k = cellKey(cx, cz);
        let arr = grid.get(k);
        if (!arr) {
          arr = [];
          grid.set(k, arr);
        }
        arr.push(seg);
      }
    }
  };

  root.traverse((obj) => {
    if (obj.name.startsWith('Portail_Principal_Vantaux') || obj.name.startsWith('Portail_Secondaire_Vantaux')) {
      gateLeaves.push(obj);
    }
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const name = mesh.name;
    if (!name || name.includes('_Couronne_')) return;

    tmpBox.setFromObject(mesh);
    if (tmpBox.isEmpty()) return;

    if (WALKABLE_PLATFORM_PREFIXES.some((p) => name.startsWith(p)) && tmpBox.max.y > 0.08 && tmpBox.max.y < 3.6) {
      stepBoxes.push({
        minX: tmpBox.min.x,
        maxX: tmpBox.max.x,
        minZ: tmpBox.min.z,
        maxZ: tmpBox.max.z,
        topY: tmpBox.max.y,
      });
    }

    if (NON_COLLIDER_PREFIXES.some((p) => name.startsWith(p))) return;
    if (name.endsWith('_Sol') || name.endsWith('_Ligne')) return;

    const h = tmpBox.max.y - tmpBox.min.y;
    if (tmpBox.max.y < 0.24 || h < 0.16) return;
    if (tmpBox.min.y > 2.2) return;

    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return;
    const idxAttr = geom.index;
    const triCount = idxAttr ? idxAttr.count / 3 : posAttr.count / 3;
    const matWorld = mesh.matrixWorld;

    for (let t = 0; t < triCount; t++) {
      const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
      const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;

      vA.fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
      vB.fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
      vC.fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

      const minY = Math.min(vA.y, vB.y, vC.y);
      const maxY = Math.max(vA.y, vB.y, vC.y);
      if (maxY < 0.22 || minY > 3.2) continue;

      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      triN.crossVectors(e1, e2);
      const nLen = triN.length();
      if (nLen < 1e-6) continue;

      // Only vertical / steep wall triangles block horizontal movement
      if (Math.abs(triN.y) / nLen > 0.72) continue;

      // Longest XZ edge of this vertical triangle represents its exact footprint segment
      const dAB = (vB.x - vA.x) * (vB.x - vA.x) + (vB.z - vA.z) * (vB.z - vA.z);
      const dBC = (vC.x - vB.x) * (vC.x - vB.x) + (vC.z - vB.z) * (vC.z - vB.z);
      const dCA = (vA.x - vC.x) * (vA.x - vC.x) + (vA.z - vC.z) * (vA.z - vC.z);

      if (dAB >= dBC && dAB >= dCA) {
        insertSeg(vA.x, vA.z, vB.x, vB.z, minY, maxY);
      } else if (dBC >= dAB && dBC >= dCA) {
        insertSeg(vB.x, vB.z, vC.x, vC.z, minY, maxY);
      } else {
        insertSeg(vC.x, vC.z, vA.x, vA.z, minY, maxY);
      }
    }
  });

  return { grid, cellSize: CELL_SIZE, stepBoxes, gateLeaves };
}

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  shadowDisc: THREE.Mesh;
}

export function createCharacterRig(): CharacterRig {
  const root = new THREE.Group();
  root.name = 'EasterEgg_Character';

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf4c7a1, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8 });
  const sweaterMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55 });
  const packAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  const enableShadow = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Torso
  const torso = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), sweaterMat));
  torso.position.y = 0.98;
  bodyGroup.add(torso);

  const collar = enableShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 12), collarMat));
  collar.position.y = 1.25;
  bodyGroup.add(collar);

  // School backpack on the back (+z)
  const backpack = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.16), packMat));
  backpack.position.set(0, 1.0, 0.18);
  bodyGroup.add(backpack);

  const packPocket = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), packAccentMat));
  packPocket.position.set(0, 0.91, 0.27);
  bodyGroup.add(packPocket);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.28, 0);
  bodyGroup.add(head);

  const headMesh = enableShadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), skinMat));
  headMesh.position.y = 0.18;
  head.add(headMesh);

  const hairCap = enableShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.188, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat)
  );
  hairCap.position.set(0, 0.2, 0.015);
  hairCap.rotation.x = 0.18;
  head.add(hairCap);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
  leftEye.position.set(-0.065, 0.19, -0.165);
  head.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
  rightEye.position.set(0.065, 0.19, -0.165);
  head.add(rightEye);

  // Arms
  const makeArm = (xSign: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xSign * 0.28, 1.18, 0);
    const sleeve = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), sweaterMat));
    sleeve.position.y = -0.17;
    pivot.add(sleeve);
    const hand = enableShadow(new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skinMat));
    hand.position.y = -0.38;
    pivot.add(hand);
    bodyGroup.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs
  const makeLeg = (xSign: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xSign * 0.115, 0.72, 0);
    const leg = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.16), pantsMat));
    leg.position.y = -0.29;
    pivot.add(leg);
    const shoe = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), shoeMat));
    shoe.position.set(0, -0.64, -0.04);
    pivot.add(shoe);
    bodyGroup.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Ground contact shadow
  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.08;
  root.add(shadowDisc);

  return { root, bodyGroup, leftArm, rightArm, leftLeg, rightLeg, head, shadowDisc };
}

export class ThirdPersonWalkController {
  public readonly rig: CharacterRig;
  public pos = new THREE.Vector3(-14, 0.06, 4);
  public velX = 0;
  public velZ = 0;
  public velY = 0;
  public onGround = true;
  public charYaw = -0.7;
  public camYaw = -0.7;
  public camPitch = 0.32;
  public camDist = 8.2;
  private smoothCamDist = 8.2;

  private active = false;
  private keys = new Set<string>();
  private dragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private walkPhase = 0;
  private wasPointerLocked = false;

  private world: WalkWorldData = {
    grid: new Map(),
    cellSize: CELL_SIZE,
    stepBoxes: [],
    gateLeaves: [],
  };

  private tmpCamTarget = new THREE.Vector3();
  private domElement: HTMLElement;
  private onRequestExit: () => void;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerUpBound: () => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onPointerLockChangeBound: () => void;

  constructor(scene: THREE.Scene, domElement: HTMLElement, onRequestExit: () => void) {
    this.domElement = domElement;
    this.onRequestExit = onRequestExit;
    this.rig = createCharacterRig();
    this.rig.root.visible = false;
    scene.add(this.rig.root);

    this.onKeyDownBound = (e) => {
      if (!this.active) return;

      // Number keys 1..6 teleport cleanly between all 6 school / Pordic spots (works with or without Shift on AZERTY + Numpad)
      let numKey: string | null = null;
      if (e.key >= '1' && e.key <= '6') {
        numKey = e.key;
      } else if (e.code.startsWith('Digit') && e.code.length === 6 && e.code[5] >= '1' && e.code[5] <= '6') {
        numKey = e.code[5];
      } else if (e.code.startsWith('Numpad') && e.code.length === 7 && e.code[6] >= '1' && e.code[6] <= '6') {
        numKey = e.code[6];
      }
      if (numKey) {
        const preset = WALK_TELEPORT_PRESETS.find((p) => p.keyNum === numKey);
        if (preset) {
          e.preventDefault();
          this.teleportTo(preset);
          return;
        }
      }

      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space' && this.onGround) {
        this.velY = 8.4;
        this.onGround = false;
      }
    };

    this.onKeyUpBound = (e) => {
      this.keys.delete(e.code);
    };

    this.onBlurBound = () => {
      this.keys.clear();
      this.dragging = false;
    };

    this.onMouseMoveBound = (e) => {
      if (!this.active) return;
      if (document.pointerLockElement === this.domElement) {
        // Guard against occasional OS pointer-lock jump spikes
        const mx = Math.abs(e.movementX) < 320 ? e.movementX : 0;
        const my = Math.abs(e.movementY) < 320 ? e.movementY : 0;
        this.camYaw -= mx * 0.0028;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + my * 0.0024, 0.05, 1.18);
      } else if (this.dragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.camYaw -= dx * 0.0045;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0038, 0.05, 1.18);
      }
    };

    this.onPointerDownBound = (e) => {
      if (!this.active) return;
      if (document.pointerLockElement !== this.domElement) {
        this.requestPointerLock();
      }
      if (e.button === 0 || e.button === 2) {
        this.dragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    };

    this.onPointerUpBound = () => {
      this.dragging = false;
    };

    this.onWheelBound = (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.0055, 4.0, 17.0);
    };

    this.onContextMenuBound = (e) => {
      if (this.active) e.preventDefault();
    };

    this.onPointerLockChangeBound = () => {
      const locked = document.pointerLockElement === this.domElement;
      if (this.wasPointerLocked && !locked && this.active) {
        // User pressed Escape while in Pointer Lock -> exit straight back to guided tour
        this.wasPointerLocked = false;
        this.onRequestExit();
        return;
      }
      this.wasPointerLocked = locked;
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    domElement.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    domElement.addEventListener('contextmenu', this.onContextMenuBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }

  public requestPointerLock() {
    if (!this.domElement.requestPointerLock) return;
    try {
      const res = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {
      // Ignore if browser rejects pointer lock outside direct gesture
    }
  }

  public releasePointerLock() {
    this.wasPointerLocked = false;
    if (document.pointerLockElement === this.domElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
  }

  public setWorldData(world: WalkWorldData) {
    this.world = world;
    if (this.active) {
      for (const g of this.world.gateLeaves) g.visible = false;
    }
  }

  public setActive(enabled: boolean) {
    if (this.active === enabled) return;
    this.active = enabled;
    this.keys.clear();
    this.dragging = false;
    this.velX = 0;
    this.velZ = 0;
    this.velY = 0;
    this.rig.root.visible = enabled;

    for (const g of this.world.gateLeaves) {
      g.visible = !enabled;
    }

    if (enabled) {
      this.teleportTo(WALK_TELEPORT_PRESETS[0]);
      this.requestPointerLock();
    } else {
      this.releasePointerLock();
    }
  }

  public teleportTo(preset: WalkSpawnPreset) {
    this.pos.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    this.velX = 0;
    this.velZ = 0;
    this.velY = 0;
    this.onGround = true;
    this.charYaw = preset.yaw;
    this.camYaw = preset.yaw;
    this.camPitch = 0.32;
    this.smoothCamDist = this.camDist;
    this.resolveHorizontalCollisions(0.44);
    this.syncRigTransform(0);
  }

  private sampleGroundHeight(cx: number, cy: number, cz: number): number {
    let groundY = 0.06;
    const boxes = this.world.stepBoxes;
    const pad = 0.25;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (cx >= b.minX - pad && cx <= b.maxX + pad && cz >= b.minZ - pad && cz <= b.maxZ + pad) {
        if (b.topY <= cy + 0.48 && b.topY > groundY) {
          groundY = b.topY;
        }
      }
    }
    return groundY;
  }

  private resolveHorizontalCollisions(radius: number) {
    const grid = this.world.grid;
    if (grid.size === 0) return;

    const rSq = radius * radius;
    const cs = this.world.cellSize;

    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const px = this.pos.x;
      const py = this.pos.y;
      const pz = this.pos.z;

      const minCx = Math.floor((px - radius) / cs);
      const maxCx = Math.floor((px + radius) / cs);
      const minCz = Math.floor((pz - radius) / cs);
      const maxCz = Math.floor((pz + radius) / cs);

      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const segs = grid.get(cellKey(cx, cz));
          if (!segs) continue;

          for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            // Respect vertical bounds so player can jump onto benches or over low curbs/fences
            if (s.maxY <= py + 0.26 || s.minY >= py + 1.82) continue;

            const vx = s.x2 - s.x1;
            const vz = s.z2 - s.z1;
            const lenSq = vx * vx + vz * vz;
            if (lenSq < 1e-6) continue;

            let t = ((this.pos.x - s.x1) * vx + (this.pos.z - s.z1) * vz) / lenSq;
            if (t < 0) t = 0;
            else if (t > 1) t = 1;

            const qx = s.x1 + t * vx;
            const qz = s.z1 + t * vz;
            const dx = this.pos.x - qx;
            const dz = this.pos.z - qz;
            const distSq = dx * dx + dz * dz;

            if (distSq < rSq && distSq > 1e-9) {
              const dist = Math.sqrt(distSq);
              const push = radius - dist + 0.002;
              this.pos.x += (dx / dist) * push;
              this.pos.z += (dz / dist) * push;
              moved = true;
            }
          }
        }
      }
      if (!moved) break;
    }
  }

  // Ultra-fast 2D ray-vs-segment camera obstruction check on the same spatial hash grid
  private computeCameraClearDistance(ox: number, oz: number, dx: number, dz: number, maxDist: number): number {
    const grid = this.world.grid;
    if (grid.size === 0) return maxDist;

    const ex = ox + dx * maxDist;
    const ez = oz + dz * maxDist;
    const cs = this.world.cellSize;
    const minCx = Math.floor(Math.min(ox, ex) / cs);
    const maxCx = Math.floor(Math.max(ox, ex) / cs);
    const minCz = Math.floor(Math.min(oz, ez) / cs);
    const maxCz = Math.floor(Math.max(oz, ez) / cs);

    let bestDist = maxDist;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const segs = grid.get(cellKey(cx, cz));
        if (!segs) continue;

        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          // Only tall walls / buildings obstruct the over-the-shoulder camera (ignore low benches/fences)
          if (s.maxY < 2.2) continue;

          const sx = s.x2 - s.x1;
          const sz = s.z2 - s.z1;
          const denom = dx * sz - dz * sx;
          if (Math.abs(denom) < 1e-6) continue;

          const qpx = s.x1 - ox;
          const qpz = s.z1 - oz;
          const t = (qpx * sz - qpz * sx) / denom;
          if (t <= 0.4 || t >= bestDist) continue;

          const u = (qpx * dz - qpz * dx) / denom;
          if (u >= 0 && u <= 1) {
            bestDist = t;
          }
        }
      }
    }

    return bestDist < maxDist ? Math.max(1.8, bestDist - 0.4) : maxDist;
  }

  private syncRigTransform(bounceY: number) {
    this.rig.root.position.set(this.pos.x, 0, this.pos.z);
    this.rig.bodyGroup.position.y = this.pos.y + bounceY;
    this.rig.bodyGroup.rotation.y = this.charYaw;

    const heightAboveGround = Math.max(0, this.pos.y - 0.06);
    const s = Math.max(0.45, 1 - heightAboveGround * 0.25);
    this.rig.shadowDisc.scale.set(s, 1, s);
    (this.rig.shadowDisc.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.06,
      0.24 - heightAboveGround * 0.08
    );
  }

  public update(dt: number, camera: THREE.PerspectiveCamera) {
    if (!this.active) return;

    const forward =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const right =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    const inputLen = Math.hypot(forward, right);
    const maxSpeed = sprinting ? 12.2 : 6.4;
    let targetVX = 0;
    let targetVZ = 0;

    if (inputLen > 0) {
      const nf = forward / inputLen;
      const nr = right / inputLen;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      targetVX = (-sinY * nf + cosY * nr) * maxSpeed;
      targetVZ = (-cosY * nf - sinY * nr) * maxSpeed;

      const targetYaw = Math.atan2(-targetVX, -targetVZ);
      let diff = targetYaw - this.charYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.charYaw += diff * (1 - Math.exp(-15 * dt));
    }

    // Frame-rate independent smooth acceleration & deceleration
    const accelFactor = 1 - Math.exp(-(inputLen > 0 ? 16 : 14) * dt);
    this.velX += (targetVX - this.velX) * accelFactor;
    this.velZ += (targetVZ - this.velZ) * accelFactor;

    const stepDist = Math.hypot(this.velX * dt, this.velZ * dt);
    const subSteps = Math.max(1, Math.ceil(stepDist / 0.16));
    const subDx = (this.velX * dt) / subSteps;
    const subDz = (this.velZ * dt) / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.pos.x += subDx;
      this.pos.z += subDz;
      this.resolveHorizontalCollisions(0.44);
    }

    // Clamp inside world disk
    const wx = this.pos.x - 160;
    const wz = this.pos.z + 20;
    const wr = Math.hypot(wx, wz);
    if (wr > 660) {
      this.pos.x = 160 + (wx / wr) * 660;
      this.pos.z = -20 + (wz / wr) * 660;
    }

    // Gravity + platform landing
    this.velY -= 22.0 * dt;
    this.pos.y += this.velY * dt;
    const groundY = this.sampleGroundHeight(this.pos.x, this.pos.y, this.pos.z);
    if (this.pos.y <= groundY) {
      this.pos.y = groundY;
      this.velY = 0;
      this.onGround = true;
    } else if (this.pos.y > groundY + 0.08) {
      this.onGround = false;
    }

    // Smooth procedural limb animation
    const curSpeed = Math.hypot(this.velX, this.velZ);
    let bounceY = 0;
    if (this.onGround && curSpeed > 0.3) {
      const freq = sprinting ? 14.5 : 10.2;
      this.walkPhase += dt * freq;
      const amp = Math.min(1, curSpeed / 6.4);
      const swing = Math.sin(this.walkPhase) * (sprinting ? 0.72 : 0.48) * amp;
      bounceY = Math.abs(Math.cos(this.walkPhase)) * (sprinting ? 0.08 : 0.045) * amp;
      this.rig.leftLeg.rotation.x = swing;
      this.rig.rightLeg.rotation.x = -swing;
      this.rig.leftArm.rotation.x = -swing * 0.85;
      this.rig.rightArm.rotation.x = swing * 0.85;
    } else if (!this.onGround) {
      this.rig.leftLeg.rotation.x = 0.35;
      this.rig.rightLeg.rotation.x = -0.25;
      this.rig.leftArm.rotation.x = -0.65;
      this.rig.rightArm.rotation.x = -0.65;
    } else {
      const decay = 1 - Math.exp(-12 * dt);
      this.rig.leftLeg.rotation.x *= 1 - decay;
      this.rig.rightLeg.rotation.x *= 1 - decay;
      this.rig.leftArm.rotation.x *= 1 - decay;
      this.rig.rightArm.rotation.x *= 1 - decay;
    }

    this.syncRigTransform(bounceY);

    // Zero-jitter Fortnite / Roblox camera tightly locked to player + smooth wall-pullback
    this.tmpCamTarget.set(this.pos.x, this.pos.y + 1.48, this.pos.z);
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);

    const horizMax = cosP * this.camDist;
    const clearHoriz = this.computeCameraClearDistance(
      this.tmpCamTarget.x,
      this.tmpCamTarget.z,
      sinY,
      cosY,
      horizMax
    );
    const desiredDist = cosP > 0.05 ? clearHoriz / cosP : this.camDist;
    const distRate = desiredDist < this.smoothCamDist ? 24 : 10;
    this.smoothCamDist += (desiredDist - this.smoothCamDist) * (1 - Math.exp(-distRate * dt));

    const camX = this.tmpCamTarget.x + sinY * cosP * this.smoothCamDist;
    const camY = Math.max(0.55, this.tmpCamTarget.y + sinP * this.smoothCamDist);
    const camZ = this.tmpCamTarget.z + cosY * cosP * this.smoothCamDist;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(this.tmpCamTarget);
  }

  public dispose() {
    this.releasePointerLock();
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
  }
}
