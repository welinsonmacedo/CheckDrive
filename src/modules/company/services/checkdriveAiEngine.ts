import { supabase } from "@/src/lib/supabase";

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  category: "VEÍCULOS" | "MOTORISTAS" | "CHECKLIST" | "MANUTENÇÃO" | "ABASTECIMENTO" | "DOCUMENTOS" | "MULTAS" | "ALERTAS" | "GERAL";
  keywords: string[];
  phrases?: string[];
  handler: (companyId: string, query: string) => Promise<string>;
}

// Format currency in BRL
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

// Format date in PT-BR
const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "N/D";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/D";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "N/D";
  }
};

// Remove accents & normalize text
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getVehicleObj = (v: any) => {
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
};

const getProfileObj = (p: any) => {
  if (!p) return null;
  return Array.isArray(p) ? p[0] : p;
};

/* ====================================================================
   INTENT HANDLERS
   ==================================================================== */

// 1. Manutenção Atrasada / Pendente
const handleLateMaintenance = async (companyId: string): Promise<string> => {
  const { data: issues, error: issuesErr } = await supabase
    .from("checklist_issues")
    .select("*, vehicles(plate, model)")
    .eq("company_id", companyId)
    .in("status", ["pending", "open", "in_progress"])
    .order("created_at", { ascending: false });

  const { data: alerts, error: alertsErr } = await supabase
    .from("auto_alerts")
    .select("*, vehicles(plate, model)")
    .eq("company_id", companyId)
    .neq("status", "done")
    .order("created_at", { ascending: false });

  if (issuesErr && alertsErr) {
    return "❌ Ocorreu um erro ao consultar as manutenções no banco de dados. Por favor, tente novamente.";
  }

  const pendingIssues = issues || [];
  const pendingAlerts = (alerts || []).filter((a) => {
    if (a.due_date) {
      return new Date(a.due_date) <= new Date();
    }
    return true;
  });

  const totalCount = pendingIssues.length + pendingAlerts.length;

  if (totalCount === 0) {
    return (
      "✅ **Nenhuma Manutenção Atrasada Encontrada!**\n\n" +
      "Todos os veículos da frota estão com a manutenção em dia e sem pendências abertas no momento.\n\n" +
      "💡 *Dica:* Continue incentivando a realização diária de checklists para manter a prevenção em alta."
    );
  }

  let response = `🔧 **Relatório de Manutenções e Ocorrências Pendentes (${totalCount} no total)**\n\n`;

  if (pendingIssues.length > 0) {
    response += `📌 **Ocorrências de Manutenção Abertas (${pendingIssues.length}):**\n`;
    pendingIssues.slice(0, 5).forEach((issue, index) => {
      const v = getVehicleObj(issue.vehicles);
      const plate = v?.plate || "Sem Placa";
      const model = v?.model ? ` (${v.model})` : "";
      const title = issue.title || issue.description || "Ocorrência sem título";
      const priority = issue.priority ? `[Prioridade: ${issue.priority.toUpperCase()}]` : "";
      const date = formatDate(issue.created_at);
      response += `${index + 1}. **Veículo ${plate}**${model} - *${title}* ${priority} - Registrado em ${date}\n`;
    });
    if (pendingIssues.length > 5) {
      response += `   *...e mais ${pendingIssues.length - 5} ocorrências registradas na aba Pendências.*\n`;
    }
    response += "\n";
  }

  if (pendingAlerts.length > 0) {
    response += `⏰ **Alertas Preventivos Vencidos/Atrasados (${pendingAlerts.length}):**\n`;
    pendingAlerts.slice(0, 5).forEach((alert, index) => {
      const v = getVehicleObj(alert.vehicles);
      const plate = v?.plate || "Sem Placa";
      const title = alert.title || alert.description || "Alerta de Manutenção";
      const dueDate = formatDate(alert.due_date);
      response += `${index + 1}. **Veículo ${plate}** - *${title}* (Vencimento: ${dueDate})\n`;
    });
    if (pendingAlerts.length > 5) {
      response += `   *...e mais ${pendingAlerts.length - 5} alertas na aba Alertas.*\n`;
    }
    response += "\n";
  }

  response += "💡 **Recomendação:** Priorize o atendimento dos veículos com pendências graves ou prioridade ALTA para evitar paralisações não planejadas na operação.";

  return response;
};

