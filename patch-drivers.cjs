const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update the DriversDashboardView signature
content = content.replace(
  'const DriversDashboardView = ({\n  infractions,\n  drivers,\n}: {\n  infractions: any[];\n  drivers: any[];\n}) => {',
  'const DriversDashboardView = ({\n  infractions,\n  drivers,\n  onViewAttachment,\n}: {\n  infractions: any[];\n  drivers: any[];\n  onViewAttachment: (url: string) => void;\n}) => {'
);

// Update where it's called
content = content.replace(
  '<DriversDashboardView infractions={infractions} drivers={drivers} />',
  '<DriversDashboardView infractions={infractions} drivers={drivers} onViewAttachment={setSelectedAttachment} />'
);

// Add the eye button in the map inside DriversDashboardView
const buttonToAdd = `                        </div>

                        {inf.attachment_url && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewAttachment(inf.attachment_url); }}
                            className="mt-2 p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-end w-fit self-end self-end sm:self-end"
                            title="Ver Anexos"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>`;

content = content.replace(
  `                        {/* Display Installments inside driver history card */}`,
  buttonToAdd + `\n                        {/* Display Installments inside driver history card */}`
);

fs.writeFileSync(file, content);
console.log('Fixed DriversDashboardView props and button');
