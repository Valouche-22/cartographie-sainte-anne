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
  onSelectBuilding: (b: BuildingInfo) => void;
  onSelectRoom: (r: RoomInfo) => void;
  onLoadProgress: (pct: number) => void;
  onLoaded: () => void;
  onLoadError: (msg: string) => void;
}

interface ProjectedLabel {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
  kind: 'building' | 'room';
  color?: string;
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

const PRESET_VIEWS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  general: { pos: [-74, 46, 82], target: [10, 0, 8] },
  cantine: { pos: [90, 44, 92], target: [32, 0, 32] },
  church: { pos: [-252, 54, 4], target: [-142, 16, -64] },
  culture: { pos: [-141, 65, -106], target: [-189, 2, -196] },
  stadium: { pos: [126, 100, 192], target: [372, 0, 113] },
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
  showLabelsRef.current = showLabels;
  hideRoofsRef.current = hideRoofs;
  freeExploreRef.current = freeExplore;
  isHeroRef.current = isHero;
  activeSceneIndexRef.current = activeSceneIndex;

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dce8f3');
    scene.fog = new THREE.Fog('#dce8f3', 750, 2100);

    const camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.5, 2600);
    camera.position.set(...data.heroCamera.pos);
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
    controls.maxDistance = 680;
    controls.target.set(...data.heroCamera.target);
    controls.enabled = freeExploreRef.current;
    controls.update();
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xf0f7ff, 0x7c8774, 0.92);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff9ee, 1.82);
    sun.position.set(160, 260, 140);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 1100;
    const d = 480;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
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
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (isClassroomRoofObject(mesh)) {
              classroomRoofs.push(mesh);
            }
            if (mesh.name.startsWith('Classe_')) {
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
        const room = data.rooms.find((r) => r.id === name);
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
      camera.aspect = w / h;
      renderer.setSize(w, h);
      const isSplitNow = !freeExploreRef.current && !isHeroRef.current;
      if (isSplitNow) {
        viewOffsetRef.current.x = w > 860 ? -COL_WIDTH_PX / 2 : 0;
        viewOffsetRef.current.y = w <= 860 ? h * 0.23 : 0;
      } else {
        viewOffsetRef.current.x = 0;
        viewOffsetRef.current.y = 0;
      }
      camera.setViewOffset(w, h, viewOffsetRef.current.x, viewOffsetRef.current.y, w, h);
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

      renderer.render(scene, camera);

      frameCount++;
      if (frameCount % 3 === 0) {
        if (!showLabelsRef.current || (isHeroRef.current && !freeExploreRef.current)) {
          setLabels((prev) => (prev.length ? [] : prev));
        } else {
          const activeScene = data.scenes[activeSceneIndexRef.current];
          const focusIds = !freeExploreRef.current ? activeScene?.focusLabels : undefined;
          const leftBound = !freeExploreRef.current && !isHeroRef.current && w > 860 ? COL_WIDTH_PX + 12 : 12;
          const bottomBound = !freeExploreRef.current && !isHeroRef.current && w <= 860 ? h * 0.52 : h - 12;

          const items = hideRoofsRef.current
            ? data.rooms
              .filter((r) => r.category === 'classe')
              .map((r) => ({ id: r.id, label: r.name, color: r.color, pos: r.position, kind: 'room' as const }))
            : data.buildings
              .filter((b) => !focusIds || focusIds.includes(b.id))
              .map((b) => ({
                id: b.id,
                label: b.name,
                color: undefined,
                pos: [b.position[0], b.position[1] + b.height_m * 0.92, b.position[2]] as [number, number, number],
                kind: 'building' as const,
              }));

          const next: ProjectedLabel[] = [];
          for (const it of items) {
            tmpVec.set(it.pos[0], it.pos[1], it.pos[2]).project(camera);
            const x = (tmpVec.x * 0.5 + 0.5) * w;
            const y = (-tmpVec.y * 0.5 + 0.5) * h;
            const visible = tmpVec.z < 1 && x >= leftBound && x <= w - 12 && y >= 18 && y <= bottomBound;
            next.push({ id: it.id, label: it.label, color: it.color, x, y, visible, kind: it.kind });
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
    const targetOffY = !isHero && w <= 860 ? h * 0.23 : 0;

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
      animateGuidedCamera(data.heroCamera.pos, data.heroCamera.target, 1.25);
      return;
    }
    if (sc) {
      animateGuidedCamera(sc.camera.pos, sc.camera.target, 1.35);
    }
  }, [isHero, activeSceneIndex, freeExplore, data]);

  useEffect(() => {
    for (const r of classroomRoofsRef.current) {
      r.visible = !hideRoofs;
    }
  }, [hideRoofs]);

  useEffect(() => {
    roomMeshesRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (selectedRoom && selectedRoom.id === id) {
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
    const p = PRESET_VIEWS[cameraPresetTrigger.preset];
    if (p) animateFreeCamera(p.pos, p.target, 1.05);
  }, [cameraPresetTrigger]);

  return (
    <div className="viewport-frame">
      <div className={`canvas-container ${freeExplore ? 'interactive' : 'scroll-locked'}`} ref={mountRef} />
      {showLabels && !(isHero && !freeExplore) && (
        <div className="labels-layer">
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
                  <span className="label-pill">
                    {l.color && <span className="label-dot" style={{ background: l.color }} />}
                    {l.label}
                  </span>
                  <span className="label-stem" />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