// 2. Resumo da Operação de Hoje
const handleTodaySummary = async (companyId: string): Promise<string> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Checklists hoje
  const { data: checklists } = await supabase
    .from("checklist_submissions")
    .select("id, status, type, vehicles(plate)")
    .eq("company_id", companyId)
    .gte("created_at", startOfDay.toISOString());

  // Manutenções abertas hoje
  const { data: issues } = await supabase
    .from("checklist_issues")
    .select("id")
    .eq("company_id", companyId)
    .gte("created_at", startOfDay.toISOString());

  // Abastecimentos hoje
  const { data: fuelSubmissions } = await supabase
    .from("checklist_submissions")
    .select("id, details, odometer")
    .eq("company_id", companyId)
    .in("type", ["fuel", "Abastecimento"])
    .gte("created_at", startOfDay.toISOString());

  // Total Veículos
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, active")
    .eq("company_id", companyId);

  const totalVehicles = vehicles?.length || 0;
  const activeVehicles = vehicles?.filter((v) => v.active !== false).length || 0;
  const totalChecklists = checklists?.length || 0;
  const defectsCount = checklists?.filter((c) => c.status === "defect" || c.type === "defect").length || 0;
  const fuelCount = fuelSubmissions?.length || 0;
  const newIssuesCount = issues?.length || 0;

  // Calculo aproximado de litros hoje
  let totalLitersToday = 0;
  fuelSubmissions?.forEach((f) => {
    if (f.details?.manual_liters) {
      totalLitersToday += Number(f.details.manual_liters) || 0;
    }
  });

  const todayDate = new Date().toLocaleDateString("pt-BR");

  return (
    `📊 **Resumo da Operação de Hoje (${todayDate})**\n\n` +
    `🚚 **Status da Frota:**\n` +
    `- **Veículos Cadastrados:** ${totalVehicles} (${activeVehicles} ativos em operação)\n\n` +
    `📋 **Checklists e Inspeções:**\n` +
    `- **Realizados Hoje:** ${totalChecklists} checklists executados\n` +
    `- **Com Avarias/Defeitos:** ${defectsCount} vistorias apontaram falhas\n\n` +
    `🛠️ **Ocorrências & Manutenção:**\n` +
    `- **Novas Ocorrências Abertas:** ${newIssuesCount} pendências registradas hoje\n\n` +
    `⛽ **Abastecimentos:**\n` +
    `- **Lançamentos Hoje:** ${fuelCount} abastecimentos (${totalLitersToday.toLocaleString("pt-BR")} Litros)\n\n` +
    `💡 *Resumo Gerencial:* A operação está em andamento. Certifique-se de tratar os ${defectsCount + newIssuesCount} apontamentos de anomalias registrados no dia.`
  );
};

