const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

const titleLogic = `
                {activeReport === "defects" && "Inspeção de Defeitos e Sinistros"}
                {activeReport === "pending_by_plate" && "Defeitos Pendentes por Placa"}
                {activeReport === "mileage" && "Indicador de Distância e KM Rodado"}
                {activeReport === "history" && "Histórico do Veículo"}
                {activeReport === "purchases" && "Histórico de Manutenções"}
                {activeReport === "schedules" && "Histórico de Agendamentos"}
`;

content = content.replace(
  '{activeReport === "defects"\n                  ? "Inspeção de Defeitos e Sinistros"\n                  : "Indicador de Distância e KM Rodado"}',
  titleLogic
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated title logic.");
