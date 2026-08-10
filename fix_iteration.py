import os

file_path = "src/modules/company/monitoring/services/trackingService.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("for (const [tripId, locs] of grouped.entries())", "for (const [tripId, locs] of Array.from(grouped.entries()))")

with open(file_path, "w") as f:
    f.write(content)
