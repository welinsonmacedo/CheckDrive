import os

file_path = "src/modules/company/components/TrackingTab.tsx"
with open(file_path, "r") as f:
    content = f.read()

if "tripsHistory" not in content:
    content = content.replace(
        "const [activeSidebarTab, setActiveSidebarTab] = React.useState<\"drivers\" | \"events\">(\"drivers\");",
        "const [activeSidebarTab, setActiveSidebarTab] = React.useState<\"drivers\" | \"events\" | \"trips\">(\"drivers\");"
    )
    content = content.replace(
        "loadingTrip,",
        "loadingTrip,\n    tripsHistory,\n    loadingTripsHistory,"
    )
    content = content.replace(
        "loadingTrip={loadingTrip}",
        "loadingTrip={loadingTrip}\n        tripsHistory={tripsHistory}\n        loadingTripsHistory={loadingTripsHistory}"
    )

with open(file_path, "w") as f:
    f.write(content)