// 3. Custos com Combustível
const handleFuelCost = async (companyId: string): Promise<string> => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: fuelSubmissions } = await supabase
    .from("checklist_submissions")
    .select("id, created_at, odometer, details, vehicles(plate), profiles(full_name)")
    .eq("company_id", companyId)
    .in("type", ["fuel", "Abastecimento"])
    .gte("created_at", startOfMonth.toISOString())
    .order("created_at", { ascending: false });

  if (!fuelSubmissions || fuelSubmissions.length === 0) {
    return (
      "⛽ **Relatório de Gastos de Combustível (Mês Atual)**\n\n" +
      "Nenhum registro de abastecimento foi encontrado para o mês corrente.\n\n" +
      "💡 *Dica:* Registre os abastecimentos através da aba **Abastecimento** para habilitar análises de custo e consumo."
    );
  }

  let totalLiters = 0;
  let totalCostEstimate = 0;
  const vehicleVolumeMap: Record<string, number> = {};

  fuelSubmissions.forEach((sub) => {
    const liters = Number(sub.details?.manual_liters) || 0;
    const price = Number(sub.details?.price_per_liter) || Number(sub.details?.total_value) || 0;

    totalLiters += liters;
    if (sub.details?.total_value) {
      totalCostEstimate += Number(sub.details.total_value);
    } else if (liters > 0 && price > 0) {
      totalCostEstimate += liters * price;
    }

    const v = getVehicleObj(sub.vehicles);
    const plate = v?.plate || "Outros";
    vehicleVolumeMap[plate] = (vehicleVolumeMap[plate] || 0) + liters;
  });

  // Top abastecido
  const topVehicles = Object.entries(vehicleVolumeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  let response =
    `⛽ **Análise de Custos e Consumo de Combustível (${monthName})**\n\n` +
    `- **Total de Abastecimentos:** ${fuelSubmissions.length} lançamentos\n` +
    `- **Volume Total Abastecido:** ${totalLiters.toLocaleString("pt-BR")} Litros\n`;

  if (totalCostEstimate > 0) {
    response += `- **Custo Total Estimado:** ${formatCurrency(totalCostEstimate)}\n`;
  }

  response += "\n🏆 **Veículos com Maior Volume de Combustível no Mês:**\n";
  topVehicles.forEach(([plate, liters], idx) => {
    response += `${idx + 1}. **Veículo ${plate}** - ${liters.toLocaleString("pt-BR")} L\n`;
  });

  response += "\n💡 **Dica:** Acesse a aba **Médias** para conferir o rendimento de km/L de cada veículo e escala.";

  return response;
};

// 4. Pior Consumo / Maior Consumo por Motorista
const handleWorstConsumption = async (companyId: string): Promise<string> => {
  const { data: averages } = await supabase
    .from("vehicle_averages")
    .select("*, vehicles(plate), profiles(full_name)")
    .eq("company_id", companyId)
    .gt("average_kml", 0)
    .order("average_kml", { ascending: true })
    .limit(10);

  if (!averages || averages.length === 0) {
    return (
      "📉 **Análise de Média de Consumo de Combustível**\n\n" +
      "Ainda não existem médias de consumo calculadas na tabela de Médias.\n\n" +
      "💡 *Dica:* Utilize a aba **Médias** e sincronize o histórico de escalas e abastecimentos para gerar o cálculo automático de km/L."
    );
  }

  let response = "📉 **Ranking de Condutores e Veículos com Pior Média de Consumo (km/L)**\n\n";

  averages.forEach((avg, idx) => {
    const prof = getProfileObj(avg.profiles);
    const v = getVehicleObj(avg.vehicles);

    const driver = prof?.full_name || "Motorista não identificado";
    const plate = v?.plate || "N/I";
    const kml = Number(avg.average_kml).toFixed(2);
    const distance = avg.distance_km ? `${avg.distance_km} km` : "";
    const liters = avg.fuel_liters ? `${avg.fuel_liters} L` : "";

    response += `${idx + 1}. **${driver}** | Veículo **${plate}**\n`;
    response += `   👉 Média: **${kml} km/L** ${distance ? `(${distance} percorridos` : ""}${liters ? `, ${liters} abastecidos)` : ""}\n`;
  });

  response += "\n💡 **Orientação:** Realize reciclagem de condução defensiva e econômica para os motoristas no topo da lista.";

  return response;
};

// 5. Veículos com Mais Ocorrências / Avarias
const handleVehicleOccurrences = async (companyId: string): Promise<string> => {
  const { data: issues } = await supabase
    .from("checklist_issues")
    .select("id, status, vehicles(id, plate, model)")
    .eq("company_id", companyId);

  if (!issues || issues.length === 0) {
    return (
      "🛡️ **Análise de Ocorrências e Avarias por Veículo**\n\n" +
      "Nenhuma ocorrência ou avaria registrada no sistema até o momento. Excelente estado da frota!"
    );
  }

  const occurrencesMap: Record<string, { plate: string; model: string; count: number; openCount: number }> = {};

  issues.forEach((issue) => {
    const v = getVehicleObj(issue.vehicles);
    const vId = v?.id || "unknown";
    const plate = v?.plate || "Sem Placa";
    const model = v?.model || "";

    if (!occurrencesMap[vId]) {
      occurrencesMap[vId] = { plate, model, count: 0, openCount: 0 };
    }

    occurrencesMap[vId].count += 1;
    if (issue.status === "pending" || issue.status === "open" || issue.status === "in_progress") {
      occurrencesMap[vId].openCount += 1;
    }
  });

  const sortedVehicles = Object.values(occurrencesMap).sort((a, b) => b.count - a.count);

  let response = "🚨 **Veículos com Maior Histórico de Ocorrências e Defeitos**\n\n";

  sortedVehicles.slice(0, 5).forEach((item, idx) => {
    const modelStr = item.model ? ` (${item.model})` : "";
    response += `${idx + 1}. **Veículo ${item.plate}**${modelStr}\n`;
    response += `   👉 Total de Ocorrências: **${item.count}** (${item.openCount} ainda abertas/em manutenção)\n`;
  });

  response += "\n💡 **Recomendação:** Avalie se veículos com alto índice de avarias necessitam de revisão completa de suspensão/motor ou substituição de componentes estruturais.";

  return response;
};

