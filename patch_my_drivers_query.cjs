const fs = require('fs');
const file = 'src/modules/driver/pages/MyDrivers.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '.select("*, driver_modalities(modality_id)")',
  '.select("*")\n        .eq("role", "driver")'
);

fs.writeFileSync(file, code);
