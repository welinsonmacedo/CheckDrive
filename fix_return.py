import os

file_path = "src/modules/company/monitoring/hooks/useTracking.ts"
with open(file_path, "r") as f:
    content = f.read()

if "tripsHistory," not in content:
    content = content.replace(
        "loadingTrip,\n    // Playback",
        "loadingTrip,\n    tripsHistory,\n    loadingTripsHistory,\n    // Playback"
    )

with open(file_path, "w") as f:
    f.write(content)
