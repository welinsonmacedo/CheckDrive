import { supabase } from "@/src/lib/supabase";
import {
  DriverLocation,
  DriverInfo,
  VehicleInfo,
  DriverState,
  TripMetrics,
  DriverOnlineStatus,
} from "../types";

export const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function parseSpeedKmh(rawSpeed: number | null | undefined): number {
  if (rawSpeed == null || isNaN(rawSpeed) || rawSpeed <= 0) return 0;
  // If speed is likely in m/s (Android Location.getSpeed() returns meters/second)
  // 1 m/s = 3.6 km/h. E.g. 20 m/s = 72 km/h.
  // If rawSpeed < 70, convert from m/s to km/h; if rawSpeed >= 70, assume it's already km/h.
  const kmh = rawSpeed < 70 ? rawSpeed * 3.6 : rawSpeed;
  return Math.round(kmh);
}

export function determineDriverStatus(
  createdAtIso: string,
  speedKmh: number,
  statusField?: string | null
): DriverOnlineStatus {
  const lastTime = new Date(createdAtIso).getTime();
  const now = Date.now();
  const diffMs = now - lastTime;

  if (diffMs > FIVE_MINUTES_MS) {
    return "offline";
  }

  if (statusField === "moving" || speedKmh > 3) {
    return "moving";
  }

  return "stopped";
}

export function formatRelativeTime(createdAtIso: string): string {
  if (!createdAtIso) return "Sem registro";
  const diffSec = Math.floor((Date.now() - new Date(createdAtIso).getTime()) / 1000);

  if (diffSec < 0) return "agora";
  if (diffSec < 10) return "agora mesmo";
  if (diffSec < 60) return `há ${diffSec} seg`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} d`;
}

export async function fetchInitialData(companyId: string) {
  try {
    // 1. Fetch drivers & vehicles for mapping
    const [driversRes, vehiclesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, cpf, phone, company_id")
        .eq("company_id", companyId)
        .eq("role", "driver"),
      supabase
        .from("vehicles")
        .select("id, plate, model, type, company_id")
        .eq("company_id", companyId),
    ]);

    const driversMap = new Map<string, DriverInfo>();
    (driversRes.data || []).forEach((d) => driversMap.set(d.id, d));

    const vehiclesMap = new Map<string, VehicleInfo>();
    (vehiclesRes.data || []).forEach((v) => vehiclesMap.set(v.id, v));

    // 2. Fetch recent driver locations (last 24 hours to 48 hours to find latest for each driver)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: locations, error } = await supabase
      .from("driver_locations")
      .select("*")
      .eq("company_id", companyId)
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.warn("Error fetching driver_locations:", error);
    }

    // Map driver_id -> latest location & total locations count
    const latestByDriver = new Map<string, { latest: DriverLocation; count: number }>();

    (locations || []).forEach((loc) => {
      if (!loc.driver_id) return;
      const existing = latestByDriver.get(loc.driver_id);
      if (!existing) {
        latestByDriver.set(loc.driver_id, { latest: loc, count: 1 });
      } else {
        existing.count += 1;
      }
    });

    // Construct DriverStates list
    const driverStates: DriverState[] = [];

    // First, process drivers that have location records
    latestByDriver.forEach(({ latest, count }, driverId) => {
      const driver = driversMap.get(driverId);
      // Try vehicle from location record or driver's primary vehicle
      const vehicleId = latest.vehicle_id;
      const vehicle = vehicleId ? vehiclesMap.get(vehicleId) : undefined;
      const speedKmh = parseSpeedKmh(latest.speed);
      const status = determineDriverStatus(latest.created_at, speedKmh, latest.status);

      driverStates.push({
        driver_id: driverId,
        driver,
        vehicle,
        latestLocation: latest,
        status,
        lastUpdateAgo: formatRelativeTime(latest.created_at),
        speedKmh,
        locationsCount: count,
      });
    });

    // Also include drivers without recent location entries as 'offline'
    driversMap.forEach((driver, driverId) => {
      if (!latestByDriver.has(driverId)) {
        driverStates.push({
          driver_id: driverId,
          driver,
          vehicle: undefined,
          latestLocation: {
            id: `fake-${driverId}`,
            driver_id: driverId,
            company_id: companyId,
            latitude: -15.793889, // default brasilia fallback if no coords
            longitude: -47.882778,
            speed: 0,
            created_at: new Date(0).toISOString(),
          },
          status: "offline",
          lastUpdateAgo: "Nunca registrou",
          speedKmh: 0,
          locationsCount: 0,
        });
      }
    });

    return {
      driverStates,
      driversMap,
      vehiclesMap,
    };
  } catch (err) {
    console.error("fetchInitialData error:", err);
    return {
      driverStates: [],
      driversMap: new Map<string, DriverInfo>(),
      vehiclesMap: new Map<string, VehicleInfo>(),
    };
  }
}

export async function fetchTripHistory(
  companyId: string,
  driverId: string,
  tripId?: string,
  dateStr?: string
): Promise<TripMetrics | null> {
  try {
    let query = supabase
      .from("driver_locations")
      .select("*")
      .eq("company_id", companyId)
      .eq("driver_id", driverId)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (tripId) {
      query = query.eq("trip_id", tripId);
    } else if (dateStr) {
      const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59`).toISOString();
      query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
    } else {
      // Last 24 hours
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", last24h);
    }

    const { data: locations, error } = await query;

    if (error || !locations || locations.length === 0) {
      return null;
    }

    return calculateTripMetrics(locations);
  } catch (e) {
    console.error("fetchTripHistory error:", e);
    return null;
  }
}

export function calculateTripMetrics(locations: DriverLocation[]): TripMetrics {
  let totalSpeedSum = 0;
  let maxSpeedKmh = 0;
  let movingTimeMs = 0;
  let stoppedTimeMs = 0;

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const speed = parseSpeedKmh(loc.speed);
    totalSpeedSum += speed;
    if (speed > maxSpeedKmh) {
      maxSpeedKmh = speed;
    }

    if (i > 0) {
      const prevLoc = locations[i - 1];
      const timeDiff =
        new Date(loc.created_at).getTime() - new Date(prevLoc.created_at).getTime();
      // Only count logical gaps under 30 minutes as active segment
      if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
        if (speed > 3) {
          movingTimeMs += timeDiff;
        } else {
          stoppedTimeMs += timeDiff;
        }
      }
    }
  }

  const avgSpeedKmh = locations.length > 0 ? Math.round(totalSpeedSum / locations.length) : 0;
  const firstLoc = locations[0];
  const lastLoc = locations[locations.length - 1];

  return {
    trip_id: firstLoc.trip_id || `trip-${firstLoc.driver_id}`,
    driver_id: firstLoc.driver_id,
    vehicle_id: firstLoc.vehicle_id || undefined,
    movingTimeMs,
    stoppedTimeMs,
    avgSpeedKmh,
    maxSpeedKmh,
    totalPositions: locations.length,
    firstPositionAt: firstLoc.created_at,
    lastPositionAt: lastLoc.created_at,
    locations,
  };
}
