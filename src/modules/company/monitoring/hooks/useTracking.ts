import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  DriverState,
  DriverLocation,
  TripMetrics,
  FilterOptions,
  AlertItem,
  DashboardMetrics,
} from "../types";
import {
  fetchInitialData,
  fetchTripHistory,
  parseSpeedKmh,
  determineDriverStatus,
  formatRelativeTime,
  FIVE_MINUTES_MS,
  calculateTripMetrics,
} from "../services/trackingService";
import { subscribeDriverLocations } from "../services/trackingRealtime";

export function useTracking() {
  const { user } = useAuth();
  const companyId = (user as any)?.company_id || "";

  const [loading, setLoading] = useState(true);
  const [driverStates, setDriverStates] = useState<DriverState[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTripMetrics, setSelectedTripMetrics] = useState<TripMetrics | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Map settings
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [speedLimitKmh, setSpeedLimitKmh] = useState(100);

  // Playback state
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4 | 8>(1);
  const playbackTimerRef = useRef<any>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    driverId: "all",
    vehicleId: "all",
    status: "all",
    date: new Date().toISOString().split("T")[0],
    tripId: "all",
  });

  // Alerts
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Maps for drivers and vehicles
  const driversMapRef = useRef<Map<string, any>>(new Map());
  const vehiclesMapRef = useRef<Map<string, any>>(new Map());

  // 1. Initial Load
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { driverStates: initialStates, driversMap, vehiclesMap } = await fetchInitialData(
      companyId
    );

    driversMapRef.current = driversMap;
    vehiclesMapRef.current = vehiclesMap;
    setDriverStates(initialStates);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Realtime Updates
  const handleNewLocation = useCallback(
    (newLoc: DriverLocation) => {
      setDriverStates((prevStates) => {
        const speedKmh = parseSpeedKmh(newLoc.speed);
        const driverId = newLoc.driver_id;
        if (!driverId) return prevStates;

        const driverInfo = driversMapRef.current.get(driverId);
        const vehicleInfo = newLoc.vehicle_id
          ? vehiclesMapRef.current.get(newLoc.vehicle_id)
          : undefined;

        const newStatus = determineDriverStatus(newLoc.created_at, speedKmh, newLoc.status);
        const updateAgo = formatRelativeTime(newLoc.created_at);

        // Check for alerts
        if (speedKmh > speedLimitKmh) {
          const alert: AlertItem = {
            id: `alert-speed-${Date.now()}-${driverId}`,
            type: "high_speed",
            driver_id: driverId,
            driverName: driverInfo?.full_name || "Motorista",
            vehiclePlate: vehicleInfo?.plate || "Sem placa",
            message: `Excesso de velocidade: ${speedKmh} km/h (Limite: ${speedLimitKmh} km/h)`,
            timestamp: newLoc.created_at,
            severity: "danger",
          };
          setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
        }

        if (newLoc.accuracy && newLoc.accuracy > 50) {
          const alert: AlertItem = {
            id: `alert-accuracy-${Date.now()}-${driverId}`,
            type: "poor_accuracy",
            driver_id: driverId,
            driverName: driverInfo?.full_name || "Motorista",
            vehiclePlate: vehicleInfo?.plate || "Sem placa",
            message: `Precisão do GPS ruim (${Math.round(newLoc.accuracy)}m)`,
            timestamp: newLoc.created_at,
            severity: "warning",
          };
          setAlerts((prev) => [alert, ...prev.slice(0, 19)]);
        }

        const existingIdx = prevStates.findIndex((ds) => ds.driver_id === driverId);

        if (existingIdx >= 0) {
          const updated = [...prevStates];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            driver: driverInfo || curr.driver,
            vehicle: vehicleInfo || curr.vehicle,
            latestLocation: newLoc,
            status: newStatus,
            speedKmh,
            lastUpdateAgo: updateAgo,
            locationsCount: curr.locationsCount + 1,
          };
          return updated;
        } else {
          return [
            ...prevStates,
            {
              driver_id: driverId,
              driver: driverInfo,
              vehicle: vehicleInfo,
              latestLocation: newLoc,
              status: newStatus,
              speedKmh,
              lastUpdateAgo: updateAgo,
              locationsCount: 1,
            },
          ];
        }
      });

      // Update active trip history if viewing this driver
      setSelectedTripMetrics((currTrip) => {
        if (currTrip && currTrip.driver_id === newLoc.driver_id) {
          const updatedLocs = [...currTrip.locations, newLoc];
          return calculateTripMetrics(updatedLocs);
        }
        return currTrip;
      });
    },
    [speedLimitKmh]
  );

  useEffect(() => {
    if (!companyId) return;
    const unsubscribe = subscribeDriverLocations(companyId, handleNewLocation);
    return () => unsubscribe();
  }, [companyId, handleNewLocation]);

  // 3. Periodic recalculation of driver status (e.g., transition to offline if silent for 5 min)
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverStates((prevStates) =>
        prevStates.map((ds) => {
          const speedKmh = ds.speedKmh;
          const status = determineDriverStatus(
            ds.latestLocation.created_at,
            speedKmh,
            ds.latestLocation.status
          );
          const lastUpdateAgo = formatRelativeTime(ds.latestLocation.created_at);
          if (status !== ds.status || lastUpdateAgo !== ds.lastUpdateAgo) {
            return { ...ds, status, lastUpdateAgo };
          }
          return ds;
        })
      );
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  // 4. Fetch trip history when selecting a driver
  useEffect(() => {
    if (!selectedDriverId || !companyId) {
      setSelectedTripMetrics(null);
      return;
    }

    let isMounted = true;
    setLoadingTrip(true);
    setIsPlaybackPlaying(false);
    setPlaybackIndex(0);

    fetchTripHistory(
      companyId,
      selectedDriverId,
      filters.tripId !== "all" ? filters.tripId : undefined,
      filters.date
    ).then((metrics) => {
      if (isMounted) {
        setSelectedTripMetrics(metrics);
        setLoadingTrip(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDriverId, companyId, filters.tripId, filters.date]);

  // 5. Playback Timer
  useEffect(() => {
    if (!isPlaybackPlaying || !selectedTripMetrics || selectedTripMetrics.locations.length === 0) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.max(100, Math.floor(1000 / playbackSpeed));

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prevIdx) => {
        if (prevIdx >= selectedTripMetrics.locations.length - 1) {
          setIsPlaybackPlaying(false);
          return prevIdx;
        }
        return prevIdx + 1;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaybackPlaying, selectedTripMetrics, playbackSpeed]);

  // 6. Filtered Drivers
  const filteredDriverStates = useMemo(() => {
    return driverStates.filter((ds) => {
      // Search term
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const driverName = (ds.driver?.full_name || "").toLowerCase();
        const plate = (ds.vehicle?.plate || "").toLowerCase();
        const model = (ds.vehicle?.model || "").toLowerCase();
        if (!driverName.includes(term) && !plate.includes(term) && !model.includes(term)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== "all" && ds.status !== filters.status) {
        return false;
      }

      // Driver ID filter
      if (filters.driverId !== "all" && ds.driver_id !== filters.driverId) {
        return false;
      }

      // Vehicle ID filter
      if (
        filters.vehicleId !== "all" &&
        ds.vehicle?.id !== filters.vehicleId &&
        ds.latestLocation.vehicle_id !== filters.vehicleId
      ) {
        return false;
      }

      return true;
    });
  }, [driverStates, filters]);

  // 7. Dashboard Metrics
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    let online = 0;
    let stopped = 0;
    let offline = 0;
    let totalSpeed = 0;
    let movingCount = 0;
    let maxSpeed = 0;
    let totalPos = 0;
    let newestTs: string | null = null;
    const activeTripsSet = new Set<string>();

    driverStates.forEach((ds) => {
      totalPos += ds.locationsCount;
      if (ds.status === "moving") online++;
      else if (ds.status === "stopped") stopped++;
      else offline++;

      if (ds.status === "moving" || ds.status === "stopped") {
        if (ds.speedKmh > 0) {
          totalSpeed += ds.speedKmh;
          movingCount++;
        }
        if (ds.speedKmh > maxSpeed) maxSpeed = ds.speedKmh;
      }

      if (ds.latestLocation.trip_id) {
        activeTripsSet.add(ds.latestLocation.trip_id);
      }

      if (
        ds.latestLocation.created_at &&
        ds.latestLocation.created_at !== new Date(0).toISOString()
      ) {
        if (!newestTs || new Date(ds.latestLocation.created_at) > new Date(newestTs)) {
          newestTs = ds.latestLocation.created_at;
        }
      }
    });

    return {
      onlineDrivers: online,
      stoppedDrivers: stopped,
      offlineDrivers: offline,
      activeTrips: activeTripsSet.size,
      avgSpeedKmh: movingCount > 0 ? Math.round(totalSpeed / movingCount) : 0,
      maxSpeedKmh: maxSpeed,
      lastUpdateAt: newestTs,
      totalPositionsToday: totalPos,
    };
  }, [driverStates]);

  const selectedDriverState = useMemo(() => {
    return driverStates.find((ds) => ds.driver_id === selectedDriverId) || null;
  }, [driverStates, selectedDriverId]);

  return {
    loading,
    driverStates: filteredDriverStates,
    rawDriverStates: driverStates,
    selectedDriverId,
    setSelectedDriverId,
    selectedDriverState,
    selectedTripMetrics,
    loadingTrip,

    // Playback
    isPlaybackPlaying,
    setIsPlaybackPlaying,
    playbackIndex,
    setPlaybackIndex,
    playbackSpeed,
    setPlaybackSpeed,

    // Map toggles
    showHeatmap,
    setShowHeatmap,
    showClusters,
    setShowClusters,
    speedLimitKmh,
    setSpeedLimitKmh,

    // Filters & Alerts
    filters,
    setFilters,
    alerts,
    setAlerts,
    dashboardMetrics,

    // Actions
    refetch: loadData,
  };
}
