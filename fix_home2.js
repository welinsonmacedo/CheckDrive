import fs from 'fs';

let content = fs.readFileSync('src/modules/driver/pages/DriverHome.tsx', 'utf8');

// I will remove the entire Active Schedule block manually to avoid regex weirdness.
// We can use string splitting.
const startMarker = '{/* Active Schedule Alert */}';
const endMarker = '{/* Checklist Grid */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if(startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

fs.writeFileSync('src/modules/driver/pages/DriverHome.tsx', content);
