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

export interface FactRow {
  label?: string;
  value: string;
}

export interface SceneStep {
  id: string;
  title: string;
  rows: FactRow[];
  note?: string;
  camera: {
    pos: [number, number, number];
    target: [number, number, number];
  };
  hideRoofs: boolean;
  showLabels: boolean;
  focusLabels?: string[];
  swayAmp?: number;
}

export interface SchoolData {
  school: {
    name: string;
    city: string;
    address: string;
  };
  heroCamera: {
    pos: [number, number, number];
    target: [number, number, number];
  };
  buildings: BuildingInfo[];
  rooms: RoomInfo[];
  scenes: SceneStep[];
}

export type CameraPreset = 'general' | 'cantine' | 'church' | 'culture' | 'stadium';

declare global {
  const __BUILD_ID__: string;
}
