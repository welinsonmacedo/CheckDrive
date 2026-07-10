const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

// Update useEffect
content = content.replace(
  'if (activeReport === "defects") {\n      fetchDefectsReport();\n    } else if (activeReport === "mileage") {',
  'if (activeReport === "defects") {\n      fetchDefectsReport();\n    } else if (activeReport === "pending_by_plate") {\n      fetchPendingByPlateReport();\n    } else if (activeReport === "mileage") {'
);

const fetchFn = `
  const fetchPendingByPlateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_issues")
        .select(
          "*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name)"
        )
        // NOTE: we could filter by date or not, but let's filter by the date range selected
        .gte("created_at", \`\${startDate}T00:00:00Z\`)
        .lte("created_at", \`\${endDate}T23:59:59Z\`);

      if (error) throw error;

      // Only pending defects
      const mappedData = data.map((d) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }
        return { ...d, status };
      }).filter(d => d.status === "pending" || d.status === "waiting");

      // Group by plate
      const grouped: Record<string, any[]> = {};
      mappedData.forEach(d => {
        const plate = d.vehicles?.plate || d.trailers?.plate || "Sem Placa";
        if (!grouped[plate]) grouped[plate] = [];
        grouped[plate].push(d);
      });

      const groupedArray = Object.keys(grouped).map(plate => ({
        plate,
        issues: grouped[plate],
        count: grouped[plate].length
      })).sort((a, b) => b.count - a.count);

      setPendingByPlateData(groupedArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
`;

content = content.replace(
  'const fetchDefectsReport = async () => {',
  fetchFn + '\n  const fetchDefectsReport = async () => {'
);

// Update refresh button
content = content.replace(
  'if (activeReport === "defects") fetchDefectsReport();',
  'if (activeReport === "defects") fetchDefectsReport();\n                else if (activeReport === "pending_by_plate") fetchPendingByPlateReport();'
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated fetches.");
