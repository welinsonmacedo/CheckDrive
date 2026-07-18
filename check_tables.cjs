const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let found = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  let pos = -1;
  while ((pos = content.indexOf('<table', pos + 1)) !== -1) {
    const before = content.substring(Math.max(0, pos - 150), pos);
    if (!before.includes('overflow-x-auto') && !before.includes('overflow-auto')) {
      console.log('Missing overflow before <table in:', file);
      found = true;
    }
  }
}
if (!found) console.log('All tables have overflow!');
