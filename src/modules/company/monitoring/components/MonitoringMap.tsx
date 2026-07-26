import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { DriverState, TripMetrics, DriverOnlineStatus } from "../types";
import { formatDriverName } from "../services/trackingService";

interface MonitoringMapProps {
  driverStates: DriverState[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string | null) => void;
  selectedTripMetrics: TripMetrics | null;
  isPlaybackPlaying: boolean;
  playbackIndex: number;
  showHeatmap: boolean;
  showClusters: boolean;
}

// Function to create custom SVG HTML icon with direction arrow rotated by bearing
function createDriverIcon(
  status: DriverOnlineStatus,
  bearing: number = 0,
  speedKmh: number = 0,
  isSelected: boolean = false,
  driverName: string = ""
): L.DivIcon {
  const statusColor =
    status === "moving"
      ? "#10b981" // emerald
      : status === "stopped"
      ? "#ef4444" // red
      : "#9ca3af"; // gray

  const ringColor = isSelected ? "#3b82f6" : statusColor;
  const pulseClass = status === "moving" ? "animate-pulse" : "";

  const displayName = driverName.length > 22 ? driverName.substring(0, 20) + "..." : driverName;

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      ${
        displayName
          ? `<div style="
              background: rgba(15, 23, 42, 0.92);
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 7px;
              border-radius: 8px;
              border: 1px solid ${ringColor};
              white-space: nowrap;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
              margin-bottom: 3px;
              font-family: system-ui, -apple-system, sans-serif;
              pointer-events: none;
            ">${displayName}</div>`
          : ""
      }
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;" class="${pulseClass}">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: ${ringColor};
          opacity: ${isSelected ? "0.4" : "0.25"};
          transform: scale(1.15);
        "></div>
        <div style="
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: #0f172a;
          border: 2.5px solid ${ringColor};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
        ">
          <div style="
            transform: rotate(${bearing}deg);
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
          ${
            speedKmh > 0
              ? `<div style="
                  position: absolute;
                  bottom: -8px;
                  background: #0f172a;
                  color: #ffffff;
                  font-size: 9px;
                  font-weight: 800;
                  padding: 1px 4px;
                  border-radius: 4px;
                  border: 1px solid ${statusColor};
                  white-space: nowrap;
                ">${speedKmh}k</div>`
              : ""
          }
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-driver-marker",
    iconSize: [120, 65],
    iconAnchor: [60, 45],
    popupAnchor: [0, -45],
  });
}

