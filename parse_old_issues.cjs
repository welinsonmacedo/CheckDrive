const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

const oldSubmissionsLogic = `
      // --- MIGRATION / FALLBACK FOR OLD SUBMISSIONS ---
      const { data: allSubmissions } = await supabase
        .from("checklist_submissions")
        .select("*")
        .eq("company_id", companyId)
        .neq("type", "fuel")
        .neq("type", "Abastecimento")
        .order("created_at", { ascending: false });
        
      const oldIssues: any[] = [];
      
      if (allSubmissions) {
        allSubmissions.forEach(sub => {
          // Check if this submission already has records in checklist_issues
          const hasMigrated = issuesData?.some((i: any) => i.submission_id === sub.id);
          if (hasMigrated) return;
          
          let responses;
          try {
            responses = typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses;
          } catch(e) {
            return;
          }
          
          if (responses && responses.defects) {
             Object.entries(responses.defects).forEach(([itemId, defectsList]: [string, any]) => {
                if (Array.isArray(defectsList)) {
                   defectsList.forEach(d => {
                      if (d.description || d.photo) {
                         oldIssues.push({
                           id: \`old-\${sub.id}-\${itemId}-\${Math.random()}\`,
                           submission_id: sub.id,
                           vehicle_id: sub.vehicle_id,
                           trailer_id: sub.trailer_id,
                           driver_id: sub.driver_id,
                           item_title: itemId,
                           description: d.description,
                           photo_url: d.photo,
                           status: "pending",
                           priority: "Medio",
                           created_at: sub.created_at,
                           company_id: sub.company_id,
                           auto_alerts: null,
                         });
                      }
                   });
                }
             });
          }
        });
      }
      
      const combinedIssuesData = [...(issuesData || []), ...oldIssues];
      
      const submissionIds = [
        ...new Set(combinedIssuesData.map((i: any) => i.submission_id)),
      ].filter(Boolean);
`;

code = code.replace(
  'const submissionIds = [\n        ...new Set(issuesData.map((i: any) => i.submission_id)),\n      ];',
  oldSubmissionsLogic
);

code = code.replace(
  'const filteredIssues = issuesData.filter(',
  'const filteredIssues = combinedIssuesData.filter('
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
