const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    setResolvingIssueId(issue.grouped_ids || [issue.id]);
    setSelectedIdsToResolve(issue.grouped_ids || [issue.id]);
    setResolveNotes(issue.resolution_notes || "");`;

const replacement = `    setResolvingIssueId(issue.grouped_ids || [issue.id]);
    setSelectedIdsToResolve(issue.grouped_ids || [issue.id]);
    setResolveNotes(issue.resolution_notes || "");
    setResolveType(issue.resolution_type || "");`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed open modal');
