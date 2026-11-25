import * as THREE from 'three';

export interface ColliderEntry {
  mesh: THREE.Mesh;
  box: THREE.Box3;
}

export interface WalkSpawnPreset {
  id: string;
  label: string;
  pos: [number, number, number];
  yaw: number;
}

export const WALK_TELEPORT_PRESETS: WalkSpawnPreset[] = [
  { id: 'cour', label: 'Cour élémentaire', pos: [-14, 0.06, 4], yaw: -0.7 },
  { id: 'maternelle', label: 'Cour maternelle', pos: [17, 0.06, 29], yaw: 2.5 },
  { id: 'cantine', label: 'Cantine / Périscolaire', pos: [28, 0.06, 38], yaw: 0.4 },
  { id: 'eglise', label: 'Église', pos: [-174, 0.06, -56], yaw: -1.1 },
  { id: 'culture', label: 'Médiathèque / Ville Robert', pos: [-194, 0.06, -190], yaw: 0.6 },
  { id: 'stadium', label: 'Complexe sportif', pos: [305, 0.06, 118], yaw: -1.4 },
];

const NON_COLLIDER_PREFIXES = [
  'Toit_',
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

export function buildWalkColliders(root: THREE.Object3D): {
  colliders: ColliderEntry[];
  stepSurfaces: ColliderEntry[];
  gateLeaves: THREE.Object3D[];
} {
  root.updateMatrixWorld(true);
  const colliders: ColliderEntry[] = [];
  const stepSurfaces: ColliderEntry[] = [];
  const gateLeaves: THREE.Object3D[] = [];

  root.traverse((obj) => {
    if (obj.name.startsWith('Portail_Principal_Vantaux') || obj.name.startsWith('Portail_Secondaire_Vantaux')) {
      gateLeaves.push(obj);
    }
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const name = mesh.name;
    if (!name) return;

    // Exclude tree canopies (walk under trees, collide with trunks!)
    if (name.includes('_Couronne_')) return;

    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;

    if (WALKABLE_PLATFORM_PREFIXES.some((p) => name.startsWith(p)) && box.max.y > 0.04 && box.max.y < 4.0) {
      stepSurfaces.push({ mesh, box });
    }

    if (NON_COLLIDER_PREFIXES.some((p) => name.startsWith(p))) return;
    if (name.endsWith('_Sol') || name.endsWith('_Ligne')) return;

    // Ignore very flat ground strips or high overhead beams/awnings above player head
    const height = box.max.y - box.min.y;
    if (box.max.y < 0.24 || height < 0.16) return;
    if (box.min.y > 2.15) return;

    colliders.push({ mesh, box });
  });

  return { colliders, stepSurfaces, gateLeaves };
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

  // Torso (centered at y = 0.98)
  const torso = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), sweaterMat));
  torso.position.y = 0.98;
  bodyGroup.add(torso);

  // Subtle white collar accent
  const collar = enableShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 12), collarMat));
  collar.position.y = 1.25;
  bodyGroup.add(collar);

  // School backpack on the back (+z is back, -z is forward facing)
  const backpack = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.16), packMat));
  backpack.position.set(0, 1.0, 0.18);
  bodyGroup.add(backpack);

  const packPocket = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), packAccentMat));
  packPocket.position.set(0, 0.91, 0.27);
  bodyGroup.add(packPocket);

  // Head group (pivoted at neck y = 1.28)
  const head = new THREE.Group();
  head.position.set(0, 1.28, 0);
  bodyGroup.add(head);

  const headMesh = enableShadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), skinMat));
  headMesh.position.y = 0.18;
  head.add(headMesh);

  // Stylized hair cap
  const hairCap = enableShadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.188, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat)
  );
  hairCap.position.set(0, 0.2, 0.015);
  hairCap.rotation.x = 0.18;
  head.add(hairCap);

  // Minimalist eyes on the front (-z)
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
  leftEye.position.set(-0.065, 0.19, -0.165);
  head.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
  rightEye.position.set(0.065, 0.19, -0.165);
  head.add(rightEye);

  // Articulated arms (pivoted at shoulder y = 1.18)
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

  // Articulated legs (pivoted at hip y = 0.72)
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

  // Soft contact shadow disc on ground
  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.08;
  root.add(shadowDisc);

  return { root, bodyGroup, leftArm, rightArm, leftLeg, rightLeg, head, shadowDisc };
}

const RAY_DIRS_8: THREE.Vector3[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
});

const DOWN_DIR = new THREE.Vector3(0, -1, 0);