// 6. Veículos Parados / Inativos
const handleStoppedVehicles = async (companyId: string): Promise<string> => {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, model, active, created_at")
    .eq("company_id", companyId);

  const { data: openIssues } = await supabase
    .from("checklist_issues")
    .select("vehicle_id, title, status")
    .eq("company_id", companyId)
    .in("status", ["pending", "open", "in_progress"]);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo encontrado no cadastro da empresa.";
  }

  const issuesVehicleSet = new Set((openIssues || []).map((i) => i.vehicle_id));
  const inactiveVehicles = vehicles.filter((v) => v.active === false);
  const maintenanceVehicles = vehicles.filter((v) => v.active !== false && issuesVehicleSet.has(v.id));

  let response = `🚚 **Relatório de Veículos Parados e Inativos**\n\n`;

  response += `🔴 **Inativos / Desativados (${inactiveVehicles.length}):**\n`;
  if (inactiveVehicles.length > 0) {
    inactiveVehicles.forEach((v) => {
      response += `- **${v.plate}** ${v.model ? `(${v.model})` : ""} - Status: Inativo no cadastro\n`;
    });
  } else {
    response += `- Nenhum veículo desativado.\n`;
  }

  response += `\n🟡 **Em Manutenção / Oficina (${maintenanceVehicles.length}):**\n`;
  if (maintenanceVehicles.length > 0) {
    maintenanceVehicles.forEach((v) => {
      response += `- **${v.plate}** ${v.model ? `(${v.model})` : ""} - Possui ordem de serviço aberta\n`;
    });
  } else {
    response += `- Nenhum veículo parado por manutenção no momento.\n`;
  }

  return response;
};

// 7. Ranking de Motoristas e Checklists
const handleDriverRanking = async (companyId: string): Promise<string> => {
  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, cnh_number")
    .eq("company_id", companyId)
    .eq("role", "driver");

  const { data: checklists } = await supabase
    .from("checklist_submissions")
    .select("driver_id")
    .eq("company_id", companyId);

  if (!drivers || drivers.length === 0) {
    return "👨‍✈️ Nenhum motorista cadastrado na empresa.";
  }

  const driverChecklistCounts: Record<string, number> = {};
  (checklists || []).forEach((c) => {
    if (c.driver_id) {
      driverChecklistCounts[c.driver_id] = (driverChecklistCounts[c.driver_id] || 0) + 1;
    }
  });

  const rankedDrivers = drivers.map((d) => ({
    name: d.full_name || "Sem Nome",
    checklistsCount: driverChecklistCounts[d.id] || 0,
  })).sort((a, b) => b.checklistsCount - a.checklistsCount);

  let response = `🏆 **Engajamento e Ranking de Checklists dos Motoristas**\n\n`;

  rankedDrivers.slice(0, 5).forEach((d, idx) => {
    response += `${idx + 1}. **${d.name}** - **${d.checklistsCount}** checklists executados\n`;
  });

  response += `\n💡 **Dica:** Acesse a aba **Ranking** para visualizar o Score completo e bonificações de condutores.`;

  return response;
};

