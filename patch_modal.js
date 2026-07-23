import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the submissions fetch
content = content.replace(
  /const { data: subs } = await supabase\.from\("checklist_submissions"\)\.select\("\*, profiles!checklist_submissions_driver_id_fkey\(full_name\), routes\(origin, destination\)"\)/,
  `const { data: subs } = await supabase.from("checklist_submissions").select("*, profiles!checklist_submissions_driver_id_fkey(full_name), routes(origin, destination), schedules_start:schedules!schedules_start_checklist_id_fkey(routes(origin, destination)), schedules_end:schedules!schedules_end_checklist_id_fkey(routes(origin, destination)), schedules_fuel:schedules!schedules_fuel_checklist_id_fkey(routes(origin, destination))")`
);

// Map submissions
content = content.replace(
  /setSubmissions\(subs \|\| \[\]\);/,
  `const mappedSubs = (subs || []).map((sub: any) => {
        let route = sub.routes;
        if (!route && sub.schedules_start && sub.schedules_start.length > 0) {
           route = sub.schedules_start[0].routes;
        }
        if (!route && sub.schedules_end && sub.schedules_end.length > 0) {
           route = sub.schedules_end[0].routes;
        }
        if (!route && sub.schedules_fuel && sub.schedules_fuel.length > 0) {
           route = sub.schedules_fuel[0].routes;
        }
        return {
           ...sub,
           resolved_route: route
        };
      });
      setSubmissions(mappedSubs);`
);

// Update render
content = content.replace(
  /{sub\.routes\s*\?\s*`\$\{sub\.routes\.origin\} → \$\{sub\.routes\.destination\}`\s*:\s*"Espontânea \/ Sem Rota"}/,
  `{sub.resolved_route
                                        ? \`\${sub.resolved_route.origin} → \${sub.resolved_route.destination}\`
                                        : "Espontânea / Sem Rota"}`
);

fs.writeFileSync(file, content);
