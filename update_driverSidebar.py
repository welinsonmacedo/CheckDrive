import os
import re

file_path = "src/modules/company/monitoring/components/DriverSidebar.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Update interfaces
if "tripsHistory?: TripMetrics[]" not in content:
    content = content.replace(
        "activeSidebarTab?: \"drivers\" | \"events\";",
        "activeSidebarTab?: \"drivers\" | \"events\" | \"trips\";"
    )
    content = content.replace(
        "onSidebarTabChange?: (tab: \"drivers\" | \"events\") => void;",
        "onSidebarTabChange?: (tab: \"drivers\" | \"events\" | \"trips\") => void;"
    )
    content = content.replace(
        "loadingTrip: boolean;",
        "loadingTrip: boolean;\n  tripsHistory?: TripMetrics[];\n  loadingTripsHistory?: boolean;"
    )

    # Props destructuring
    content = content.replace(
        "loadingTrip,",
        "loadingTrip,\n  tripsHistory = [],\n  loadingTripsHistory = false,"
    )

    # State update
    content = content.replace(
        "const [internalTab, setInternalTab] = useState<\"drivers\" | \"events\">(\"drivers\");",
        "const [internalTab, setInternalTab] = useState<\"drivers\" | \"events\" | \"trips\">(\"drivers\");"
    )
    content = content.replace(
        "const setTab = (t: \"drivers\" | \"events\") => {",
        "const setTab = (t: \"drivers\" | \"events\" | \"trips\") => {"
    )

with open(file_path, "w") as f:
    f.write(content)