// 8. Documentos Vencidos ou a Vencer
const handleExpiringDocuments = async (companyId: string): Promise<string> => {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("plate, model, crlv_expiration, antt_expiration, insurance_expiration")
    .eq("company_id", companyId);

  const { data: drivers } = await supabase
    .from("profiles")
    .select("full_name, cnh_expiration")
    .eq("company_id", companyId)
    .eq("role", "driver");

  const now = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + 30); // 30 dias

  const expiredOrSoon: string[] = [];

  // Checar veículos
  (vehicles || []).forEach((v) => {
    const checkDoc = (docName: string, expStr?: string | null) => {
      if (!expStr) return;
      const exp = new Date(expStr);
      if (exp <= limitDate) {
        const isExpired = exp < now;
        const statusStr = isExpired ? "🔴 VENCIDO" : "🟡 Vence em breve";
        expiredOrSoon.push(
          `${statusStr}: **${docName}** do Veículo **${v.plate}** (${formatDate(expStr)})`
        );
      }
    };

    checkDoc("CRLV", v.crlv_expiration);
    checkDoc("ANTT", v.antt_expiration);
    checkDoc("Seguro", v.insurance_expiration);
  });

  // Checar CNH motoristas
  (drivers || []).forEach((d) => {
    if (d.cnh_expiration) {
      const exp = new Date(d.cnh_expiration);
      if (exp <= limitDate) {
        const isExpired = exp < now;
        const statusStr = isExpired ? "🔴 VENCIDA" : "🟡 Vence em breve";
        expiredOrSoon.push(
          `${statusStr}: **CNH** do Motorista **${d.full_name}** (${formatDate(d.cnh_expiration)})`
        );
      }
    }
  });

  if (expiredOrSoon.length === 0) {
    return (
      "📄 **Situação da Documentação da Frota**\n\n" +
      "Todos os documentos de veículos (CRLV, ANTT, Seguro) e CNHs dos motoristas estão regulares e com vencimento superior a 30 dias!"
    );
  }

  let response = `📄 **Alerta de Documentos Vencidos ou a Vencer nos Próximos 30 Dias (${expiredOrSoon.length}):**\n\n`;
  expiredOrSoon.slice(0, 8).forEach((item) => {
    response += `- ${item}\n`;
  });

  if (expiredOrSoon.length > 8) {
    response += `\n*...e mais ${expiredOrSoon.length - 8} documentos com pendência no cadastro.*\n`;
  }

  response += "\n⚠️ **Ação recomendada:** Providencie a renovação imediata dos documentos marcados como VENCIDOS para evitar retenção de veículos e infrações gravíssimas.";

  return response;
};

// 9. Multas e Infrações
const handleTrafficInfractions = async (companyId: string): Promise<string> => {
  const { data: infractions } = await supabase
    .from("traffic_infractions")
    .select("*, vehicles(plate), profiles(full_name)")
    .eq("company_id", companyId)
    .order("infraction_date", { ascending: false });

  if (!infractions || infractions.length === 0) {
    return (
      "🚨 **Gestão de Infrações e Multas**\n\n" +
      "Nenhuma infração ou multa registrada no sistema até o momento. Excelente histórico de trânsito!"
    );
  }

  let totalValue = 0;
  let totalPoints = 0;

  infractions.forEach((inf) => {
    totalValue += Number(inf.fine_amount) || 0;
    totalPoints += Number(inf.points) || 0;
  });

  let response =
    `🚨 **Resumo de Infrações e Multas de Trânsito**\n\n` +
    `- **Total de Infrações Registradas:** ${infractions.length}\n` +
    `- **Valor Total em Multas:** ${formatCurrency(totalValue)}\n` +
    `- **Pontuação Total:** ${totalPoints} pontos acumulados\n\n` +
    `📌 **Últimas Infrações Registradas:**\n`;

  infractions.slice(0, 5).forEach((inf, idx) => {
    const v = getVehicleObj(inf.vehicles);
    const prof = getProfileObj(inf.profiles);

    const plate = v?.plate || "N/I";
    const driver = prof?.full_name || "Não indicado";
    const date = formatDate(inf.infraction_date);
    const amount = inf.fine_amount ? formatCurrency(inf.fine_amount) : "";

    response += `${idx + 1}. **Veículo ${plate}** | Motorista: **${driver}** - Data: ${date} ${amount ? `(${amount})` : ""}\n`;
  });

  response += "\n💡 **Dica:** Acesse a aba **Infrações** para efetuar a indicação de condutor e emissão de espelho.";

  return response;
};

