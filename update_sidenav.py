import os

file_path = "src/modules/company/monitoring/components/DriverSidebar.tsx"
with open(file_path, "r") as f:
    content = f.read()

trips_nav = """
          <button
            onClick={() => {
              setTab("trips");
              setIsCollapsed(false);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            title="Trajetos"
          >
            <Navigation size={18} />
          </button>
"""

if "title=\"Trajetos\"" not in content:
    content = content.replace(
        "            {alerts.length > 0 && (\n              <span className=\"absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center\">\n                {alerts.length}\n              </span>\n            )}\n          </button>\n        </div>",
        "            {alerts.length > 0 && (\n              <span className=\"absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center\">\n                {alerts.length}\n              </span>\n            )}\n          </button>\n" + trips_nav + "        </div>"
    )

with open(file_path, "w") as f:
    f.write(content)
