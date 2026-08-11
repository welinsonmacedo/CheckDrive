export interface DriverLocation {
  id: string;
  driver_id: string;
  company_id: string;
  trip_id?: string | null;
  vehicle_id?: string | null;
  latitude: number;
  longitude: number;
  speed?: number | null;
  accuracy?: number | null;
  bearing?: number | null;
  altitude?: number | null;
  status?: string | null;
  created_at: string;
}

export interface DriverInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
  cpf?: string;
  phone?: string;
  company_id?: string;
}

export interface VehicleInfo {
  id: string;
  plate: string;
  model?: string;
  type?: string;
  max_speed?: number | null;
  company_id?: string;
}

export type DriverOnlineStatus = 'moving' | 'stopped' | 'offline';

export interface DriverState {
  driver_id: string;
  driver?: DriverInfo;
  vehicle?: VehicleInfo;
  latestLocation: DriverLocation;
  status: DriverOnlineStatus;
  lastUpdateAgo: string;
  speedKmh: number;
  address?: string;
  locationsCount: number;
  route_name?: string;
  is_on_break?: boolean;
}

export interface TripMetrics {
  trip_id: string;
  driver_id: string;
  vehicle_id?: string;
  driverName?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  routeName?: string;
  movingTimeMs: number;
  stoppedTimeMs: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  totalPositions: number;
  firstPositionAt: string;
  lastPositionAt: string;
  locations: DriverLocation[];
}

export interface FilterOptions {
  searchTerm: string;
  driverId: string;
  vehicleId: string;
  status: 'all' | 'moving' | 'stopped' | 'offline';
  date: string;
  tripId: string;
}

export interface AlertItem {
  id: string;
  type: 'high_speed' | 'offline' | 'poor_accuracy' | 'long_stopped';
  driver_id: string;
  driverName: string;
  vehiclePlate: string;
  vehicleModel?: string;
  vehicleType?: string;
  message: string;
  timestamp: string;
  severity: 'warning' | 'danger' | 'info';
  speedKmh?: number;
  maxSpeedKmh?: number;
  lat?: number;
  lng?: number;
}

export interface DashboardMetrics {
  onlineDrivers: number;
  stoppedDrivers: number;
  offlineDrivers: number;
  activeTrips: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  lastUpdateAt: string | null;
  totalPositionsToday: number;
}
