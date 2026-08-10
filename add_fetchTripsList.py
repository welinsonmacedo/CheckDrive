import os

with open("src/modules/company/monitoring/services/trackingService.ts", "r") as f:
    content = f.read()

func = """
export async function fetchTripsList(
  companyId: string,
  dateStr: string
): Promise<TripMetrics[]> {
  try {
    const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59`).toISOString();

    const { data: locations, error } = await supabase
      .from("driver_locations")
      .select("*")
      .eq("company_id", companyId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error || !locations || locations.length === 0) {
      return [];
    }

    // Group by trip_id (or a composite of driver_id if null)
    const grouped = new Map<string, any[]>();
    for (const loc of locations) {
      const key = loc.trip_id || `trip-${loc.driver_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(loc);
    }

    const trips: TripMetrics[] = [];
    for (const [tripId, locs] of grouped.entries()) {
      const metrics = calculateTripMetrics(locs);
      metrics.trip_id = tripId;
      trips.push(metrics);
    }

    // Sort by lastPositionAt desc
    return trips.sort((a, b) => new Date(b.lastPositionAt).getTime() - new Date(a.lastPositionAt).getTime());
  } catch (e) {
    console.error("fetchTripsList error:", e);
    return [];
  }
}
"""

if "fetchTripsList" not in content:
    content = content + "\n" + func
    with open("src/modules/company/monitoring/services/trackingService.ts", "w") as f:
        f.write(content)
