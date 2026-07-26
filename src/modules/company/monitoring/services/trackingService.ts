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

export function formatDriverName(rawName?: string | null, email?: string | null): string {
  if (rawName && typeof rawName === "string") {
    const trimmed = rawName.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    const isIdFallback = /^Motorista\s*\([0-9a-fA-Z-]+\)$/i.test(trimmed);

    if (!isUuid && !isIdFallback && trimmed.length > 0) {
      return trimmed;
    }
  }

  if (email && typeof email === "string" && email.includes("@")) {
    const prefix = email.split("@")[0].replace(/[._-]/g, " ");
    const words = prefix.split(" ").filter(Boolean);
    if (words.length > 0) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  return "Motorista";
}

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

export async function fetchDriverProfile(driverId: string): Promise<DriverInfo | null> {
  try {
    const cleanId = driverId.trim().toLowerCase();
    const [profRes, driverRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", driverId)
        .maybeSingle(),
      supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .maybeSingle(),
    ]);

    const pData = profRes.data;
    const dData = driverRes.data;

    const rawName = pData?.full_name || (pData as any)?.name || dData?.name || (dData as any)?.full_name;
    const email = pData?.email || dData?.email;
    const name = formatDriverName(rawName, email);

    return {
      id: driverId,
      full_name: name,
      avatar_url: pData?.photo_url || pData?.avatar_url || dData?.photo_url,
      cpf: pData?.cpf || dData?.cpf,
      phone: pData?.phone || dData?.phone,
      company_id: pData?.company_id || dData?.company_id,
    };
  } catch (e) {
    console.error("fetchDriverProfile error:", e);
  }
  return null;
}

