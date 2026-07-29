const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const companyId = undefined; // simulate no filter
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  let [{ data: locations, error }, { data: activeSchedules }] = await Promise.all([
    supabase
      .from("driver_locations")
      .select("*")
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("schedules")
      .select("driver_id, vehicle_id, routes(origin, destination)")
      .not("start_checklist_id", "is", null)
      .is("end_checklist_id", null)
      .order("start_at", { ascending: false })
      .limit(10)
  ]);
  
  console.log("activeSchedules:", activeSchedules);

  const activeTripByDriver = new Map();
  (activeSchedules || []).forEach(sched => {
    if (!sched.driver_id) return;
    const driverKey = sched.driver_id.trim().toLowerCase();
    if (activeTripByDriver.has(driverKey)) return;
    
    let routeName = "";
    const routes = sched.routes;
    if (routes) {
      routeName = \`\${routes.origin || ""} - \${routes.destination || ""}\`;
      if (routeName === " - ") routeName = "Rota não informada";
    }
    activeTripByDriver.set(driverKey, { vehicle_id: sched.vehicle_id, route_name: routeName });
  });
  
  console.log("activeTripByDriver Map Size:", activeTripByDriver.size);
  console.log("Map entries:", Array.from(activeTripByDriver.entries()));
}

test();