export class ThirdPersonWalkController {
  public readonly rig: CharacterRig;
  public pos = new THREE.Vector3(-14, 0, 4);
  public velY = 0;
  public onGround = true;
  public charYaw = -0.7;
  public camYaw = -0.7;
  public camPitch = 0.34;
  public camDist = 8.4;

  private active = false;
  private keys = new Set<string>();
  private dragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private walkPhase = 0;
  private smoothSpeed = 0;

  private colliders: ColliderEntry[] = [];
  private stepSurfaces: ColliderEntry[] = [];
  private gateLeaves: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private tmpOrigin = new THREE.Vector3();
  private tmpNormal = new THREE.Vector3();
  private tmpNormalMat = new THREE.Matrix3();
  private tmpCamTarget = new THREE.Vector3();
  private tmpCamDesired = new THREE.Vector3();
  private tmpCamDir = new THREE.Vector3();
  private nearbyMeshes: THREE.Mesh[] = [];
  private nearbyStepMeshes: THREE.Mesh[] = [];

  private domElement: HTMLElement;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: () => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;

  constructor(scene: THREE.Scene, domElement: HTMLElement) {
    this.domElement = domElement;
    this.rig = createCharacterRig();
    this.rig.root.visible = false;
    scene.add(this.rig.root);

    this.onKeyDownBound = (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
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

    this.onPointerDownBound = (e) => {
      if (!this.active) return;
      if (e.button !== 0 && e.button !== 2) return;
      this.dragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    this.onPointerMoveBound = (e) => {
      if (!this.active || !this.dragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.camYaw -= dx * 0.0055;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.06, 1.18);
    };

    this.onPointerUpBound = () => {
      this.dragging = false;
    };

    this.onWheelBound = (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.006, 4.2, 18.0);
    };

    this.onContextMenuBound = (e) => {
      if (this.active) e.preventDefault();
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    domElement.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  public setWorldColliders(
    colliders: ColliderEntry[],
    stepSurfaces: ColliderEntry[],
    gateLeaves: THREE.Object3D[]
  ) {
    this.colliders = colliders;
    this.stepSurfaces = stepSurfaces;
    this.gateLeaves = gateLeaves;
    if (this.active) {
      for (const g of this.gateLeaves) g.visible = false;
    }
  }

  public setActive(enabled: boolean) {
    if (this.active === enabled) return;
    this.active = enabled;
    this.keys.clear();
    this.dragging = false;
    this.rig.root.visible = enabled;

    // Open school gates smoothly (hide closed leaves) while exploring on foot, restore on exit
    for (const g of this.gateLeaves) {
      g.visible = !enabled;
    }

    if (enabled) {
      this.teleportTo(WALK_TELEPORT_PRESETS[0]);
    }
  }

  public teleportTo(preset: WalkSpawnPreset) {
    this.pos.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    this.velY = 0;
    this.onGround = true;
    this.charYaw = preset.yaw;
    this.camYaw = preset.yaw;
    this.camPitch = 0.34;
    this.gatherNearby(this.pos.x, this.pos.y, this.pos.z, 3.0);
    this.resolveHorizontalCollisions(0.45);
    this.syncRigTransform();
  }

  private gatherNearby(cx: number, cy: number, cz: number, horizPad: number) {
    this.nearbyMeshes.length = 0;
    const minX = cx - horizPad;
    const maxX = cx + horizPad;
    const minZ = cz - horizPad;
    const maxZ = cz + horizPad;
    const minY = cy + 0.1;
    const maxY = cy + 2.0;

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const b = c.box;
      if (
        b.max.x >= minX &&
        b.min.x <= maxX &&
        b.max.z >= minZ &&
        b.min.z <= maxZ &&
        b.max.y >= minY &&
        b.min.y <= maxY &&
        c.mesh.visible
      ) {
        this.nearbyMeshes.push(c.mesh);
      }
    }
  }

  private sampleGroundHeight(cx: number, cy: number, cz: number): number {
    let groundY = 0.06;
    this.nearbyStepMeshes.length = 0;
    const pad = 0.65;
    for (let i = 0; i < this.stepSurfaces.length; i++) {
      const s = this.stepSurfaces[i];
      const b = s.box;
      if (
        b.max.x >= cx - pad &&
        b.min.x <= cx + pad &&
        b.max.z >= cz - pad &&
        b.min.z <= cz + pad &&
        s.mesh.visible
      ) {
        this.nearbyStepMeshes.push(s.mesh);
      }
    }
    if (this.nearbyStepMeshes.length === 0) return groundY;

    this.tmpOrigin.set(cx, cy + 0.65, cz);
    this.raycaster.set(this.tmpOrigin, DOWN_DIR);
    this.raycaster.near = 0;
    this.raycaster.far = cy + 1.2;
    const hits = this.raycaster.intersectObjects(this.nearbyStepMeshes, false);
    for (const h of hits) {
      if (h.point.y <= cy + 0.48 && h.point.y > groundY) {
        groundY = h.point.y;
      }
    }
    return groundY;
  }

  private resolveHorizontalCollisions(radius: number) {
    if (this.nearbyMeshes.length === 0) return;
    const rayHeights = [this.pos.y + 0.42, this.pos.y + 0.85, this.pos.y + 1.32];

    for (let iter = 0; iter < 2; iter++) {
      let pushed = false;
      for (let hIdx = 0; hIdx < rayHeights.length; hIdx++) {
        const ry = rayHeights[hIdx];
        for (let dIdx = 0; dIdx < RAY_DIRS_8.length; dIdx++) {
          const dir = RAY_DIRS_8[dIdx];
          this.tmpOrigin.set(this.pos.x, ry, this.pos.z);
          this.raycaster.set(this.tmpOrigin, dir);
          this.raycaster.near = 0;
          this.raycaster.far = radius + 0.04;
          const hits = this.raycaster.intersectObjects(this.nearbyMeshes, false);
          if (hits.length > 0) {
            const hit = hits[0];
            if (hit.distance < radius) {
              const pushDist = radius - hit.distance + 0.008;
              let nx = -dir.x;
              let nz = -dir.z;
              if (hit.face) {
                this.tmpNormalMat.getNormalMatrix(hit.object.matrixWorld);
                this.tmpNormal.copy(hit.face.normal).applyMatrix3(this.tmpNormalMat).normalize();
                const horizLen = Math.hypot(this.tmpNormal.x, this.tmpNormal.z);
                if (horizLen > 0.35) {
                  nx = this.tmpNormal.x / horizLen;
                  nz = this.tmpNormal.z / horizLen;
                  // Make sure normal pushes away from obstacle toward player
                  if (nx * dir.x + nz * dir.z > 0) {
                    nx = -nx;
                    nz = -nz;
                  }
                }
              }
              this.pos.x += nx * pushDist;
              this.pos.z += nz * pushDist;
              pushed = true;
            }
          }
        }
      }
      if (!pushed) break;
    }
  }

  private syncRigTransform() {
    this.rig.root.position.set(this.pos.x, 0, this.pos.z);
    this.rig.bodyGroup.position.y = this.pos.y;
    this.rig.bodyGroup.rotation.y = this.charYaw;

    // Grounded shadow fades gently while jumping
    const heightAboveGround = Math.max(0, this.pos.y);
    const s = Math.max(0.45, 1 - heightAboveGround * 0.25);
    this.rig.shadowDisc.scale.set(s, 1, s);
    (this.rig.shadowDisc.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.06,
      0.26 - heightAboveGround * 0.09
    );
  }

  public update(dt: number, camera: THREE.PerspectiveCamera) {
    if (!this.active) return;

    // Physical key codes: KeyW/A/S/D automatically map to Z/Q/S/D on French AZERTY and W/A/S/D on QWERTY!
    const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const right = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    const inputLen = Math.hypot(forward, right);
    const speed = sprinting ? 12.0 : 6.4;
    let moveX = 0;
    let moveZ = 0;

    if (inputLen > 0) {
      const nf = forward / inputLen;
      const nr = right / inputLen;
      // Camera forward on XZ plane is (-sin(camYaw), -cos(camYaw)); right is (cos(camYaw), -sin(camYaw))
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      moveX = (-sinY * nf + cosY * nr) * speed;
      moveZ = (-cosY * nf - sinY * nr) * speed;

      // Smoothly turn character toward movement direction (character front is -Z)
      const targetYaw = Math.atan2(-moveX, -moveZ);
      let diff = targetYaw - this.charYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.charYaw += diff * Math.min(1, dt * 13);
    }

    // Sub-step horizontal movement to prevent tunneling through thin fences
    const totalDx = moveX * dt;
    const totalDz = moveZ * dt;
    const totalDist = Math.hypot(totalDx, totalDz);
    const steps = Math.max(1, Math.ceil(totalDist / 0.16));
    const stepDx = totalDx / steps;
    const stepDz = totalDz / steps;
    const playerRadius = 0.44;

    this.gatherNearby(this.pos.x, this.pos.y, this.pos.z, Math.max(3.2, totalDist + 2.5));

    for (let s = 0; s < steps; s++) {
      this.pos.x += stepDx;
      this.pos.z += stepDz;
      this.resolveHorizontalCollisions(playerRadius);
    }

    // Keep player inside the circular world boundary
    const worldCenterX = 160;
    const worldCenterZ = -20;
    const maxWorldR = 660;
    const wx = this.pos.x - worldCenterX;
    const wz = this.pos.z - worldCenterZ;
    const wr = Math.hypot(wx, wz);
    if (wr > maxWorldR) {
      this.pos.x = worldCenterX + (wx / wr) * maxWorldR;
      this.pos.z = worldCenterZ + (wz / wr) * maxWorldR;
    }

    // Gravity + vertical ground/platform landing
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

    // Animate limbs smoothly based on ground speed / air state
    const targetSpeed = inputLen > 0 ? speed : 0;
    this.smoothSpeed += (targetSpeed - this.smoothSpeed) * Math.min(1, dt * 12);

    if (this.onGround && this.smoothSpeed > 0.25) {
      const freq = sprinting ? 14.5 : 10.2;
      this.walkPhase += dt * freq;
      const swing = Math.sin(this.walkPhase) * (sprinting ? 0.72 : 0.48);
      const bounce = Math.abs(Math.cos(this.walkPhase)) * (sprinting ? 0.08 : 0.045);
      this.rig.leftLeg.rotation.x = swing;
      this.rig.rightLeg.rotation.x = -swing;
      this.rig.leftArm.rotation.x = -swing * 0.85;
      this.rig.rightArm.rotation.x = swing * 0.85;
      this.rig.bodyGroup.position.y = this.pos.y + bounce;
    } else if (!this.onGround) {
      // Mid-air jump pose
      this.rig.leftLeg.rotation.x = 0.35;
      this.rig.rightLeg.rotation.x = -0.25;
      this.rig.leftArm.rotation.x = -0.65;
      this.rig.rightArm.rotation.x = -0.65;
      this.rig.bodyGroup.position.y = this.pos.y;
    } else {
      // Calm idle pose
      const decay = Math.min(1, dt * 10);
      this.rig.leftLeg.rotation.x *= 1 - decay;
      this.rig.rightLeg.rotation.x *= 1 - decay;
      this.rig.leftArm.rotation.x *= 1 - decay;
      this.rig.rightArm.rotation.x *= 1 - decay;
      this.rig.bodyGroup.position.y = this.pos.y;
    }

    this.syncRigTransform();
    if (this.onGround && this.smoothSpeed > 0.25) {
      const bounce = Math.abs(Math.cos(this.walkPhase)) * (sprinting ? 0.08 : 0.045);
      this.rig.bodyGroup.position.y = this.pos.y + bounce;
    }

    // Fortnite / Roblox over-the-shoulder third-person camera with wall-avoidance raycast
    this.tmpCamTarget.set(this.pos.x, this.pos.y + 1.48, this.pos.z);
    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist;
    this.tmpCamDesired.set(
      this.tmpCamTarget.x + Math.sin(this.camYaw) * horizDist,
      this.tmpCamTarget.y + vertDist,
      this.tmpCamTarget.z + Math.cos(this.camYaw) * horizDist
    );

    // Pull camera cleanly forward if a solid wall sits between character and camera
    this.tmpCamDir.subVectors(this.tmpCamDesired, this.tmpCamTarget);
    const desiredLen = this.tmpCamDir.length();
    let finalDist = desiredLen;
    if (desiredLen > 0.1 && this.colliders.length > 0) {
      this.tmpCamDir.divideScalar(desiredLen);
      this.gatherNearby(
        (this.tmpCamTarget.x + this.tmpCamDesired.x) * 0.5,
        this.pos.y,
        (this.tmpCamTarget.z + this.tmpCamDesired.z) * 0.5,
        desiredLen * 0.55 + 2.0
      );
      if (this.nearbyMeshes.length > 0) {
        this.raycaster.set(this.tmpCamTarget, this.tmpCamDir);
        this.raycaster.near = 0.2;
        this.raycaster.far = desiredLen;
        const camHits = this.raycaster.intersectObjects(this.nearbyMeshes, false);
        if (camHits.length > 0) {
          finalDist = Math.max(1.6, camHits[0].distance - 0.35);
        }
      }
      this.tmpCamDesired.copy(this.tmpCamTarget).addScaledVector(this.tmpCamDir, finalDist);
    }

    this.tmpCamDesired.y = Math.max(0.6, this.tmpCamDesired.y);
    camera.position.lerp(this.tmpCamDesired, Math.min(1, dt * 14));
    camera.lookAt(this.tmpCamTarget);
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    this.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
  }
}
