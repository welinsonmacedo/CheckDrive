const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

// 1. Vehicle filtering logic
const vehicleSelectStart = '<Select\\n                    className="text-xs font-bold"\\n                    placeholder="Selecionar veículo..."\\n                    isClearable\\n                    options={vehicles.map\\(';
const vehicleSelectReplacement = `const selectedDriver = users.find(u => u.id === scheduleForm.driver_id);
                  const filteredVehicles = vehicles.filter(v => {
                    if (!selectedDriver || !selectedDriver.modality_ids || selectedDriver.modality_ids.length === 0) return true;
                    return selectedDriver.modality_ids.includes(v.modality_id || "");
                  });
                  return (
                    <Select
                      className="text-xs font-bold"
                      placeholder="Selecionar veículo..."
                      isClearable
                      options={filteredVehicles.map(`;

// We need to inject the logic just before the <Select> or we can just replace the options prop directly
