const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

let lines = code.split('\n');

// Find the index of the first `if (isMobileDevice && !isPwaInstalled)`
let idx = lines.findIndex(l => l.includes('if (isMobileDevice && !isPwaInstalled)'));

if (idx !== -1 && idx < 150) {
    let startIdx = idx;
    // Find the end of this block which should be before `return () => clearInterval`
    let endIdx = -1;
    for (let i = startIdx; i < startIdx + 40; i++) {
        if (lines[i] && lines[i].includes('return () => clearInterval')) {
            endIdx = i;
            break;
        }
    }
    if (endIdx !== -1) {
        lines.splice(startIdx, endIdx - startIdx);
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed lines');