// 10. Alertas Preventivos do Sistema
const handlePendingAlerts = async (companyId: string): Promise<string> => {
  const { data: alerts } = await supabase
    .from("auto_alerts")
    .select("*, vehicles(plate, model)")
    .eq("company_id", companyId)
    .neq("status", "done")
    .order("created_at", { ascending: false });

  if (!alerts || alerts.length === 0) {
    return (
      "🔔 **Alertas Preventivos do Sistema**\n\n" +
      "Não há alertas preventivos pendentes no momento. Toda a manutenção programada está em dia!"
    );
  }

  let response = `🔔 **Alertas Preventivos e Vencimentos Pendentes (${alerts.length}):**\n\n`;

  alerts.slice(0, 6).forEach((alert, idx) => {
    const v = getVehicleObj(alert.vehicles);
    const plate = v?.plate || "Sem Placa";
    const title = alert.title || alert.description || "Alerta de Manutenção";
    const dueKm = alert.due_km ? `Aos ${alert.due_km.toLocaleString("pt-BR")} km` : "";
    const dueDate = alert.due_date ? `Data: ${formatDate(alert.due_date)}` : "";

    response += `${idx + 1}. **Veículo ${plate}** - *${title}* ${dueKm || dueDate ? `[${[dueKm, dueDate].filter(Boolean).join(" | ")}]` : ""}\n`;
  });

  return response;
};

// 11. Visão Geral / Cadastro da Frota
const handleFleetOverview = async (companyId: string): Promise<string> => {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, active, type, brand, model")
    .eq("company_id", companyId);

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, active")
    .eq("company_id", companyId)
    .eq("role", "driver");

  const totalV = vehicles?.length || 0;
  const activeV = vehicles?.filter((v) => v.active !== false).length || 0;
  const totalD = drivers?.length || 0;
  const activeD = drivers?.filter((d) => d.active !== false).length || 0;

  return (
    `🚛 **Visão Geral do Cadastro da Frota**\n\n` +
    `- **Total de Veículos:** ${totalV} (${activeV} ativos, ${totalV - activeV} inativos)\n` +
    `- **Total de Motoristas:** ${totalD} (${activeD} ativos)\n\n` +
    `💡 *Pergunte também:* "Quais veículos estão com manutenção atrasada?" ou "Quanto gastei com combustível este mês?"`
  );
};


/* ====================================================================
   INTENT REGISTRY
   ==================================================================== */

