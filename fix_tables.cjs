const fs = require('fs');

const filesToFix = [
  'src/modules/company/components/SchedulesTab.tsx',
  'src/modules/company/components/MaintenanceTab.tsx',
  'src/modules/company/components/InventoryTab.tsx',
  'src/modules/company/components/FleetSettingsSection.tsx',
  'src/modules/company/components/DriverSummaryPrintModal.tsx',
  'src/modules/company/components/DefectPrintModal.tsx'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Naive replace: find `<table` and `</table>`, wrap them if they don't have overflow wrapper.
    // Actually, simple regex replacement:
    content = content.replace(/<table([\s\S]*?)<\/table>/g, (match, p1, offset, string) => {
        const before = string.substring(Math.max(0, offset - 150), offset);
        if (before.includes('overflow-x-auto') || before.includes('overflow-auto')) {
            return match; // already wrapped
        }
        return `<div className="overflow-x-auto w-full">${match}</div>`;
    });

    fs.writeFileSync(file, content);
  }
}
console.log('Fixed tables');