function createPlaybackIcon(bearing: number = 0): L.DivIcon {
  const html = `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        background-color: #3b82f6;
        opacity: 0.3;
        animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 9999px;
        background: #1e1b4b;
        border: 3px solid #6366f1;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
      ">
        <div style="transform: rotate(${bearing}deg); transition: transform 0.2s ease;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#818cf8" stroke="#ffffff" stroke-width="2">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "playback-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

export const MonitoringMap: React.FC<MonitoringMapProps> = ({
  driverStates,
  selectedDriverId,
  onSelectDriver,
  selectedTripMetrics,
  isPlaybackPlaying,
  playbackIndex,
  showHeatmap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Map elements refs to update smoothly without tearing down the map
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);
  const playbackMarkerRef = useRef<L.Marker | null>(null);
  const heatmapCirclesRef = useRef<L.CircleMarker[]>([]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center in Brasilia [-15.793889, -47.882778]
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-15.793889, -47.882778], 5);

    // Add CartoDB Voyager tiles for modern map aesthetics
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    // ResizeObserver to handle map resize dynamically (essential for mobile drawers & sidebar toggles)
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
      }
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Update Driver Markers Smoothly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentDriverIds = new Set(driverStates.map((ds) => ds.driver_id));

    // Remove markers that no longer exist
    markersRef.current.forEach((marker, driverId) => {
      if (!currentDriverIds.has(driverId)) {
        marker.remove();
        markersRef.current.delete(driverId);
      }
    });

    const validCoords: L.LatLngExpression[] = [];

    driverStates.forEach((ds) => {
      const { latestLocation, driver_id, status, speedKmh } = ds;
      const lat = latestLocation.latitude;
      const lng = latestLocation.longitude;

      if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        return;
      }

      validCoords.push([lat, lng]);

      const bearing = latestLocation.bearing || 0;
      const isSelected = driver_id === selectedDriverId;
      const driverName = formatDriverName(ds.driver?.full_name);
      const icon = createDriverIcon(status, bearing, speedKmh, isSelected, driverName);

      const vehicleInfo = ds.vehicle
        ? `${ds.vehicle.model || "Veículo"} - ${ds.vehicle.plate}`
        : "Sem veículo vinculado";
      const accuracyText = latestLocation.accuracy
        ? `${Math.round(latestLocation.accuracy)}m`
        : "N/A";
      const dateFormatted = new Date(latestLocation.created_at).toLocaleString("pt-BR");

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; padding: 4px; color: #0f172a; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 9999px; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">
              ${driverName.charAt(0)}
            </div>
            <div>
              <strong style="font-size: 14px; display: block; line-height: 1.2;">${driverName}</strong>
              <span style="font-size: 11px; color: #64748b;">${vehicleInfo}</span>
            </div>
          </div>
          <div style="background: #f8fafc; border-radius: 8px; padding: 8px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border: 1px solid #e2e8f0;">
            <div>
              <span style="color: #64748b; display: block;">Velocidade</span>
              <strong style="font-size: 13px; color: #0f172a;">${speedKmh} km/h</strong>
            </div>
            <div>
              <span style="color: #64748b; display: block;">Precisão GPS</span>
              <strong style="font-size: 12px; color: #0f172a;">${accuracyText}</strong>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: #64748b; display: block;">Última Posição</span>
              <span style="font-weight: 600; color: #334155;">${dateFormatted} (${ds.lastUpdateAgo})</span>
            </div>
          </div>
        </div>
      `;

      let existingMarker = markersRef.current.get(driver_id);

      if (existingMarker) {
        // SMOOTH MOVEMENT: Update existing marker lat/lng, icon, and popup without recreating
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setIcon(icon);
        existingMarker.setZIndexOffset(isSelected ? 1000 : 0);
        existingMarker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        // Bind popup
        marker.bindPopup(popupContent, {
          closeButton: true,
          className: "clean-popup",
        });

        marker.on("click", () => {
          onSelectDriver(driver_id);
        });

        markersRef.current.set(driver_id, marker);
      }
    });

    // Auto-fit bounds if no driver selected and we have points
    if (!selectedDriverId && validCoords.length > 0 && mapRef.current) {
      try {
        const bounds = L.latLngBounds(validCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {
        // ignore bounds fit error
      }
    }
  }, [driverStates, selectedDriverId, onSelectDriver]);

  // 3. Center Map on Selected Driver
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDriverId) return;

    const selectedState = driverStates.find((ds) => ds.driver_id === selectedDriverId);
    if (selectedState && selectedState.latestLocation) {
      const { latitude: lat, longitude: lng } = selectedState.latestLocation;
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 15, { duration: 1.2 });
      }
    }
  }, [selectedDriverId, driverStates]);

  // 4. Draw Route Polyline for Selected Trip
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!selectedTripMetrics || selectedTripMetrics.locations.length < 2) {
      return;
    }

    const latLngs: [number, number][] = selectedTripMetrics.locations.map((loc) => [
      loc.latitude,
      loc.longitude,
    ]);

    const polyline = L.polyline(latLngs, {
      color: "#3b82f6",
      weight: 5,
      opacity: 0.85,
      lineJoin: "round",
      dashArray: "1, 0",
    }).addTo(map);

    polylineRef.current = polyline;

    // Fit route bounds
    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    } catch (e) {
      // ignore
    }
  }, [selectedTripMetrics]);

  // 5. Playback Marker Animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (playbackMarkerRef.current) {
      playbackMarkerRef.current.remove();
      playbackMarkerRef.current = null;
    }

    if (
      !selectedTripMetrics ||
      selectedTripMetrics.locations.length === 0 ||
      playbackIndex < 0 ||
      playbackIndex >= selectedTripMetrics.locations.length
    ) {
      return;
    }

    const currLoc = selectedTripMetrics.locations[playbackIndex];
    if (!currLoc || !currLoc.latitude || !currLoc.longitude) return;

    const bearing = currLoc.bearing || 0;
    const icon = createPlaybackIcon(bearing);

    const marker = L.marker([currLoc.latitude, currLoc.longitude], {
      icon,
      zIndexOffset: 2000,
    }).addTo(map);

    playbackMarkerRef.current = marker;

    if (isPlaybackPlaying) {
      map.panTo([currLoc.latitude, currLoc.longitude], { animate: true, duration: 0.2 });
    }
  }, [selectedTripMetrics, playbackIndex, isPlaybackPlaying]);

  // 6. Heatmap View
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing heatmap circles
    heatmapCirclesRef.current.forEach((circle) => circle.remove());
    heatmapCirclesRef.current = [];

    if (!showHeatmap) return;

    driverStates.forEach((ds) => {
      const { latitude: lat, longitude: lng } = ds.latestLocation;
      if (lat && lng) {
        const circle = L.circleMarker([lat, lng], {
          radius: 20,
          fillColor: "#ef4444",
          fillOpacity: 0.4,
          stroke: false,
        }).addTo(map);
        heatmapCirclesRef.current.push(circle);
      }
    });
  }, [showHeatmap, driverStates]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