export const INTENT_REGISTRY: IntentDefinition[] = [
  {
    id: "today_summary",
    name: "Resumo da Operação de Hoje",
    description: "Gera um balanço diário da frota, checklists, ocorrências e abastecimentos.",
    category: "GERAL",
    keywords: ["resumo", "operacao", "hoje", "balanco", "status do dia", "dia de hoje", "geral"],
    phrases: [
      "gere um resumo da operacao de hoje",
      "resumo de hoje",
      "como esta a operacao",
      "balanco do dia",
      "resumo operacional"
    ],
    handler: handleTodaySummary,
  },
  {
    id: "late_maintenance",
    name: "Manutenção Atrasada e Pendências",
    description: "Busca veículos com revisões, ordens de serviço ou alertas em atraso.",
    category: "MANUTENÇÃO",
    keywords: ["manutencao", "atrasada", "oficina", "revisao", "pendencia", "ordem de servico", "os", "pendente", "troca"],
    phrases: [
      "quais veiculos estao com manutencao atrasada",
      "manutencoes pendentes",
      "veiculos na oficina",
      "revisoes atrasadas",
      "ordens de servico abertas"
    ],
    handler: handleLateMaintenance,
  },
  {
    id: "fuel_cost",
    name: "Custos e Gastos com Combustível",
    description: "Calcula o volume e valor total gasto com abastecimentos no mês.",
    category: "ABASTECIMENTO",
    keywords: ["combustivel", "diesel", "gasolina", "gasto", "gastos", "custo", "abastecimento", "posto", "valor"],
    phrases: [
      "quanto gastei com combustivel este mes",
      "gasto de diesel",
      "valor abastecimento",
      "custo com combustivel",
      "gastos de abastecimento"
    ],
    handler: handleFuelCost,
  },
  {
    id: "worst_consumption",
    name: "Pior Consumo / Maior Gasto por Motorista",
    description: "Identifica condutores e veículos com menor rendimento de km/L.",
    category: "ABASTECIMENTO",
    keywords: ["consumo", "pior consumo", "maior consumo", "km/l", "media", "km/litro", "gastei", "rendimento"],
    phrases: [
      "quais motoristas tiveram o pior consumo",
      "motoristas com maior consumo",
      "pior media de combustivel",
      "quem esta gastando mais combustivel"
    ],
    handler: handleWorstConsumption,
  },
  {
    id: "vehicle_occurrences",
    name: "Veículos com Mais Ocorrências e Avarias",
    description: "Lista veículos que acumulam mais reclamações e avarias nos checklists.",
    category: "VEÍCULOS",
    keywords: ["ocorrencia", "ocorrencias", "avaria", "avarias", "defeito", "defeitos", "quebras", "problemas"],
    phrases: [
      "quais veiculos possuem mais ocorrencias",
      "veiculos com mais avarias",
      "caminhoes com mais defeitos",
      "quais veiculos mais quebram"
    ],
    handler: handleVehicleOccurrences,
  },
  {
    id: "stopped_vehicles",
    name: "Veículos Parados e Inativos",
    description: "Relaciona veículos desativados ou parados para manutenção.",
    category: "VEÍCULOS",
    keywords: ["parado", "parados", "inativo", "inativos", "parada", "desativado", "desativados", "frota parada"],
    phrases: [
      "quais veiculos estao parados",
      "quais caminhoes estao parados",
      "existe veiculo parado",
      "quais veiculos estao inativos"
    ],
    handler: handleStoppedVehicles,
  },
  {
    id: "driver_ranking",
    name: "Ranking e Engajamento de Motoristas",
    description: "Exibe a participação e checklists realizados pelos motoristas.",
    category: "MOTORISTAS",
    keywords: ["motorista", "motoristas", "condutor", "ranking", "score", "pontuacao", "checklists motorista"],
    phrases: [
      "quais motoristas fizeram mais checklists",
      "ranking de motoristas",
      "melhores motoristas",
      "score dos motoristas"
    ],
    handler: handleDriverRanking,
  },
  {
    id: "expiring_documents",
    name: "Documentos e CNHs Vencidos",
    description: "Verifica vencimento de CRLV, ANTT, Seguros e CNH dos motoristas.",
    category: "DOCUMENTOS",
    keywords: ["documento", "documentos", "crlv", "antt", "seguro", "cnh", "vencimento", "vencidos", "vencido"],
    phrases: [
      "quais documentos estao vencidos",
      "crlv vencido",
      "antt vencida",
      "cnh vencida",
      "vencimentos de seguros"
    ],
    handler: handleExpiringDocuments,
  },
  {
    id: "traffic_infractions",
    name: "Infrações e Multas de Trânsito",
    description: "Exibe total de multas, pontos e condutores infratores.",
    category: "MULTAS",
    keywords: ["multa", "multas", "infracao", "infracoes", "pontos", "gravidade", "transito"],
    phrases: [
      "quais multas foram registradas",
      "infracoes do mes",
      "motorista com mais multas",
      "gastos com multas"
    ],
    handler: handleTrafficInfractions,
  },
  {
    id: "pending_alerts",
    name: "Alertas Preventivos do Sistema",
    description: "Exibe alertas agendados por quilometragem ou data.",
    category: "ALERTAS",
    keywords: ["alerta", "alertas", "preventiva", "agendamento", "vencimento alerta"],
    phrases: [
      "quais alertas estao pendentes",
      "alertas de revisao",
      "alertas preventivos"
    ],
    handler: handlePendingAlerts,
  },
  {
    id: "fleet_overview",
    name: "Cadastro e Visão Geral da Frota",
    description: "Total de caminhões, carretas e condutores ativos no sistema.",
    category: "VEÍCULOS",
    keywords: ["frota", "veiculos", "caminhoes", "carretas", "placa", "cadastro"],
    phrases: [
      "quantos veiculos temos na frota",
      "visao geral da frota",
      "resumo dos veiculos"
    ],
    handler: handleFleetOverview,
  },
];


