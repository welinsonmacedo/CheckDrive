import fs from 'fs';

let content = fs.readFileSync('src/modules/driver/pages/DriverHome.tsx', 'utf8');

// remove the active schedule card.
content = content.replace(/\{\/\* Active Schedule Alert \*\/\}[\s\S]*?\}\)\}/, '');

fs.writeFileSync('src/modules/driver/pages/DriverHome.tsx', content);
