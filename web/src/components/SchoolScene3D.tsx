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
  'Toit_Pavillon_Central_S4',
  'Toit_Annexe_Sud_S5',
  'Toit_Sas_Entree_S7',
  'Toit_Batiment_Nord_N1',
  'Toit_Batiment_Est_E2',
  'Toit_E2_Velux_',
];

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
  cantine: { pos: [96, 48, 102], target: [32, 0, 30] },
  church: { pos: [-252, 54, 4], target: [-142, 16, -64] },
  culture: { pos: [-260, 92, -60], target: [-202, 2, -190] },
  stadium: { pos: [148, 112, 245], target: [365, 0, 100] },
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

  const animateCamera = (pos: [number, number, number], target: [number, number, number], duration = 1.2) => {
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
    scene.fog = new THREE.Fog('#dce8f3', 700, 1900);

    const camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.5, 2400);
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
    controls.maxDistance = 650;
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
    sun.shadow.camera.far = 950;
    const d = 420;
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

    const syncSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);

    let rafId = 0;
    let frameCount = 0;
    const tmpVec = new THREE.Vector3();

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);

      frameCount++;
      if (frameCount % 3 === 0) {
        if (!showLabelsRef.current || (isHeroRef.current && !freeExploreRef.current)) {
          setLabels((prev) => (prev.length ? [] : prev));
        } else {
          const w = container.clientWidth;
          const h = container.clientHeight;
          const activeScene = data.scenes[activeSceneIndexRef.current];
          const focusIds = !freeExploreRef.current ? activeScene?.focusLabels : undefined;

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
            const visible = tmpVec.z < 1 && tmpVec.x >= -0.94 && tmpVec.x <= 0.94 && tmpVec.y >= -0.9 && tmpVec.y <= 0.94;
            next.push({ id: it.id, label: it.label, color: it.color, x, y, visible, kind: it.kind });
          }
          setLabels(next);
        }
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = freeExplore;
    }
  }, [freeExplore]);

  useEffect(() => {
    if (freeExplore) return;
    if (isHero) {
      animateCamera(data.heroCamera.pos, data.heroCamera.target, 1.15);
      return;
    }
    const sc = data.scenes[activeSceneIndex];
    if (sc) {
      animateCamera(sc.camera.pos, sc.camera.target, 1.2);
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
      animateCamera([x - 16, y + 20, z + 18], [x, y, z], 1.0);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedBuilding) {
      animateCamera(selectedBuilding.cameraOffset, selectedBuilding.position, 1.05);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (!cameraPresetTrigger) return;
    const p = PRESET_VIEWS[cameraPresetTrigger.preset];
    if (p) animateCamera(p.pos, p.target, 1.05);
  }, [cameraPresetTrigger]);

  const isSplit = !freeExplore && !isHero;

  return (
    <div className={`viewport-frame ${isSplit ? 'split-right' : 'full-screen'}`}>
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
