export type Role = "driver" | "admin" | "standard" | "superadmin";

export type AssetType = "VEHICLE" | "MACHINE" | "EQUIPMENT";
export type ControlUnit = "KM" | "HOURS" | "BOTH";
export type OperationMode = "VEHICLES" | "MACHINES" | "MIXED" | "ALL_ASSETS";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role | null; // 🔥 ESSENCIAL
  company_id?: string;
  isInternal: boolean;
  modality_ids?: string[];
  hideAverages?: boolean;
}

export interface VehicleModality {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type?: string;
  modality_id?: string;
  requires_trailer?: boolean;
  active: boolean;
  asset_type?: AssetType;
  control_unit?: ControlUnit;
  hour_meter?: number;
  hour_meter_initial?: number;
  hour_meter_current?: number;
}

export interface Trailer {
  id: string;
  plate: string;
  active: boolean;
}

export interface DriveRoute {
  id: string;
  name: string;
  active: boolean;
}

export interface ChecklistType {
  id: string;
  name: "Início de viagem" | "Abastecimento" | "Fim de viagem";
  active: boolean;
}

export interface ChecklistItem {
  id: string;
  type_id: string;
  label: string;
  is_photo_required: boolean;
  is_defect_option: boolean;
}

export interface Defect {
  id: string;
  label: string;
}

export interface ChecklistSubmission {
  id: string;
  driver_id: string;
  vehicle_id: string;
  route_id: string;
  type_id: string;
  km_reading: number;
  timestamp: string;
  photos: string[]; // URLs of mandatory photos
  defects: {
    item_id: string;
    description: string;
    photo: string;
  }[];
  is_complete: boolean;
  score_impact: number;
}

export interface DriverPerformance {
  driver_id: string;
  score: number;
  ranking: number;
  total_checklists: number;
  pending_checklists: number;
}
