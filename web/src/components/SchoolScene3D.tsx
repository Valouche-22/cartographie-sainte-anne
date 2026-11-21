import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { BuildingInfo, CameraPreset, RoomInfo, SchoolData } from '../types';

interface Props {
  data: SchoolData;
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
  color: string;
  x: number;
  y: number;
  visible: boolean;
  kind: 'building' | 'room';
}

const PRESET_VIEWS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  general: { pos: [-68, 52, 68], target: [8, 2, 8] },
  aerial: { pos: [-192, 166, 312], target: [86, 6, 4] },
  front: { pos: [-68, 16, 10], target: [0, 3, 4] },
  top: { pos: [12, 145, 16], target: [12, 0, 16] },
  church: { pos: [-265, 78, 12], target: [-140, 22, -64] },
  culture: { pos: [-218, 82, -92], target: [-188, 6, -196] },
  stadium: { pos: [210, 118, 245], target: [365, 4, 115] },
};

export const SchoolScene3D: React.FC<Props> = ({
  data,
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
  const roofsRef = useRef<THREE.Object3D[]>([]);
  const roomMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const buildingMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);

  // Store latest props for animation loop
  const showLabelsRef = useRef(showLabels);
  const hideRoofsRef = useRef(hideRoofs);
  showLabelsRef.current = showLabels;
  hideRoofsRef.current = hideRoofs;

  // Move camera smoothly with GSAP
  const animateCamera = (pos: [number, number, number], target: [number, number, number], duration = 1.25) => {
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
    scene.background = new THREE.Color('#c7ddf2');
    scene.fog = new THREE.Fog('#c7ddf2', 520, 1450);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.5, 2200);
    camera.position.set(-68, 52, 68);
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
    controls.minDistance = 10;
    controls.maxDistance = 750;
    controls.target.set(-10, 2, 4);
    controls.update();
    controlsRef.current = controls;

    // Natural lighting
    const hemi = new THREE.HemisphereLight(0xdceeff, 0x6f7a68, 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7e8, 1.8);
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

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      './models/ecole_sainte_anne.glb',
      (gltf) => {
        const root = gltf.scene;
        const roofs: THREE.Object3D[] = [];
        const roomMap = new Map<string, THREE.Mesh>();
        const bldgMap = new Map<string, THREE.Mesh[]>();

        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const n = mesh.name;
            if (n.startsWith('Toit_')) {
              roofs.push(mesh);
            }
            if (n.startsWith('Classe_') || n === 'Salle_Cantine' || n === 'Salle_Periscolaire') {
              roomMap.set(n, mesh);
            }
            for (const b of data.buildings) {
              if (n.includes(b.id)) {
                const arr = bldgMap.get(b.id) || [];
                arr.push(mesh);
                bldgMap.set(b.id, arr);
              }
            }
          }
        });

        roofsRef.current = roofs;
        roomMeshesRef.current = roomMap;
        buildingMeshesRef.current = bldgMap;
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
        onLoadError("Impossible de charger le modèle 3D (/models/ecole_sainte_anne.glb).");
      }
    );

    // Raycaster for clicking buildings & rooms
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
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
        const bldg = data.buildings.find((b) => name.includes(b.id));
        if (bldg) {
          onSelectBuilding(bldg);
          return;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Render loop + label projection
    let rafId = 0;
    let frameCount = 0;
    const tmpVec = new THREE.Vector3();

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);

      frameCount++;
      if (frameCount % 3 === 0) {
        if (!showLabelsRef.current) {
          setLabels((prev) => (prev.length ? [] : prev));
        } else {
          const w = container.clientWidth;
          const h = container.clientHeight;
          const items = hideRoofsRef.current
            ? data.rooms.map((r) => ({ id: r.id, label: r.name, color: r.color, pos: r.position, kind: 'room' as const }))
            : data.buildings.map((b) => ({ id: b.id, label: b.name.split('(')[0].trim(), color: '#38bdf8', pos: [b.position[0], b.position[1] + b.height_m * 0.9, b.position[2]] as [number, number, number], kind: 'building' as const }));

          const next: ProjectedLabel[] = [];
          for (const it of items) {
            tmpVec.set(it.pos[0], it.pos[1], it.pos[2]).project(camera);
            const visible = tmpVec.z < 1 && tmpVec.x >= -1.05 && tmpVec.x <= 1.05 && tmpVec.y >= -1.05 && tmpVec.y <= 1.05;
            next.push({
              id: it.id,
              label: it.label,
              color: it.color,
              x: (tmpVec.x * 0.5 + 0.5) * w,
              y: (-tmpVec.y * 0.5 + 0.5) * h,
              visible,
              kind: it.kind,
            });
          }
          setLabels(next);
        }
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  // Sync OrbitControls enabled state with freeExplore
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, [freeExplore]);

  // Sync camera with narrative scroll scene
  useEffect(() => {
    if (freeExplore) return;
    const sc = data.scenes[activeSceneIndex];
    if (sc) {
      animateCamera(sc.camera.pos, sc.camera.target, 1.3);
    }
  }, [activeSceneIndex, freeExplore, data.scenes]);

  // Sync roof visibility
  useEffect(() => {
    for (const r of roofsRef.current) {
      r.visible = !hideRoofs;
    }
  }, [hideRoofs]);

  // Highlight selected room
  useEffect(() => {
    roomMeshesRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (selectedRoom && selectedRoom.id === id) {
        mat.emissive = new THREE.Color('#38bdf8');
        mat.emissiveIntensity = 0.55;
      } else {
        mat.emissive = new THREE.Color('#000000');
        mat.emissiveIntensity = 0;
      }
    });
    if (selectedRoom) {
      const [x, y, z] = selectedRoom.position;
      animateCamera([x - 16, y + 18, z + 18], [x, y, z], 1.1);
    }
  }, [selectedRoom]);

  // Focus selected building
  useEffect(() => {
    if (selectedBuilding) {
      animateCamera(selectedBuilding.cameraOffset, selectedBuilding.position, 1.15);
    }
  }, [selectedBuilding]);

  // Camera presets
  useEffect(() => {
    if (!cameraPresetTrigger) return;
    const p = PRESET_VIEWS[cameraPresetTrigger.preset];
    if (p) animateCamera(p.pos, p.target, 1.1);
  }, [cameraPresetTrigger]);

  return (
    <>
      <div className="canvas-container" ref={mountRef} />
      {showLabels && (
        <div className="labels-layer">
          {labels
            .filter((l) => l.visible)
            .map((l) => {
              const isSelected = selectedRoom?.id === l.id || selectedBuilding?.id === l.id;
              return (
                <div
                  key={l.id}
                  className={`label-pin ${isSelected ? 'selected' : ''}`}
                  style={{ left: `${l.x}px`, top: `${l.y}px` }}
                  onClick={() => {
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
                    <span className="room-dot" style={{ background: l.color }} />
                    {l.label}
                  </span>
                  <span className="label-stem" />
                </div>
              );
            })}
        </div>
      )}
    </>
  );
};