export async function fetchInitialData(companyId: string) {
  try {
    // 1. Fetch drivers from profiles & drivers tables, vehicles, and vehicle_types
    const [profilesRes, driversTableRes, vehiclesRes, vehicleTypesRes] = await Promise.all([
      companyId
        ? supabase
            .from("profiles")
            .select("*")
            .or(`company_id.eq.${companyId},role.eq.driver`)
        : supabase
            .from("profiles")
            .select("*"),
      companyId
        ? supabase
            .from("drivers")
            .select("*")
            .eq("company_id", companyId)
        : supabase
            .from("drivers")
            .select("*"),
      companyId
        ? supabase
            .from("vehicles")
            .select("*")
            .eq("company_id", companyId)
        : supabase
            .from("vehicles")
            .select("*"),
      companyId
        ? supabase
            .from("vehicle_types")
            .select("*")
            .eq("company_id", companyId)
        : supabase
            .from("vehicle_types")
            .select("*"),
    ]);

    let profilesList = profilesRes.data || [];
    if (profilesList.length === 0) {
      const fallbackProfiles = await supabase.from("profiles").select("*");
      profilesList = fallbackProfiles.data || [];
    }

    let driversList = driversTableRes.data || [];
    if (driversList.length === 0) {
      const fallbackDrivers = await supabase.from("drivers").select("*");
      driversList = fallbackDrivers.data || [];
    }

    let vehicleTypesList = vehicleTypesRes.data || [];
    if (vehicleTypesList.length === 0) {
      const fallbackVT = await supabase.from("vehicle_types").select("*");
      vehicleTypesList = fallbackVT.data || [];
    }

    // Build vehicle types max speed map (by id and name)
    const vehicleTypeSpeedMap = new Map<string, number>();
    (vehicleTypesList || []).forEach((vt: any) => {
      const speed = vt.max_speed ? parseFloat(String(vt.max_speed)) : null;
      if (speed && !isNaN(speed) && speed > 0) {
        if (vt.id) vehicleTypeSpeedMap.set(String(vt.id).trim().toLowerCase(), speed);
        if (vt.name) vehicleTypeSpeedMap.set(String(vt.name).trim().toLowerCase(), speed);
      }
    });

    const driversMap = new Map<string, DriverInfo>();

    profilesList.forEach((d: any) => {
      if (!d.id) return;
      const key = d.id.trim().toLowerCase();
      const rawName = d.full_name || d.name;
      const name = formatDriverName(rawName, d.email);
      driversMap.set(key, {
        id: d.id,
        full_name: name,
        avatar_url: d.photo_url || d.avatar_url,
        cpf: d.cpf,
        phone: d.phone,
        company_id: d.company_id,
      });
    });

    driversList.forEach((d: any) => {
      if (!d.id) return;
      const key = d.id.trim().toLowerCase();
      const existing = driversMap.get(key);
      const rawName = d.name || d.full_name;
      const name = formatDriverName(rawName, d.email);
      if (!existing || existing.full_name === "Motorista") {
        driversMap.set(key, {
          id: d.id,
          full_name: name,
          avatar_url: d.photo_url || d.avatar_url || existing?.avatar_url,
          cpf: d.cpf || existing?.cpf,
          phone: d.phone || existing?.phone,
          company_id: d.company_id || existing?.company_id,
        });
      }
    });

    const vehiclesMap = new Map<string, VehicleInfo>();
    (vehiclesRes.data || []).forEach((v: any) => {
      const typeKey = (v.type || v.type_id || "").trim().toLowerCase();
      const typeMaxSpeed = vehicleTypeSpeedMap.get(typeKey) || (v.max_speed ? parseFloat(String(v.max_speed)) : undefined);
      vehiclesMap.set(v.id, {
        id: v.id,
        plate: v.plate,
        model: v.model,
        type: v.type,
        max_speed: typeMaxSpeed,
        company_id: v.company_id,
      });
    });

    // 2. Fetch recent driver locations (last 48 hours to find latest for each driver)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let { data: locations, error } = companyId
      ? await supabase
          .from("driver_locations")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", twoDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1000)
      : await supabase
          .from("driver_locations")
          .select("*")
          .gte("created_at", twoDaysAgo)
          .order("created_at", { ascending: false })
          .limit(1000);

    if ((!locations || locations.length === 0) && companyId) {
      const fallbackLocs = await supabase
        .from("driver_locations")
        .select("*")
        .gte("created_at", twoDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1000);
      locations = fallbackLocs.data || [];
    }

    if (error) {
      console.warn("Error fetching driver_locations:", error);
    }

    // Identify missing driver_ids present in locations but missing from driversMap or with fallback name
    const missingDriverIds = new Set<string>();
    (locations || []).forEach((loc) => {
      if (loc.driver_id) {
        const k = loc.driver_id.trim().toLowerCase();
        const existing = driversMap.get(k);
        if (!existing || !existing.full_name || existing.full_name === "Motorista") {
          missingDriverIds.add(loc.driver_id);
        }
      }
    });

    // Fetch missing driver profiles directly by ID from profiles and drivers tables
    if (missingDriverIds.size > 0) {
      const idsList = Array.from(missingDriverIds);
      const [missingProfiles, missingDrivers] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .in("id", idsList),
        supabase
          .from("drivers")
          .select("*")
          .in("id", idsList),
      ]);

      (missingProfiles.data || []).forEach((d: any) => {
        if (!d.id) return;
        const key = d.id.trim().toLowerCase();
        const rawName = d.full_name || d.name;
        const name = formatDriverName(rawName, d.email);
        driversMap.set(key, {
          id: d.id,
          full_name: name,
          avatar_url: d.photo_url || d.avatar_url,
          cpf: d.cpf,
          phone: d.phone,
          company_id: d.company_id,
        });
      });

      (missingDrivers.data || []).forEach((d: any) => {
        if (!d.id) return;
        const key = d.id.trim().toLowerCase();
        const existing = driversMap.get(key);
        const rawName = d.name || d.full_name;
        const name = formatDriverName(rawName, d.email);
        if (!existing || existing.full_name === "Motorista") {
          driversMap.set(key, {
            id: d.id,
            full_name: name,
            avatar_url: d.photo_url || d.avatar_url || existing?.avatar_url,
            cpf: d.cpf || existing?.cpf,
            phone: d.phone || existing?.phone,
            company_id: d.company_id || existing?.company_id,
          });
        }
      });
    }

    // Map driver_id -> latest location & total locations count
    const latestByDriver = new Map<string, { latest: DriverLocation; count: number }>();

    (locations || []).forEach((loc) => {
      if (!loc.driver_id) return;
      const key = loc.driver_id.trim().toLowerCase();
      const existing = latestByDriver.get(key);
      if (!existing) {
        latestByDriver.set(key, { latest: loc, count: 1 });
      } else {
        existing.count += 1;
      }
    });

    // Construct DriverStates list
    const driverStates: DriverState[] = [];

    // First, process drivers that have location records
    latestByDriver.forEach(({ latest, count }, key) => {
      const driverId = latest.driver_id;
      let driver = driversMap.get(key);
      if (!driver) {
        driver = {
          id: driverId,
          full_name: "Motorista",
        };
        driversMap.set(key, driver);
      }

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

    // Extract initial alerts for speeding violations based on vehicle max_speed
    const initialAlerts: AlertItem[] = [];
    const seenAlertKeys = new Set<string>();
    (locations || []).slice(0, 300).forEach((loc) => {
      if (!loc.driver_id) return;
      const speedKmh = parseSpeedKmh(loc.speed);
      const vehicle = loc.vehicle_id ? vehiclesMap.get(loc.vehicle_id) : undefined;
      const maxSpeed = vehicle?.max_speed || 90;
      if (speedKmh > maxSpeed) {
        const driverKey = loc.driver_id.trim().toLowerCase();
        const alertKey = `${driverKey}-${loc.created_at?.substring(0, 16)}`;
        if (!seenAlertKeys.has(alertKey)) {
          seenAlertKeys.add(alertKey);
          const driver = driversMap.get(driverKey);
          initialAlerts.push({
            id: `alert-speed-${loc.id || Date.now()}-${loc.driver_id}`,
            type: "high_speed",
            driver_id: loc.driver_id,
            driverName: driver?.full_name || "Motorista",
            vehiclePlate: vehicle?.plate || "Sem placa",
            vehicleModel: vehicle?.model,
            vehicleType: vehicle?.type || "Veículo",
            message: `Excesso de velocidade: ${speedKmh} km/h (Limite cadastrado para ${vehicle?.type || 'o veículo'}: ${maxSpeed} km/h)`,
            timestamp: loc.created_at,
            severity: "danger",
            speedKmh,
            maxSpeedKmh: maxSpeed,
            lat: loc.latitude,
            lng: loc.longitude,
          });
        }
      }
    });

    return {
      driverStates,
      driversMap,
      vehiclesMap,
      initialAlerts,
    };
  } catch (err) {
    console.error("fetchInitialData error:", err);
    return {
      driverStates: [],
      driversMap: new Map<string, DriverInfo>(),
      vehiclesMap: new Map<string, VehicleInfo>(),
      initialAlerts: [],
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

/**
 * Saves a driver location record to Supabase.
 * If the driver has NO active trip (trip_id is null/empty), it rate-limits insertions to max 1 record per minute
 * by updating the existing record from the same minute if present, avoiding multiple lines per minute.
 */
export async function saveDriverLocation(
  locationData: Partial<DriverLocation> & { driver_id: string; company_id: string; latitude: number; longitude: number }
): Promise<{ success: boolean; data?: DriverLocation; error?: any }> {
  try {
    const { driver_id, company_id, trip_id } = locationData;
    const nowIso = locationData.created_at || new Date().toISOString();

    // Check if driver has no trip
    if (!trip_id) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: recentLocs } = await supabase
        .from("driver_locations")
        .select("id, created_at")
        .eq("driver_id", driver_id)
        .is("trip_id", null)
        .gte("created_at", oneMinuteAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentLocs && recentLocs.length > 0) {
        // Already saved a location for this user without a trip in the same minute -> update existing line
        const existingId = recentLocs[0].id;
        const { data: updated, error: updateErr } = await supabase
          .from("driver_locations")
          .update({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            speed: locationData.speed ?? 0,
            accuracy: locationData.accuracy,
            bearing: locationData.bearing,
            altitude: locationData.altitude,
            status: locationData.status || "STOPPED",
            vehicle_id: locationData.vehicle_id || null,
            company_id: company_id,
            created_at: nowIso,
          })
          .eq("id", existingId)
          .select()
          .maybeSingle();

        if (!updateErr && updated) {
          return { success: true, data: updated };
        }
      }
    }

    // Insert new location line
    const { data: inserted, error: insertErr } = await supabase
      .from("driver_locations")
      .insert({
        driver_id,
        company_id,
        trip_id: trip_id || null,
        vehicle_id: locationData.vehicle_id || null,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed ?? 0,
        accuracy: locationData.accuracy ?? 0,
        bearing: locationData.bearing ?? 0,
        altitude: locationData.altitude ?? 0,
        status: locationData.status || (locationData.speed && locationData.speed > 3 ? "MOVING" : "STOPPED"),
        created_at: nowIso,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Error inserting driver location:", insertErr);
      return { success: false, error: insertErr };
    }

    return { success: true, data: inserted };
  } catch (err) {
    console.error("saveDriverLocation error:", err);
    return { success: false, error: err };
  }
}
