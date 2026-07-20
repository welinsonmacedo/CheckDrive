const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update fetchResolvedIssuesReport to use resolved_at
code = code.replace(
  /\.gte\("created_at", \`\$\\{startDate\\}T00:00:00Z\`\)/g,
  (match, offset, string) => {
    // Only replace inside fetchResolvedIssuesReport
    const before = string.substring(0, offset);
    if (before.includes('const fetchResolvedIssuesReport = async () => {') && !before.includes('const fetchFleetAgeReport = async () => {')) {
      return '.gte("resolved_at", `${startDate}T00:00:00Z`)';
    }
    return match;
  }
);
code = code.replace(
  /\.lte\("created_at", \`\$\\{endDate\\}T23:59:59Z\`\)/g,
  (match, offset, string) => {
    const before = string.substring(0, offset);
    if (before.includes('const fetchResolvedIssuesReport = async () => {') && !before.includes('const fetchFleetAgeReport = async () => {')) {
      return '.lte("resolved_at", `${endDate}T23:59:59Z`)';
    }
    return match;
  }
);

fs.writeFileSync(file, code);
console.log('Fixed date filter');
