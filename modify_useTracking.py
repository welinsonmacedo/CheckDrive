import os

file_path = "src/modules/company/monitoring/hooks/useTracking.ts"
with open(file_path, "r") as f:
    content = f.read()

# Add import
if "fetchTripsList" not in content:
    content = content.replace("calculateTripMetrics,\n}", "calculateTripMetrics,\n  fetchTripsList,\n}")

# Add states
if "const [tripsHistory" not in content:
    content = content.replace(
        "const [loadingTrip, setLoadingTrip] = useState(false);",
        "const [loadingTrip, setLoadingTrip] = useState(false);\n  const [tripsHistory, setTripsHistory] = useState<TripMetrics[]>([]);\n  const [loadingTripsHistory, setLoadingTripsHistory] = useState(false);"
    )

# Add effect to load trips
new_effect = """
  // 6. Fetch Trips History List
  useEffect(() => {
    if (!companyId || !filters.date) return;
    let isMounted = true;
    setLoadingTripsHistory(true);
    fetchTripsList(companyId, filters.date).then(trips => {
      if (isMounted) {
        setTripsHistory(trips);
        setLoadingTripsHistory(false);
      }
    });
    return () => { isMounted = false; };
  }, [companyId, filters.date]);
"""

if "6. Fetch Trips History List" not in content:
    content = content.replace("return {", new_effect + "\n  return {")

# Add to return object
if "tripsHistory," not in content:
    content = content.replace(
        "loadingTrip,",
        "loadingTrip,\n    tripsHistory,\n    loadingTripsHistory,"
    )

with open(file_path, "w") as f:
    f.write(content)
