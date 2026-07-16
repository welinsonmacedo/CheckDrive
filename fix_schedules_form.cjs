const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

// Vehicle options
content = content.replace(
  'options={vehicles.map((v) => ({',
  `options={vehicles.filter(v => {
                      const drv = users.find(u => u.id === scheduleForm.driver_id);
                      if (!drv || !drv.modality_ids || drv.modality_ids.length === 0) return true;
                      return drv.modality_ids.includes(v.modality_id || "");
                    }).map((v) => ({`
);

// Bait 1 options
content = content.replace(
  'options={baits.map((b) => ({\\n                          value: b.id,\\n                          label: `${b.name} (${b.identifier || \'S/N\'})`,\\n                        }))}\\n                        value={\\n                          baits',
  `options={baits.filter(b => b.id === scheduleForm.bait1_id || ![scheduleForm.bait2_id, scheduleForm.bait3_id].includes(b.id)).map((b) => ({
                          value: b.id,
                          label: \`\${b.name} (\${b.identifier || 'S/N'})\`,
                        }))}
                        value={
                          baits`
);

// We should use regex to replace all baits options since they are similar.
let occurrences = 0;
content = content.replace(/options=\{baits\.map\(\(b\) => \(\{\n\s*value: b\.id,\n\s*label: `\$\{b\.name\} \(\$\{b\.identifier \|\| 'S\/N'\}\)`,\n\s*\}\)\)\}/g, (match) => {
  occurrences++;
  if (occurrences === 1) {
    return `options={baits.filter(b => b.id === scheduleForm.bait1_id || ![scheduleForm.bait2_id, scheduleForm.bait3_id].includes(b.id)).map((b) => ({ value: b.id, label: \`\${b.name} (\${b.identifier || 'S/N'})\` }))}`;
  } else if (occurrences === 2) {
    return `options={baits.filter(b => b.id === scheduleForm.bait2_id || ![scheduleForm.bait1_id, scheduleForm.bait3_id].includes(b.id)).map((b) => ({ value: b.id, label: \`\${b.name} (\${b.identifier || 'S/N'})\` }))}`;
  } else if (occurrences === 3) {
    return `options={baits.filter(b => b.id === scheduleForm.bait3_id || ![scheduleForm.bait1_id, scheduleForm.bait2_id].includes(b.id)).map((b) => ({ value: b.id, label: \`\${b.name} (\${b.identifier || 'S/N'})\` }))}`;
  }
  return match;
});

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
