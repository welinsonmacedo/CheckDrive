const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change export
code = code.replace('export default function VehiclesTab()', 'export default function MyVehicles()');

// Remove the Plus icon from imports
code = code.replace('Plus, ', '');
code = code.replace('Edit2, ', '');

// We will remove all the form save functions and JSX.
// Specifically remove 'handleSaveVehicle' and 'handleSaveTrailer' and 'handleToggleStatus'.
// It's easier to use a regex or just replace chunks of code if they are too big.

fs.writeFileSync(file, code);
