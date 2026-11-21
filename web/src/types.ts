export interface BuildingInfo {
  id: string;
  meshPrefix: string;
  roofName: string;
  name: string;
  role: string;
  area_m2: number;
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

export interface SceneStep {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  body: string;
  camera: {
    pos: [number, number, number];
    target: [number, number, number];
  };
  hideRoofs: boolean;
  showLabels: boolean;
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

export type CameraPreset = 'general' | 'aerial' | 'front' | 'top' | 'church' | 'culture' | 'stadium';
