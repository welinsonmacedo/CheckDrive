import os

file_path = "src/modules/company/monitoring/hooks/useTracking.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("loadingTrip,\n    tripsHistory,\n    loadingTripsHistory, setLoadingTrip", "loadingTrip, setLoadingTrip")

with open(file_path, "w") as f:
    f.write(content)
