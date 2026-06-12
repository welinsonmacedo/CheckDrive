import fs from 'fs';

let lines = fs.readFileSync('src/modules/driver/pages/DriverHome.tsx', 'utf8').split('\n');

// We need to remove from line 266 (which is:  `       às {new Date(schedule.end...`) 
// wait, the indexing is 0-based. Line 267 in view_file corresponds to lines[266].
// I'll just remove from 266 up to 328 (which is line 329: `      )})} `).

lines.splice(266, 329 - 266 + 1);

fs.writeFileSync('src/modules/driver/pages/DriverHome.tsx', lines.join('\n'));
