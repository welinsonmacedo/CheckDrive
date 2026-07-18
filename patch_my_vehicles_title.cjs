const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">`;
const replacement = `        <div className="flex justify-between items-center px-1 mb-2">
          <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Veículos</h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">`;

code = code.replace(target, replacement);

// We should also add some padding, since it's a page in the driver layout.
const returnTarget = `return (
    <>
      <div className={\`flex flex-col gap-6 \${selectedVehicle ? 'print:hidden' : ''}\`}>`;
const returnReplacement = `return (
    <div className="p-6 max-w-2xl mx-auto py-10">
      <div className={\`flex flex-col gap-6 \${selectedVehicle ? 'print:hidden' : ''}\`}>`;

code = code.replace(returnTarget, returnReplacement);
code = code.replace(`</>\n  );`, `</div>\n  );`); // Assuming we just close the div

fs.writeFileSync(file, code);