/* ====================================================================
   INTENT MATCHER ENGINE
   ==================================================================== */

export interface QueryResult {
  intentId: string | null;
  intentName: string | null;
  responseText: string;
  confidence: number;
}

export async function processCheckDriveAiQuery(
  rawQuery: string,
  companyId: string
): Promise<QueryResult> {
  const normalized = normalizeText(rawQuery);

  if (!normalized || normalized.length < 2) {
    return {
      intentId: null,
      intentName: null,
      confidence: 0,
      responseText:
        "👋 **Olá! Sou o Assistente Inteligente CheckDrive AI.**\n\nPor favor, faça uma pergunta em linguagem natural sobre a sua frota, como por exemplo:\n\n" +
        "• *Quais veículos estão com manutenção atrasada?*\n" +
        "• *Gere um resumo da operação de hoje.*\n" +
        "• *Quais motoristas tiveram o pior consumo?*\n" +
        "• *Quanto gastei com combustível este mês?*\n" +
        "• *Quais veículos possuem mais ocorrências?*",
    };
  }

  let bestIntent: IntentDefinition | null = null;
  let highestScore = 0;

  for (const intent of INTENT_REGISTRY) {
    let score = 0;

    // Check exact phrase matches (High weight)
    if (intent.phrases) {
      for (const phrase of intent.phrases) {
        const normPhrase = normalizeText(phrase);
        if (normalized === normPhrase) {
          score += 100;
        } else if (normalized.includes(normPhrase) || normPhrase.includes(normalized)) {
          score += 50;
        }
      }
    }

    // Check keyword matches
    for (const kw of intent.keywords) {
      const normKw = normalizeText(kw);
      if (normalized.includes(normKw)) {
        score += 15;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  // Threshold to determine if matched successfully
  if (bestIntent && highestScore >= 15) {
    try {
      const responseText = await bestIntent.handler(companyId, rawQuery);
      return {
        intentId: bestIntent.id,
        intentName: bestIntent.name,
        confidence: Math.min(highestScore / 100, 1.0),
        responseText,
      };
    } catch (err: any) {
      console.error("Erro ao executar handler de intenção:", err);
      return {
        intentId: bestIntent.id,
        intentName: bestIntent.name,
        confidence: 0,
        responseText: `⚠️ Desculpe, ocorreu uma falha ao consultar o banco de dados para a sua pergunta (${bestIntent.name}). Por favor, tente novamente em instantes.`,
      };
    }
  }

  /* ====================================================================
     FUTURE_AI_FALLBACK_HOOK
     (When an external AI model like Gemini is integrated in the future,
      unrecognized queries can be routed to the AI model here.)
     ==================================================================== */

  return {
    intentId: null,
    intentName: null,
    confidence: 0,
    responseText:
      "🤖 **CheckDrive AI - Interpretação de Intenção**\n\n" +
      `Não identifiquei uma consulta correspondente para: *"${rawQuery}"*.\n\n` +
      "Atualmente consigo consultar diretamente no banco de dados os seguintes temas da sua operação:\n\n" +
      "• 🛠️ **Manutenções e Revisões:** *'Quais veículos estão com manutenção atrasada?'*\n" +
      "• 📊 **Resumo Diário:** *'Gere um resumo da operação de hoje'*\n" +
      "• ⛽ **Combustível:** *'Quanto gastei com combustível este mês?'*\n" +
      "• 📉 **Consumo & Média:** *'Quais motoristas tiveram o pior consumo?'*\n" +
      "• 🚨 **Ocorrências e Avarias:** *'Quais veículos possuem mais ocorrências?'*\n" +
      "• 🚚 **Status de Veículos:** *'Quais veículos estão parados?'*\n" +
      "• 📄 **Documentos e Vencimentos:** *'Quais documentos estão vencidos?'*\n" +
      "• 🏆 **Motoristas e Checklists:** *'Quais motoristas fizeram mais checklists?'*\n\n" +
      "💡 *Experimente selecionar um dos exemplos acima ou reescrever sua pergunta.*",
  };
}
