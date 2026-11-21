export interface BuildingInfo {
  id: string;
  meshPrefix: string;
  roofName: string;
  name: string;
  role: string;
  area_m2?: number;
  height_m: number;
  position: [number, number, number];
  cameraOffset: [number, number, number];
  color: string;
  verified: boolean;
  description: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  level: string;
  building: string;
  category: 'classe' | 'cantine' | 'periscolaire';
  color: string;
  position: [number, number, number];
  description: string;
  indicative?: boolean;
}

export interface SceneItem {
  label: string;
  value: string;
}

export interface SceneStep {
  id: string;
  step: string;
  shortLabel: string;
  kind: 'hero' | 'chapter' | 'synthesis';
  eyebrow: string;
  title: string;
  lead: string;
  items?: SceneItem[];
  camera: {
    pos: [number, number, number];
    target: [number, number, number];
  };
  hideRoofs: boolean;
  showLabels: boolean;
  focusLabels?: string[];
}

export interface SchoolData {
  school: {
    name: string;
    bretonName: string;
    address: string;
    coordinates: { lat: number; lon: number; elevation_m: number };
    area_m2: number;
    cadastre: string[];
    note: string;
  };
  buildings: BuildingInfo[];
  rooms: RoomInfo[];
  scenes: SceneStep[];
}

export type CameraPreset = 'general' | 'cantine' | 'church' | 'culture' | 'stadium';

declare global {
  const __BUILD_ID__: string;
}
