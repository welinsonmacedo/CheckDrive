import { supabase } from "@/src/lib/supabase";
import { GoogleGenAI } from "@google/genai";

export interface IntentDefinition {
  id: string;
  name: string;
  description: string;
  category: "VEÍCULOS" | "MOTORISTAS" | "CHECKLIST" | "MANUTENÇÃO" | "ABASTECIMENTO" | "DOCUMENTOS" | "MULTAS" | "ALERTAS" | "ESTOQUE" | "ESCALAS" | "SEGURADORAS" | "AUDITORIA" | "RELATÓRIOS" | "GERAL";
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

// Format date with time
const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "N/D";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/D";
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
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

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Strict Word-Boundary Keyword Matcher
const matchesWord = (text: string, keyword: string): boolean => {
  const normText = normalizeText(text);
  const normKw = normalizeText(keyword);
  if (!normKw || !normText) return false;
  if (!normKw.includes(" ")) {
    const regex = new RegExp(`(?:^|\\s|\\b)${escapeRegExp(normKw)}(?:$|\\s|\\b)`, "i");
    return regex.test(normText);
  }
  return normText.includes(normKw);
};

const getVehicleObj = (v: any) => {
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
};

// Global robust data fetchers
const fetchVehicles = async (companyId?: string) => {
  try {
    const { data } = await supabase.from("vehicles").select("*");
    if (data && data.length > 0) {
      if (companyId) {
        const filtered = data.filter((v) => v.company_id === companyId);
        if (filtered.length > 0) return filtered;
      }
      return data;
    }
    return [];
  } catch (e) {
    console.error("CheckDrive AI - fetchVehicles error:", e);
    return [];
  }
};

const fetchDrivers = async (companyId?: string) => {
  try {
    const { data } = await supabase.from("profiles").select("*");
    if (data && data.length > 0) {
      if (companyId) {
        const filtered = data.filter((p) => p.company_id === companyId && p.role === "driver");
        if (filtered.length > 0) return filtered;
      }
      const driversOnly = data.filter((p) => p.role === "driver");
      if (driversOnly.length > 0) return driversOnly;
      return data;
    }
    return [];
  } catch (e) {
    console.error("CheckDrive AI - fetchDrivers error:", e);
    return [];
  }
};

const getProfileObj = (p: any) => {
  if (!p) return null;
  return Array.isArray(p) ? p[0] : p;
};

// Plate Extractor Regex (e.g. ABC1234, ABC-1234, ABC1D23)
const extractPlate = (text: string): string | null => {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = clean.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/) || clean.match(/[A-Z]{3}[0-9]{4}/);
  return match ? match[0] : null;
};

/* ====================================================================
   DOMAIN HANDLERS
   ==================================================================== */

// 1. Manutenção Atrasada / Pendente
const handleLateMaintenance = async (companyId: string): Promise<string> => {
  const { data: issues, error: issuesErr } = await supabase
    .from("checklist_issues")
    .select("*, vehicles(plate, model)")
    .eq("company_id", companyId)
    .in("status", ["pending", "open", "in_progress"])
    .order("created_at", { ascending: false });

  let alerts = null;
  let alertsErr = null;
  const { data: rawAlerts, error: joinErr } = await supabase
    .from("auto_alerts")
    .select("*, vehicles(plate, model)")
    .eq("company_id", companyId)
    .neq("status", "done")
    .order("created_at", { ascending: false });

  if (joinErr) {
    const { data: plainAlerts, error: plainErr } = await supabase
      .from("auto_alerts")
      .select("*")
      .eq("company_id", companyId)
      .neq("status", "done")
      .order("created_at", { ascending: false });

    alerts = plainAlerts;
    alertsErr = plainErr;
  } else {
    alerts = rawAlerts;
  }

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
    pendingIssues.slice(0, 6).forEach((issue: any, index: number) => {
      const v = getVehicleObj(issue.vehicles);
      const plate = v?.plate || "Sem Placa";
      const model = v?.model ? ` (${v.model})` : "";
      const title = issue.item_title || issue.description || "Ocorrência sem título";
      const priority = issue.priority ? `[Prioridade: ${issue.priority.toUpperCase()}]` : "";
      const date = formatDate(issue.created_at);
      response += `${index + 1}. **Veículo ${plate}**${model} - *${title}* ${priority} - Registrado em ${date}\n`;
    });
    if (pendingIssues.length > 6) {
      response += `   *...e mais ${pendingIssues.length - 6} ocorrências registradas na aba Manutenção.*\n`;
    }
    response += "\n";
  }

  if (pendingAlerts.length > 0) {
    response += `⏰ **Alertas Preventivos Vencidos/Atrasados (${pendingAlerts.length}):**\n`;
    pendingAlerts.slice(0, 6).forEach((alert: any, index: number) => {
      const v = getVehicleObj(alert.vehicles);
      const plate = v?.plate || "Sem Placa";
      const title = alert.title || alert.description || "Alerta de Manutenção";
      const dueDate = formatDate(alert.due_date);
      response += `${index + 1}. **Veículo ${plate}** - *${title}* (Vencimento: ${dueDate})\n`;
    });
    if (pendingAlerts.length > 6) {
      response += `   *...e mais ${pendingAlerts.length - 6} alertas na aba Alertas.*\n`;
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

  const { data: checklists } = await supabase
    .from("checklist_submissions")
    .select("id, status, type, vehicles(plate)")
    .eq("company_id", companyId)
    .gte("created_at", startOfDay.toISOString());

  const { data: issues } = await supabase
    .from("checklist_issues")
    .select("id")
    .eq("company_id", companyId)
    .gte("created_at", startOfDay.toISOString());

  const { data: fuelSubmissions } = await supabase
    .from("checklist_submissions")
    .select("id, details, odometer")
    .eq("company_id", companyId)
    .in("type", ["fuel", "Abastecimento"])
    .gte("created_at", startOfDay.toISOString());

  const { data: activeSchedules } = await supabase
    .from("schedules")
    .select("id")
    .eq("company_id", companyId)
    .lte("start_at", new Date().toISOString())
    .gte("end_at", new Date().toISOString());

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
  const activeTrips = activeSchedules?.length || 0;

  let totalLitersToday = 0;
  fuelSubmissions?.forEach((f: any) => {
    if (f.details?.manual_liters) {
      totalLitersToday += Number(f.details.manual_liters) || 0;
    }
  });

  const todayDate = new Date().toLocaleDateString("pt-BR");

  return (
    `📊 **Resumo Geral da Operação (${todayDate})**\n\n` +
    `🚚 **Status da Frota & Logística:**\n` +
    `- **Frota Cadastrada:** ${totalVehicles} veículos (${activeVehicles} ativos)\n` +
    `- **Escalas/Viagens em Andamento:** ${activeTrips} veículos em rota no momento\n\n` +
    `📋 **Checklists & Vistorias:**\n` +
    `- **Realizados Hoje:** ${totalChecklists} checklists executados\n` +
    `- **Com Avarias Registradas:** ${defectsCount} vistorias apontaram falhas\n\n` +
    `🛠️ **Manutenção & Ocorrências:**\n` +
    `- **Novas Ocorrências Abertas Hoje:** ${newIssuesCount} apontamentos\n\n` +
    `⛽ **Abastecimentos:**\n` +
    `- **Registros Hoje:** ${fuelCount} lançamentos (${totalLitersToday.toLocaleString("pt-BR")} Litros)\n\n` +
    `💡 *Resumo Gerencial:* Certifique-se de validar o encerramento das vistorias dos veículos em viagem para assegurar o ciclo operacional.`
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

  fuelSubmissions.forEach((sub: any) => {
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

  const topVehicles = Object.entries(vehicleVolumeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  let response =
    `⛽ **Análise de Custos e Consumo de Combustível (${monthName})**\n\n` +
    `- **Total de Lançamentos:** ${fuelSubmissions.length} abastecimentos\n` +
    `- **Volume Total Abastecido:** ${totalLiters.toLocaleString("pt-BR")} Litros\n`;

  if (totalCostEstimate > 0) {
    response += `- **Investimento Total em Combustível:** ${formatCurrency(totalCostEstimate)}\n`;
  }

  response += "\n🏆 **Veículos com Maior Volume de Abastecimento no Mês:**\n";
  topVehicles.forEach(([plate, liters], idx) => {
    response += `${idx + 1}. **Veículo ${plate}** - ${liters.toLocaleString("pt-BR")} Litros\n`;
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
    .gt("average", 0)
    .order("average", { ascending: true })
    .limit(10);

  if (!averages || averages.length === 0) {
    return (
      "📉 **Análise de Média de Consumo de Combustível**\n\n" +
      "Ainda não existem médias de consumo calculadas na tabela de Médias.\n\n" +
      "💡 *Dica:* Utilize a aba **Médias** para registrar e sincronizar o histórico de km/L."
    );
  }

  let response = "📉 **Ranking de Condutores e Veículos com Pior Média de Consumo (km/L)**\n\n";

  averages.forEach((avg: any, idx: number) => {
    const prof = getProfileObj(avg.profiles);
    const v = getVehicleObj(avg.vehicles);

    const driver = prof?.full_name || "Motorista não identificado";
    const plate = v?.plate || "N/I";
    const kml = Number(avg.average).toFixed(2);
    const distance = avg.distance ? `${avg.distance} km` : "";
    const liters = avg.liters ? `${avg.liters} L` : "";

    response += `${idx + 1}. **${driver}** | Veículo **${plate}**\n`;
    response += `   👉 Média: **${kml} km/L** ${distance ? `(${distance} rodados` : ""}${liters ? `, ${liters} abastecidos)` : ""}\n`;
  });

  response += "\n💡 **Orientação:** Realize reciclagem de condução econômica para os motoristas no topo do ranking.";

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
      "Nenhuma ocorrência ou avaria registrada no sistema até o momento. Excelente conservação da frota!"
    );
  }

  const occurrencesMap: Record<string, { plate: string; model: string; count: number; openCount: number }> = {};

  issues.forEach((issue: any) => {
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

  sortedVehicles.slice(0, 6).forEach((item, idx) => {
    const modelStr = item.model ? ` (${item.model})` : "";
    response += `${idx + 1}. **Veículo ${item.plate}**${modelStr}\n`;
    response += `   👉 Total de Avarias: **${item.count}** (${item.openCount} ainda em aberto/oficina)\n`;
  });

  return response;
};

// 6. Veículos Parados / Inativos
const handleStoppedVehicles = async (companyId: string): Promise<string> => {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, model, active, manual_location, manual_status")
    .eq("company_id", companyId);

  const { data: openIssues } = await supabase
    .from("checklist_issues")
    .select("vehicle_id, item_title, status")
    .eq("company_id", companyId)
    .in("status", ["pending", "open", "in_progress"]);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo encontrado no cadastro da empresa.";
  }

  const issuesVehicleSet = new Set((openIssues || []).map((i) => i.vehicle_id));
  const inactiveVehicles = vehicles.filter((v) => v.active === false);
  const maintenanceVehicles = vehicles.filter((v) => v.active !== false && (issuesVehicleSet.has(v.id) || v.manual_status === "Oficina" || v.manual_status === "Manutenção"));
  const yardVehicles = vehicles.filter((v) => v.active !== false && !issuesVehicleSet.has(v.id) && (v.manual_status === "Pátio" || v.manual_status === "Disponível"));

  let response = `🚚 **Relatório de Veículos Parados, Inativos ou no Pátio**\n\n`;

  response += `🔴 **Desativados no Cadastro (${inactiveVehicles.length}):**\n`;
  if (inactiveVehicles.length > 0) {
    inactiveVehicles.forEach((v) => {
      response += `- **${v.plate}** ${v.model ? `(${v.model})` : ""} - Inativo\n`;
    });
  } else {
    response += `- Nenhum veículo desativado.\n`;
  }

  response += `\n🟡 **Em Oficina / Manutenção (${maintenanceVehicles.length}):**\n`;
  if (maintenanceVehicles.length > 0) {
    maintenanceVehicles.forEach((v) => {
      response += `- **${v.plate}** ${v.model ? `(${v.model})` : ""} ${v.manual_location ? `[Loc: ${v.manual_location}]` : ""}\n`;
    });
  } else {
    response += `- Nenhum veículo em manutenção no momento.\n`;
  }

  response += `\n🟢 **No Pátio / Disponíveis (${yardVehicles.length}):**\n`;
  if (yardVehicles.length > 0) {
    yardVehicles.slice(0, 5).forEach((v) => {
      response += `- **${v.plate}** ${v.model ? `(${v.model})` : ""}\n`;
    });
    if (yardVehicles.length > 5) {
      response += `  *...e mais ${yardVehicles.length - 5} veículos no pátio.*\n`;
    }
  } else {
    response += `- Nenhum veículo livre no pátio.\n`;
  }

  return response;
};

// 7. Ranking de Motoristas e Checklists
const handleDriverRanking = async (companyId: string): Promise<string> => {
  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("company_id", companyId)
    .eq("role", "driver");

  const { data: performance } = await supabase
    .from("driver_performance")
    .select("driver_id, score, total_checklists")
    .eq("company_id", companyId);

  if (!drivers || drivers.length === 0) {
    return "👨‍✈️ Nenhum motorista cadastrado na empresa.";
  }

  const perfMap: Record<string, { score: number; total: number }> = {};
  (performance || []).forEach((p) => {
    perfMap[p.driver_id] = { score: p.score ?? 1000, total: p.total_checklists ?? 0 };
  });

  const rankedDrivers = drivers.map((d) => ({
    name: d.full_name || "Sem Nome",
    score: perfMap[d.id]?.score ?? 1000,
    checklistsCount: perfMap[d.id]?.total ?? 0,
  })).sort((a, b) => b.score - a.score || b.checklistsCount - a.checklistsCount);

  let response = `🏆 **Ranking Geral de Desempenho e Score dos Motoristas**\n\n`;

  rankedDrivers.slice(0, 6).forEach((d, idx) => {
    response += `${idx + 1}. **${d.name}** | Score: **${d.score} pts** (${d.checklistsCount} checklists)\n`;
  });

  response += `\n💡 **Dica:** Acesse a aba **Ranking** para fechar ciclos e gerar premiações ou bonificações.`;

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
  limitDate.setDate(limitDate.getDate() + 30);

  const expiredOrSoon: string[] = [];

  (vehicles || []).forEach((v: any) => {
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

  (drivers || []).forEach((d: any) => {
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
      "Todos os documentos de veículos (CRLV, ANTT, Seguro) e CNHs dos motoristas estão regulares e com prazo confortável (> 30 dias)!"
    );
  }

  let response = `📄 **Alerta de Documentos Vencidos ou a Vencer nos Próximos 30 Dias (${expiredOrSoon.length}):**\n\n`;
  expiredOrSoon.slice(0, 8).forEach((item) => {
    response += `- ${item}\n`;
  });

  if (expiredOrSoon.length > 8) {
    response += `\n*...e mais ${expiredOrSoon.length - 8} documentos pendentes de renovação.*\n`;
  }

  response += "\n⚠️ **Ação recomendada:** Providencie a renovação dos documentos marcados como VENCIDOS para evitar infrações e apreensão de veículos.";

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
      "Nenhuma infração ou multa registrada no sistema até o momento. Parabéns à equipe pelo trânsito seguro!"
    );
  }

  let totalValue = 0;
  let totalPoints = 0;

  infractions.forEach((inf: any) => {
    totalValue += Number(inf.fine_amount) || 0;
    totalPoints += Number(inf.points) || 0;
  });

  let response =
    `🚨 **Resumo de Infrações e Multas de Trânsito**\n\n` +
    `- **Total de Infrações Registradas:** ${infractions.length}\n` +
    `- **Valor Acumulado em Multas:** ${formatCurrency(totalValue)}\n` +
    `- **Pontuação Total:** ${totalPoints} pontos acumulados na CNH da empresa/condutores\n\n` +
    `📌 **Últimas Infrações Registradas:**\n`;

  infractions.slice(0, 5).forEach((inf: any, idx: number) => {
    const v = getVehicleObj(inf.vehicles);
    const prof = getProfileObj(inf.profiles);

    const plate = v?.plate || "N/I";
    const driver = prof?.full_name || "Não indicado";
    const date = formatDate(inf.infraction_date);
    const amount = inf.fine_amount ? formatCurrency(inf.fine_amount) : "";

    response += `${idx + 1}. **Veículo ${plate}** | Motorista: **${driver}** - Data: ${date} ${amount ? `(${amount})` : ""}\n`;
  });

  response += "\n💡 **Dica:** Acesse a aba **Infrações** para efetuar a indicação do condutor e emissão de formulários.";

  return response;
};

// 10. Estoque & Almoxarifado
const handleInventoryQuery = async (companyId: string): Promise<string> => {
  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  const { data: suppliers } = await supabase
    .from("inventory_suppliers")
    .select("*")
    .eq("company_id", companyId);

  const { data: transactions } = await supabase
    .from("inventory_transactions")
    .select("*, inventory_items(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!items || items.length === 0) {
    return (
      "📦 **Estoque e Almoxarifado**\n\n" +
      "Nenhum item de peça ou insumo cadastrado no estoque da empresa.\n\n" +
      "💡 *Dica:* Cadastre itens, categorias e fornecedores na aba **Estoque**."
    );
  }

  const criticalItems = items.filter((item: any) => Number(item.current_quantity) <= Number(item.min_quantity));
  let totalStockValue = 0;
  items.forEach((item: any) => {
    totalStockValue += (Number(item.current_quantity) || 0) * (Number(item.average_cost) || 0);
  });

  let response =
    `📦 **Relatório do Estoque e Almoxarifado**\n\n` +
    `- **Total de Peças/Itens Cadastrados:** ${items.length} itens\n` +
    `- **Valor Total do Estoque Estimado:** ${formatCurrency(totalStockValue)}\n` +
    `- **Fornecedores Cadastrados:** ${suppliers?.length || 0}\n\n`;

  if (criticalItems.length > 0) {
    response += `⚠️ **Itens em Nível Crítico / Reposição Necessária (${criticalItems.length}):**\n`;
    criticalItems.slice(0, 5).forEach((item: any) => {
      response += `- **${item.name}** (SKU: ${item.sku || "N/A"}) - Atual: **${item.current_quantity}** | Mínimo: **${item.min_quantity}**\n`;
    });
    if (criticalItems.length > 5) {
      response += `  *...e mais ${criticalItems.length - 5} itens abaixo do limite mínimo.*\n`;
    }
    response += "\n";
  } else {
    response += `✅ **Nenhum item abaixo do estoque mínimo!**\n\n`;
  }

  if (transactions && transactions.length > 0) {
    response += `🔄 **Últimas Movimentações Registradas:**\n`;
    transactions.forEach((tx: any) => {
      const typeStr = tx.type === "in" ? "📥 Entrada" : "📤 Saída";
      const itemName = tx.inventory_items?.name || "Item";
      response += `- ${typeStr}: **${tx.quantity}x ${itemName}** (${formatDate(tx.created_at)})\n`;
    });
  }

  return response;
};

// 11. Escalas e Logística
const handleSchedulesQuery = async (companyId: string): Promise<string> => {
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*, vehicles(plate, model), profiles(full_name), routes(origin, destination)")
    .eq("company_id", companyId)
    .order("start_at", { ascending: false })
    .limit(10);

  if (!schedules || schedules.length === 0) {
    return (
      "📅 **Escalas de Trabalho e Logística**\n\n" +
      "Nenhuma escala ou rota cadastrada no momento."
    );
  }

  const now = new Date();
  const inProgress = schedules.filter((s: any) => new Date(s.start_at) <= now && new Date(s.end_at) >= now);

  let response = `📅 **Escalas e Viagens Programadas (${schedules.length} recentes)**\n\n`;

  response += `🚚 **Em Viagem / Ativas Agora (${inProgress.length}):**\n`;
  if (inProgress.length > 0) {
    inProgress.forEach((s: any) => {
      const driver = s.profiles?.full_name || "Motorista N/I";
      const plate = s.vehicles?.plate || "S/ Placa";
      const routeStr = s.routes ? `${s.routes.origin} ➔ ${s.routes.destination}` : "Sem rota cadastrada";
      response += `- **${driver}** com Veículo **${plate}** [${routeStr}]\n`;
    });
  } else {
    response += `- Nenhum motorista em viagem ativa no momento exato.\n`;
  }

  response += `\n📌 **Próximas Escalas Agendadas:**\n`;
  schedules.slice(0, 5).forEach((s: any) => {
    const driver = s.profiles?.full_name || "Motorista N/I";
    const plate = s.vehicles?.plate || "S/ Placa";
    const startDate = formatDateTime(s.start_at);
    response += `- **${driver}** | Veículo **${plate}** - Início: ${startDate}\n`;
  });

  return response;
};

// 12. Seguradoras & Apólices
const handleInsurancesQuery = async (companyId: string): Promise<string> => {
  const { data: insurances } = await supabase
    .from("insurances")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (!insurances || insurances.length === 0) {
    return (
      "🛡️ **Seguradoras & Assistência 24h**\n\n" +
      "Nenhuma seguradora cadastrada na empresa.\n\n" +
      "💡 *Dica:* Cadastre seguradoras na aba **Seguradoras** para ter os números de guincho e sinistro sempre acessíveis."
    );
  }

  let response = `🛡️ **Seguradoras Cadastradas e Contatos de Emergência (${insurances.length}):**\n\n`;

  insurances.forEach((ins: any, idx: number) => {
    response += `${idx + 1}. **${ins.name}** ${ins.cnpj ? `(CNPJ: ${ins.cnpj})` : ""}\n`;
    if (ins.claims_phone) response += `   📞 **Sinistro/Emergência:** ${ins.claims_phone}\n`;
    if (ins.support_phone) response += `   🚨 **Guincho/Assistência 24h:** ${ins.support_phone}\n`;
    if (ins.broker_phone) response += `   👔 **Corretor:** ${ins.broker_phone}\n`;
    response += "\n";
  });

  return response;
};

// 13. Auditoria & Extrato de Pontuação
const handleAuditAndScoreQuery = async (companyId: string): Promise<string> => {
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: appSettings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  let response = `📜 **Auditoria e Regras de Pontuação da Frota**\n\n`;

  if (appSettings) {
    response += `⚙️ **Configurações Atuais de Score:**\n`;
    response += `- **Pontuação Inicial do Ciclo:** ${appSettings.initial_value || 1000} pontos\n`;
    response += `- **Multa por Falta de Checklist:** ${appSettings.penalty_value || 50} pts\n`;
    response += `- **Regra de Fechamento:** ${appSettings.closing_rule === "manual" ? "Manual" : "Automática"}\n\n`;
  }

  if (logs && logs.length > 0) {
    response += `📌 **Últimos Lançamentos de Auditoria/Penalidades:**\n`;
    logs.slice(0, 6).forEach((log: any) => {
      const driverName = log.profiles?.full_name || "Motorista";
      const amountStr = log.amount < 0 ? `-${Math.abs(log.amount)} pts` : `+${log.amount} pts`;
      response += `- **${driverName}**: ${amountStr} por *"${log.reason || log.type}"* em ${formatDate(log.created_at)}\n`;
    });
  } else {
    response += `Nenhuma penalidade ou ajuste manual recente no histórico de auditoria.`;
  }

  return response;
};

// 14. Plano SaaS da Empresa
const handleCompanyPlanQuery = async (companyId: string): Promise<string> => {
  const { data: company } = await supabase
    .from("companies")
    .select("*, saas_plans(name, max_users, max_vehicles)")
    .eq("id", companyId)
    .maybeSingle();

  const { data: vehiclesCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact" })
    .eq("company_id", companyId);

  const { data: usersCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact" })
    .eq("company_id", companyId);

  const totalV = vehiclesCount?.length || 0;
  const totalU = usersCount?.length || 0;

  const planName = company?.plan_name || company?.saas_plans?.name || "Básico";
  const maxV = company?.max_vehicles || company?.saas_plans?.max_vehicles || 10;
  const maxU = company?.max_users || company?.saas_plans?.max_users || 10;

  return (
    `🏢 **Informações da Empresa e Plano SaaS**\n\n` +
    `- **Empresa:** ${company?.name || "Empresa Cadastrada"}\n` +
    `- **CNPJ/Documento:** ${company?.document || "N/A"}\n` +
    `- **Plano Contratado:** **${planName}**\n` +
    `- **Status da Assinatura:** ${company?.subscription_status === "active" ? "🟢 Ativa" : "🟡 Período de Testes / Regular"}\n\n` +
    `📊 **Utilização de Licenças:**\n` +
    `- **Veículos:** ${totalV} de ${maxV} contratados\n` +
    `- **Usuários/Motoristas:** ${totalU} de ${maxU} contratados\n`
  );
};

// 15. Consulta Específica de Veículo por Placa
const handleSpecificVehicleQuery = async (companyId: string, query: string): Promise<string> => {
  const plate = extractPlate(query);
  
  // Try finding vehicle by extracted plate or text match
  let vehicleData: any = null;
  if (plate) {
    const { data } = await supabase
      .from("vehicles")
      .select("*, vehicle_modalities(name)")
      .eq("company_id", companyId)
      .ilike("plate", `%${plate}%`)
      .maybeSingle();
    vehicleData = data;
  }

  if (!vehicleData) {
    // Search general vehicle list
    const { data: allV } = await supabase
      .from("vehicles")
      .select("*, vehicle_modalities(name)")
      .eq("company_id", companyId);
    
    const matched = allV?.find((v) => query.toUpperCase().includes(v.plate.toUpperCase().replace("-", "")));
    vehicleData = matched || null;
  }

  if (!vehicleData) {
    return "🔍 Não encontrei nenhum veículo cadastrado com a placa especificada no sistema.";
  }

  const vId = vehicleData.id;

  // Search issues
  const { data: issues } = await supabase
    .from("checklist_issues")
    .select("item_title, status, created_at")
    .eq("company_id", companyId)
    .eq("vehicle_id", vId)
    .order("created_at", { ascending: false })
    .limit(3);

  // Search recent checklists
  const { data: submissions } = await supabase
    .from("checklist_submissions")
    .select("created_at, type, odometer, profiles(full_name)")
    .eq("company_id", companyId)
    .eq("vehicle_id", vId)
    .order("created_at", { ascending: false })
    .limit(3);

  // Search averages
  const { data: avg } = await supabase
    .from("vehicle_averages")
    .select("average, distance, liters")
    .eq("company_id", companyId)
    .eq("vehicle_id", vId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Search infractions
  const { data: infractions } = await supabase
    .from("traffic_infractions")
    .select("fine_amount, infraction_date")
    .eq("company_id", companyId)
    .eq("vehicle_id", vId);

  let response =
    `🚚 **Dossiê Completo do Veículo - ${vehicleData.plate}**\n\n` +
    `- **Modelo:** ${vehicleData.model} (${vehicleData.type || "Caminhão"})\n` +
    `- **Modalidade:** ${vehicleData.vehicle_modalities?.name || "Geral"}\n` +
    `- **Status Atual:** ${vehicleData.active !== false ? "🟢 Ativo em Operação" : "🔴 Inativo"}\n` +
    `- **Localização/Status Pátio:** ${vehicleData.manual_status || "N/I"} ${vehicleData.manual_location ? `(${vehicleData.manual_location})` : ""}\n\n`;

  if (avg) {
    response += `⛽ **Rendimento e Consumo:** Média recente de **${Number(avg.average).toFixed(2)} km/L**\n\n`;
  }

  if (submissions && submissions.length > 0) {
    const lastSub = submissions[0];
    const driver = getProfileObj(lastSub.profiles)?.full_name || "Motorista";
    response += `📋 **Último Checklist:** ${lastSub.type} em ${formatDateTime(lastSub.created_at)} por **${driver}** (Odômetro: ${lastSub.odometer || "N/I"} km)\n\n`;
  }

  if (issues && issues.length > 0) {
    response += `🛠️ **Ocorrências de Manutenção (${issues.length}):**\n`;
    issues.forEach((i: any) => {
      response += `- ${i.item_title} [Status: ${i.status}]\n`;
    });
    response += "\n";
  }

  if (infractions && infractions.length > 0) {
    response += `🚨 **Infrações Registradas:** ${infractions.length} multas associadas a esta placa.\n`;
  }

  return response;
};

// 16. Consulta Específica de Motorista por Nome
const handleSpecificDriverQuery = async (companyId: string, query: string): Promise<string> => {
  const { data: drivers } = await supabase
    .from("profiles")
    .select("*, score_profiles(name)")
    .eq("company_id", companyId)
    .eq("role", "driver");

  if (!drivers || drivers.length === 0) {
    return "👨‍✈️ Nenhum motorista encontrado no sistema.";
  }

  const normQuery = normalizeText(query);
  const matchedDriver = drivers.find((d) => {
    const normName = normalizeText(d.full_name || "");
    const parts = normName.split(" ");
    return parts.some((part) => part.length > 2 && normQuery.includes(part));
  });

  if (!matchedDriver) {
    return "🔍 Não foi possível identificar o nome do motorista na pergunta. Por favor, forneça o nome completo ou primeiro nome.";
  }

  const dId = matchedDriver.id;

  const { data: perf } = await supabase
    .from("driver_performance")
    .select("score, total_checklists")
    .eq("company_id", companyId)
    .eq("driver_id", dId)
    .maybeSingle();

  const { data: infractions } = await supabase
    .from("traffic_infractions")
    .select("code, fine_amount, points")
    .eq("company_id", companyId)
    .eq("driver_id", dId);

  const { data: recentChecklists } = await supabase
    .from("checklist_submissions")
    .select("type, created_at, vehicles(plate)")
    .eq("company_id", companyId)
    .eq("driver_id", dId)
    .order("created_at", { ascending: false })
    .limit(3);

  let response =
    `👨‍✈️ **Ficha e Histórico do Motorista - ${matchedDriver.full_name}**\n\n` +
    `- **Status:** ${matchedDriver.active !== false ? "🟢 Ativo" : "🔴 Inativo"}\n` +
    `- **Score Atual:** **${perf?.score ?? 1000} pontos**\n` +
    `- **Total de Checklists Executados:** ${perf?.total_checklists ?? 0}\n` +
    `- **Validade da CNH:** ${formatDate(matchedDriver.cnh_expiration) || "Não cadastrado"}\n\n`;

  if (recentChecklists && recentChecklists.length > 0) {
    response += `📋 **Atividades Recentes:**\n`;
    recentChecklists.forEach((c: any) => {
      const v = getVehicleObj(c.vehicles);
      response += `- ${c.type} no Veículo **${v?.plate || "N/I"}** em ${formatDateTime(c.created_at)}\n`;
    });
    response += "\n";
  }

  if (infractions && infractions.length > 0) {
    response += `🚨 **Multas Atribuídas:** ${infractions.length} infrações associadas.\n`;
  }

  return response;
};

// 18. Idade e Ano dos Veículos da Frota
const handleVehicleAgeQuery = async (companyId: string): Promise<string> => {
  const vehicles = await fetchVehicles(companyId);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo encontrado na frota da empresa.";
  }

  const currentYear = new Date().getFullYear();

  const getYear = (v: any) => {
    const m = Number(v.manufacture_year) || Number(v.model_year);
    if (m && !isNaN(m) && m > 1900 && m < 2100) return m;
    const my = Number(v.model_year);
    if (my && !isNaN(my) && my > 1900 && my < 2100) return my;
    if (v.created_at) {
      const yr = new Date(v.created_at).getFullYear();
      if (!isNaN(yr)) return yr;
    }
    return null;
  };

  const vehiclesWithYear = vehicles.map((v) => ({
    ...v,
    year: getYear(v),
  })).sort((a, b) => {
    if (a.year === null && b.year === null) return 0;
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    return a.year - b.year;
  });

  const oldest = vehiclesWithYear.filter((v) => v.year !== null).slice(0, 5);
  const newest = [...vehiclesWithYear].filter((v) => v.year !== null).reverse().slice(0, 5);

  let response = `🚚 **Análise de Idade e Anos da Frota (${vehicles.length} Veículos Total)**\n\n`;

  if (oldest.length > 0) {
    response += `👴 **Veículo(s) Mais Antigo(s) / Velho(s) da Frota:**\n`;
    oldest.forEach((v, idx) => {
      const ageStr = v.year ? `(${currentYear - v.year} anos de uso)` : "";
      const fabMod = v.manufacture_year && v.model_year ? `${v.manufacture_year}/${v.model_year}` : (v.year || "Ano N/I");
      const statusStr = v.active !== false ? "🟢 Ativo" : "🔴 Inativo";
      response += `${idx + 1}. **${v.model || "Caminhão"}** (Placa: **${v.plate}**) - Ano: **${fabMod}** ${ageStr} - [${statusStr}]\n`;
    });
    response += "\n";
  }

  if (newest.length > 0) {
    response += `👶 **Veículo(s) Mais Novo(s) da Frota:**\n`;
    newest.forEach((v, idx) => {
      const fabMod = v.manufacture_year && v.model_year ? `${v.manufacture_year}/${v.model_year}` : (v.year || "Ano N/I");
      response += `${idx + 1}. **${v.model || "Caminhão"}** (Placa: **${v.plate}**) - Ano: **${fabMod}**\n`;
    });
    response += "\n";
  }

  const validYears = vehiclesWithYear.map((v) => v.year).filter((y): y is number => y !== null);
  if (validYears.length > 0) {
    const avgYear = Math.round(validYears.reduce((acc, curr) => acc + curr, 0) / validYears.length);
    response += `📊 **Média de Idade da Frota:** Ano médio de fabricação **${avgYear}** (~${currentYear - avgYear} anos de uso).\n`;
  }

  return response;
};

// 19. Quilometragem e Odômetro
const handleOdometerQuery = async (companyId: string): Promise<string> => {
  const vehicles = await fetchVehicles(companyId);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo cadastrado na frota.";
  }

  const getKm = (v: any) => Number(v.odometer) || Number(v.current_km) || 0;

  const sorted = [...vehicles].sort((a, b) => getKm(b) - getKm(a));
  const mostDriven = sorted.slice(0, 5);
  const leastDriven = [...sorted].reverse().slice(0, 5);

  let response = `📈 **Análise de Quilometragem e Uso da Frota**\n\n`;

  response += `📈 **Veículos Mais Rodados (Maior Quilometragem):**\n`;
  mostDriven.forEach((v, idx) => {
    response += `${idx + 1}. **${v.model || "Veículo"}** (${v.plate}) - **${getKm(v).toLocaleString("pt-BR")} km**\n`;
  });

  response += `\n📉 **Veículos Menos Rodados (Menor Quilometragem):**\n`;
  leastDriven.forEach((v, idx) => {
    response += `${idx + 1}. **${v.model || "Veículo"}** (${v.plate}) - **${getKm(v).toLocaleString("pt-BR")} km**\n`;
  });

  return response;
};

// 20. Composição e Modelos da Frota
const handleFleetCompositionQuery = async (companyId: string): Promise<string> => {
  const vehicles = await fetchVehicles(companyId);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo cadastrado na frota da empresa.";
  }

  const total = vehicles.length;
  const active = vehicles.filter((v) => v.active !== false).length;
  const inactive = total - active;

  // Group by model
  const modelsMap: Record<string, number> = {};
  vehicles.forEach((v) => {
    const m = v.model || "Modelo Não Especificado";
    modelsMap[m] = (modelsMap[m] || 0) + 1;
  });

  const sortedModels = Object.entries(modelsMap).sort((a, b) => b[1] - a[1]);

  let response =
    `🚚 **Visão Geral e Composição da Frota**\n\n` +
    `- **Total de Veículos:** ${total} unidades (${active} ativos | ${inactive} inativos)\n\n` +
    `📊 **Modelos Mais Presentes na Frota:**\n`;

  sortedModels.forEach(([model, count]) => {
    const pct = Math.round((count / total) * 100);
    response += `- **${model}**: ${count} unidade(s) (${pct}% da frota)\n`;
  });

  return response;
};

// 21. Listar Todas as Placas da Frota
const handleListAllPlates = async (companyId: string): Promise<string> => {
  const vehicles = await fetchVehicles(companyId);

  if (!vehicles || vehicles.length === 0) {
    return "🚚 Nenhum veículo/placa encontrado no banco de dados da empresa.";
  }

  let response = `📋 **Lista Completa de Placas da Frota (${vehicles.length} Veículos Cadastrados)**\n\n`;

  vehicles.forEach((v, idx) => {
    const status = v.active !== false ? "🟢 Ativo" : "🔴 Inativo";
    const typeStr = v.type ? ` (${v.type})` : "";
    const modelStr = v.model || "Caminhão/Veículo";
    const fabMod = v.manufacture_year || v.model_year ? ` - Ano: ${v.manufacture_year || v.model_year}` : "";
    const km = Number(v.odometer) || Number(v.current_km);
    const kmStr = km ? ` - ${km.toLocaleString("pt-BR")} km` : "";

    response += `${idx + 1}. Placa: **${v.plate}** | **${modelStr}**${typeStr}${fabMod}${kmStr} [${status}]\n`;
  });

  return response;
};

// 22. Listar Todos os Motoristas
const handleListAllDrivers = async (companyId: string): Promise<string> => {
  const drivers = await fetchDrivers(companyId);

  if (!drivers || drivers.length === 0) {
    return "👨‍✈️ Nenhum motorista encontrado no cadastro da empresa.";
  }

  let response = `👨‍✈️ **Lista Completa de Motoristas da Empresa (${drivers.length} Cadastrados)**\n\n`;

  drivers.forEach((d, idx) => {
    const status = d.active !== false ? "🟢 Ativo" : "🔴 Inativo";
    const cnh = d.cnh_expiration ? ` - CNH Vencimento: ${formatDate(d.cnh_expiration)}` : "";
    response += `${idx + 1}. **${d.full_name || "Motorista"}** ${cnh} [${status}]\n`;
  });

  return response;
};

// 23. Relatório Geral e Completo da Operação
const handleGeneralReportQuery = async (companyId: string): Promise<string> => {
  const [vehicles, drivers, issuesRes, fuelRes, infractionsRes] = await Promise.all([
    fetchVehicles(companyId),
    fetchDrivers(companyId),
    supabase.from("checklist_issues").select("id, status").in("status", ["pending", "open", "in_progress"]),
    supabase.from("vehicle_averages").select("distance, liters"),
    supabase.from("traffic_infractions").select("fine_amount"),
  ]);

  const totalV = vehicles?.length || 0;
  const activeV = vehicles?.filter((v) => v.active !== false).length || 0;
  const totalD = drivers?.length || 0;
  const activeD = drivers?.filter((d) => d.active !== false).length || 0;
  const pendingIssues = issuesRes.data?.length || 0;

  const totalFuelLiters = (fuelRes.data || []).reduce((acc: number, f: any) => acc + (Number(f.liters) || 0), 0);
  const totalFineAmount = (infractionsRes.data || []).reduce((acc: number, i: any) => acc + (Number(i.fine_amount) || 0), 0);

  let response = `📊 **Relatório Executivo Geral e Balanço da Operação**\n\n`;

  response += `🚚 **Frota de Veículos (${totalV} Unidades):**\n`;
  response += `- **Status:** ${activeV} ativos e ${totalV - activeV} inativos.\n`;
  if (vehicles && vehicles.length > 0) {
    response += `- **Placas Registradas:** ${vehicles.map((v) => `**${v.plate}**`).join(", ")}\n`;
  }

  response += `\n👨‍✈️ **Equipe de Motoristas (${totalD} Condutores):**\n`;
  response += `- **Status:** ${activeD} motoristas ativos na operação.\n`;

  response += `\n🔧 **Ocorrências e Manutenção:**\n`;
  response += `- **Ocorrências / Defeitos Abertos:** ${pendingIssues} pendência(s) de manutenção.\n`;

  if (totalFuelLiters > 0) {
    response += `\n⛽ **Consumo de Combustível:**\n`;
    response += `- **Volume Total Registrado:** ${totalFuelLiters.toLocaleString("pt-BR")} Litros.\n`;
  }

  if (totalFineAmount > 0) {
    response += `\n🚨 **Multas de Trânsito:**\n`;
    response += `- **Valor Total de Infrações:** R$ ${totalFineAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
  }

  return response;
};

// 24. Gemini AI Intelligent Context Engine
const getGeminiApiKey = (): string | undefined => {
  try {
    if (typeof process !== "undefined" && process?.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // ignore
  }
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
      return (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

export function isGeminiConnected(): boolean {
  const apiKey = getGeminiApiKey();
  return Boolean(apiKey && apiKey.trim().length > 0);
}

async function queryGeminiAi(companyId: string, rawQuery: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const safeFetch = async (fn: () => any) => {
      try {
        const res = await Promise.resolve(fn());
        return res?.data || [];
      } catch (e) {
        return [];
      }
    };

    const [
      vehicles,
      drivers,
      issues,
      submissions,
      fuel,
      schedules,
      infractions,
      inventory,
      insurances,
      companyData,
      routes,
      suppliers,
    ] = await Promise.all([
      fetchVehicles(companyId),
      fetchDrivers(companyId),
      safeFetch(() =>
        supabase
          .from("checklist_issues")
          .select("item_title, priority, status, created_at, vehicle_id")
          .in("status", ["pending", "open", "in_progress"])
          .limit(30)
      ),
      safeFetch(() =>
        supabase
          .from("checklist_submissions")
          .select("type, created_at, odometer, driver_id, vehicle_id")
          .order("created_at", { ascending: false })
          .limit(30)
      ),
      safeFetch(() =>
        supabase.from("vehicle_averages").select("average, distance, liters, vehicle_id").limit(30)
      ),
      safeFetch(() =>
        supabase.from("schedules").select("start_at, end_at, vehicle_id, driver_id").limit(30)
      ),
      safeFetch(() =>
        supabase.from("traffic_infractions").select("fine_amount, points, infraction_date, vehicle_id, driver_id").limit(30)
      ),
      safeFetch(() =>
        supabase.from("inventory_items").select("name, sku, current_quantity, min_quantity").limit(30)
      ),
      safeFetch(() =>
        supabase.from("insurances").select("name, claims_phone, support_phone").limit(15)
      ),
      safeFetch(async () => {
        const res = await supabase.from("companies").select("name, plan_name, max_vehicles, max_users").limit(1);
        return { data: res.data?.[0] || null };
      }),
      safeFetch(() => supabase.from("routes").select("name, origin, destination, distance_km").limit(20)),
      safeFetch(() => supabase.from("inventory_suppliers").select("name, phone, contact_name").limit(20)),
    ]);

    const contextData = {
      empresa: companyData?.name || "Empresa",
      plano: companyData?.plan_name || "Básico",
      veiculos: vehicles,
      motoristas: drivers,
      ocorrencias_manutencao_pendentes: issues,
      ultimos_checklists: submissions,
      medias_combustivel: fuel,
      escalas_viagens: schedules,
      multas_transito: infractions,
      estoque_pecas: inventory,
      seguradoras: insurances,
      rotas: routes,
      fornecedores: suppliers,
    };

    const prompt = `Você é o CheckDrive AI, um assistente virtual de inteligência artificial de elite especialista em gestão de frotas e logística.
Abaixo estão os DADOS REAIS ATUALIZADOS extraídos diretamente do banco de dados da empresa em tempo real:

=== BANCO DE DADOS DA EMPRESA EM TEMPO REAL ===
${JSON.stringify(contextData, null, 2)}
================================================

Pergunta do Gestor/Usuário: "${rawQuery}"

Instruções Cruciais para a Resposta:
1. Responda a QUALQUER pergunta do usuário com máxima precisão, clareza, objetividade e riqueza de detalhes.
2. Se a pergunta solicitar uma LISTA (ex: "liste todas as placas", "quais os motoristas", "quais os itens de estoque"), responda com a lista completa e organizada em Markdown (use numeração ou tópicos), incluindo placas, modelos, status e detalhes de cada item.
3. Se a pergunta for um pedido de RELATÓRIO ou BALANÇO (ex: "gere um relatório completo", "resumo da frota"), estruture um relatório executivo bem formatado com seções separadas para veículos, motoristas, manutenção, custos e multas.
4. Se a pergunta for comparativa ou específica (ex: "qual o veículo mais velho", "qual o mais novo", "maior quilometragem"), verifique os campos dos objetos do JSON (como manufacture_year, model_year, odometer, current_km), faça os cálculos/comparações necessários e indique a placa, modelo, ano/valor exatos.
5. Se o banco de dados estiver com a frota vazia ou sem registros para a solicitação, informe educadamente o status e oriente o usuário sobre como cadastrar os dados na plataforma.
6. Sempre responda em Português do Brasil com excelente formatação em Markdown (negritos, tabelas ou listas, e emojis profissionais).
7. Mantenha 100% de fidelidade aos dados do JSON. Não invente veículos ou informações falsas.`;

    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelCandidate of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents: prompt,
          config: {
            systemInstruction:
              "Você é o assistente inteligente oficial da plataforma CheckDrive. Forneça respostas impecáveis, estruturadas, precisas e baseadas estritamente nos dados reais da frota.",
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (mErr) {
        console.warn(`CheckDrive AI - Modelo ${modelCandidate} falhou, tentando próximo:`, mErr);
      }
    }
  } catch (err) {
    console.warn("CheckDrive AI - Gemini API fallback trigger:", err);
  }

  return null;
}

// 17. Universal Full Database Search Engine Fallback
const handleUniversalSearch = async (companyId: string, rawQuery: string): Promise<string> => {
  const normalized = normalizeText(rawQuery);
  const keywords = normalized.split(" ").filter((w) => w.length > 3);

  const [allVehicles, allDrivers, itemsRes, suppliersRes, insurancesRes] = await Promise.all([
    fetchVehicles(companyId),
    fetchDrivers(companyId),
    supabase.from("inventory_items").select("name, sku, current_quantity"),
    supabase.from("inventory_suppliers").select("name, phone, contact_name"),
    supabase.from("insurances").select("name, claims_phone, support_phone"),
  ]);

  const matchingVehicles = (allVehicles || []).filter((v: any) =>
    keywords.some((k) => normalizeText(v.plate || "").includes(k) || normalizeText(v.model || "").includes(k))
  );

  const matchingDrivers = (allDrivers || []).filter((d: any) =>
    keywords.some((k) => normalizeText(d.full_name || "").includes(k))
  );

  const matchingItems = (itemsRes.data || []).filter((i) =>
    keywords.some((k) => normalizeText(i.name || "").includes(k) || normalizeText(i.sku || "").includes(k))
  );

  const matchingSuppliers = (suppliersRes.data || []).filter((s) =>
    keywords.some((k) => normalizeText(s.name || "").includes(k))
  );

  const matchingInsurances = (insurancesRes.data || []).filter((ins) =>
    keywords.some((k) => normalizeText(ins.name || "").includes(k))
  );

  const hasAnyMatch =
    matchingVehicles.length > 0 ||
    matchingDrivers.length > 0 ||
    matchingItems.length > 0 ||
    matchingSuppliers.length > 0 ||
    matchingInsurances.length > 0;

  if (!hasAnyMatch) {
    if (normalized.includes("placa") || normalized.includes("placas") || normalized.includes("lista") || normalized.includes("listar") || normalized.includes("liste")) {
      return await handleListAllPlates(companyId);
    }
    if (normalized.includes("motorista") || normalized.includes("motoristas") || normalized.includes("condutor")) {
      return await handleListAllDrivers(companyId);
    }
    if (normalized.includes("relatorio") || normalized.includes("balanco") || normalized.includes("resumo") || normalized.includes("extrato")) {
      return await handleGeneralReportQuery(companyId);
    }
    if (normalized.includes("velho") || normalized.includes("antigo") || normalized.includes("novo") || normalized.includes("idade") || normalized.includes("ano")) {
      return await handleVehicleAgeQuery(companyId);
    }
    if (normalized.includes("km") || normalized.includes("quilometragem") || normalized.includes("rodado") || normalized.includes("odometro")) {
      return await handleOdometerQuery(companyId);
    }
    if (normalized.includes("manutencao") || normalized.includes("oficina") || normalized.includes("defeito") || normalized.includes("quebra") || normalized.includes("atrasad")) {
      return await handleLateMaintenance(companyId);
    }
    if (normalized.includes("combustivel") || normalized.includes("diesel") || normalized.includes("gasolina") || normalized.includes("abastecimento") || normalized.includes("gastei")) {
      return await handleFuelCost(companyId);
    }
    if (normalized.includes("multa") || normalized.includes("multas") || normalized.includes("infracao") || normalized.includes("infracoes")) {
      return await handleTrafficInfractions(companyId);
    }
    if (normalized.includes("estoque") || normalized.includes("peca") || normalized.includes("pecas") || normalized.includes("almoxarifado")) {
      return await handleInventoryQuery(companyId);
    }
    if (normalized.includes("veiculo") || normalized.includes("veiculos") || normalized.includes("caminhao") || normalized.includes("caminhoes") || normalized.includes("frota")) {
      return await handleFleetCompositionQuery(companyId);
    }

    if (allVehicles && allVehicles.length > 0) {
      return await handleListAllPlates(companyId);
    }

    return (
      "🤖 **CheckDrive AI - Consulta Inteligente**\n\n" +
      `Não encontrei registros diretos no banco de dados para o termo *"${rawQuery}"*.\n\n` +
      "💡 **Tente perguntar por:**\n" +
      "• Placa específica: *'Qual o histórico da placa ABC1234?'*\n" +
      "• Liste todas as placas: *'Liste todas as placas'* ou *'Lista de veículos'*\n" +
      "• Relatórios: *'Gere um relatório completo da frota'*\n" +
      "• Idade da frota: *'Qual a placa do veículo mais velho?'*\n" +
      "• Nome de motorista: *'Como está o score de João Silva?'*\n" +
      "• Manutenções & Defeitos: *'Quais veículos estão com manutenção atrasada?'*\n" +
      "• Custos: *'Quanto gastei com combustível este mês?'*"
    );
  }

  let response = `🔎 **Resultados Encontrados na Base de Dados do CheckDrive:**\n\n`;

  if (matchingVehicles.length > 0) {
    response += `🚚 **Veículos Encontrados:**\n`;
    matchingVehicles.forEach((v) => {
      response += `- Placa **${v.plate}** (${v.model || "Caminhão"}) - Status: ${v.manual_status || "Ativo"}\n`;
    });
    response += "\n";
  }

  if (matchingDrivers.length > 0) {
    response += `👨‍✈️ **Motoristas Encontrados:**\n`;
    matchingDrivers.forEach((d) => {
      response += `- **${d.full_name}** (${d.role})\n`;
    });
    response += "\n";
  }

  if (matchingItems.length > 0) {
    response += `📦 **Itens de Estoque:**\n`;
    matchingItems.forEach((i) => {
      response += `- **${i.name}** (SKU: ${i.sku || "N/A"}) - Qtd em estoque: **${i.current_quantity}**\n`;
    });
    response += "\n";
  }

  if (matchingSuppliers.length > 0) {
    response += `🏢 **Fornecedores:**\n`;
    matchingSuppliers.forEach((s) => {
      response += `- **${s.name}** ${s.phone ? `(Tel: ${s.phone})` : ""}\n`;
    });
    response += "\n";
  }

  if (matchingInsurances.length > 0) {
    response += `🛡️ **Seguradoras:**\n`;
    matchingInsurances.forEach((ins) => {
      response += `- **${ins.name}** ${ins.claims_phone ? `(Sinistro: ${ins.claims_phone})` : ""}\n`;
    });
    response += "\n";
  }

  return response;
};

/* ====================================================================
   INTENT REGISTRY (ALL SYSTEM DOMAINS)
   ==================================================================== */

export const INTENT_REGISTRY: IntentDefinition[] = [
  {
    id: "list_plates",
    name: "Lista Completa de Placas da Frota",
    description: "Lista todas as placas e veículos cadastrados na frota.",
    category: "VEÍCULOS",
    keywords: ["placa", "placas", "todas as placas", "lista de placas", "listar placas", "liste as placas", "liste todas as placas", "quais sao as placas", "todas placas", "mostrar placas", "lista das placas"],
    phrases: [
      "liste todas as placas",
      "lista de placas",
      "quais sao todas as placas",
      "mostrar todas as placas",
      "quais as placas da frota",
      "lista das placas",
      "listar todas as placas",
      "liste as placas",
      "quais as placas"
    ],
    handler: handleListAllPlates,
  },
  {
    id: "list_drivers",
    name: "Lista Completa de Motoristas",
    description: "Lista todos os motoristas cadastrados na empresa.",
    category: "MOTORISTAS",
    keywords: ["motoristas", "condutores", "lista de motoristas", "listar motoristas", "todos os motoristas", "relatorio de motoristas", "mostrar motoristas", "liste motoristas", "liste os motoristas"],
    phrases: [
      "liste todos os motoristas",
      "lista de motoristas",
      "quais sao os motoristas",
      "relatorio de motoristas",
      "listar motoristas",
      "liste os motoristas"
    ],
    handler: handleListAllDrivers,
  },
  {
    id: "general_report",
    name: "Relatório Geral e Balanço Operacional",
    description: "Gera um relatório executivo consolidado com estatísticas de toda a frota.",
    category: "RELATÓRIOS",
    keywords: ["relatorio", "relatorios", "relatorio geral", "gerar relatorio", "relatorio completo", "balanco geral", "relatorio operacional", "relatorio de frota", "gerar relatorio de frota"],
    phrases: [
      "gerar relatorio completo",
      "relatorio geral da frota",
      "gerar relatorio",
      "relatorio da empresa",
      "gerar relatorio de frota",
      "relatorio de frota"
    ],
    handler: handleGeneralReportQuery,
  },
  {
    id: "today_summary",
    name: "Resumo da Operação de Hoje",
    description: "Gera um balanço diário da frota, checklists, ocorrências e abastecimentos.",
    category: "GERAL",
    keywords: ["resumo", "operacao", "hoje", "balanco", "status do dia", "dia de hoje", "geral", "visão geral"],
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
    keywords: ["manutencao", "atrasada", "oficina", "revisao", "pendencia", "ordem de servico", "os", "pendente", "troca", "defeito", "quebra"],
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
    keywords: ["combustivel", "diesel", "gasolina", "gasto", "gastos", "custo", "abastecimento", "posto", "valor", "reais", "litros"],
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
    keywords: ["parado", "parados", "inativo", "inativos", "parada", "desativado", "desativados", "frota parada", "patio"],
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
    keywords: ["multa", "multas", "infracao", "infracoes", "pontos", "gravidade", "transito", "detran"],
    phrases: [
      "quais multas foram registradas",
      "infracoes do mes",
      "motorista com mais multas",
      "gastos com multas"
    ],
    handler: handleTrafficInfractions,
  },
  {
    id: "inventory_query",
    name: "Estoque, Almoxarifado e Peças",
    description: "Consulta itens em estoque, faltas de peças e fornecedores.",
    category: "ESTOQUE",
    keywords: ["estoque", "peca", "pecas", "almoxarifado", "sku", "fornecedor", "fornecedores", "nota fiscal", "nf", "item"],
    phrases: [
      "quais pecas estao em estoque",
      "itens com estoque baixo",
      "relatorio de estoque",
      "fornecedores de pecas"
    ],
    handler: handleInventoryQuery,
  },
  {
    id: "schedules_query",
    name: "Escalas de Trabalho e Logística",
    description: "Verifica veículos em viagem e viagens programadas.",
    category: "ESCALAS",
    keywords: ["escala", "escalas", "viagem", "viagens", "rota", "rotas", "agendamento", "origem", "destino"],
    phrases: [
      "quais motoristas estao em viagem",
      "escalas do dia",
      "quais veiculos estao em rota",
      "escalas programadas"
    ],
    handler: handleSchedulesQuery,
  },
  {
    id: "insurances_query",
    name: "Seguradoras & Assistência 24h",
    description: "Contatos de seguradoras, guinchos e apólices ativas.",
    category: "SEGURADORAS",
    keywords: ["seguradora", "seguradoras", "apolice", "apolices", "corretor", "sinistro", "guincho", "assistencia"],
    phrases: [
      "quais seguradoras temos cadastradas",
      "telefone da seguradora",
      "guincho de emergencia",
      "contato de sinistro"
    ],
    handler: handleInsurancesQuery,
  },
  {
    id: "audit_score_query",
    name: "Auditoria, Regras & Perda de Pontos",
    description: "Consulta lançamentos de auditoria e configurações de penalidades.",
    category: "AUDITORIA",
    keywords: ["auditoria", "extrato", "historico de pontos", "penalidade", "desconto", "regras de score"],
    phrases: [
      "extrato de auditoria",
      "penalidades aplicadas",
      "regras de pontuacao"
    ],
    handler: handleAuditAndScoreQuery,
  },
  {
    id: "company_plan_query",
    name: "Plano SaaS & Limites da Empresa",
    description: "Verifica o plano contratado e a utilização de licenças de frota/usuários.",
    category: "GERAL",
    keywords: ["plano", "planos", "saas", "licencas", "limite de veiculos", "limite de usuarios", "assinatura"],
    phrases: [
      "qual e o nosso plano",
      "limites da empresa",
      "quantos veiculos posso cadastrar"
    ],
    handler: handleCompanyPlanQuery,
  },
  {
    id: "vehicle_age",
    name: "Idade e Anos dos Veículos da Frota",
    description: "Identifica veículos mais velhos, mais novos e a idade média da frota.",
    category: "VEÍCULOS",
    keywords: ["velho", "antigo", "novo", "idade", "ano", "fabricacao", "modelo ano", "mais velho", "mais antigo", "mais novo"],
    phrases: [
      "qual modelo de veiculo e mais velho da frota",
      "qual o veiculo mais velho da frota",
      "qual o veiculo mais antigo",
      "qual o veiculo mais novo",
      "qual e a idade da frota",
      "quais os anos dos veiculos"
    ],
    handler: handleVehicleAgeQuery,
  },
  {
    id: "vehicle_odometer",
    name: "Quilometragem e Odômetro da Frota",
    description: "Identifica os veículos mais rodados e menos rodados da frota.",
    category: "VEÍCULOS",
    keywords: ["quilometragem", "odometro", "rodado", "mais rodado", "menos rodado", "maior km", "menor km"],
    phrases: [
      "qual veiculo e mais rodado",
      "qual veiculo tem maior quilometragem",
      "qual veiculo tem menor quilometragem",
      "quais veiculos sao mais rodados"
    ],
    handler: handleOdometerQuery,
  },
  {
    id: "fleet_composition",
    name: "Composição e Modelos da Frota",
    description: "Apresenta os modelos de veículos existentes e distribuição da frota.",
    category: "VEÍCULOS",
    keywords: ["composicao", "modelos", "modelos da frota", "quantos veiculos", "tipos de veiculos"],
    phrases: [
      "quais sao os modelos da frota",
      "quantos veiculos temos",
      "composicao da frota",
      "quais os tipos de veiculos"
    ],
    handler: handleFleetCompositionQuery,
  }
];

/* ====================================================================
   INTENT MATCHER & QUERY PROCESSOR ENGINE
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
        "👋 **Olá! Sou o CheckDrive AI.**\n\nPor favor, faça uma pergunta em linguagem natural sobre a sua frota, como por exemplo:\n\n" +
        "• *Qual modelo de veículo é o mais velho da frota?*\n" +
        "• *Quais veículos estão com manutenção atrasada?*\n" +
        "• *Gere um resumo da operação de hoje.*\n" +
        "• *Quanto gastei com combustível este mês?*\n" +
        "• *Quais peças estão com estoque baixo?*\n" +
        "• *Quais motoristas estão em viagem?*\n" +
        "• *Qual o histórico do veículo ABC1234?*",
    };
  }

  // 1. First Layer: Try Gemini AI Engine with full live database context
  const geminiResult = await queryGeminiAi(companyId, rawQuery);
  if (geminiResult) {
    return {
      intentId: "gemini_ai",
      intentName: "Análise Inteligente CheckDrive AI",
      confidence: 0.98,
      responseText: geminiResult,
    };
  }

  // 2. Second Layer: Check if user is searching for a specific vehicle plate
  const extractedPlate = extractPlate(rawQuery);
  if (extractedPlate) {
    const specificResp = await handleSpecificVehicleQuery(companyId, rawQuery);
    if (!specificResp.startsWith("🔍")) {
      return {
        intentId: "specific_vehicle",
        intentName: "Dossiê Específico de Veículo",
        confidence: 0.95,
        responseText: specificResp,
      };
    }
  }

  // 3. Third Layer: Check if user is searching for a specific driver by name
  if (normalized.includes("score do") || normalized.includes("ficha do") || normalized.includes("historico do motorista")) {
    const driverResp = await handleSpecificDriverQuery(companyId, rawQuery);
    if (!driverResp.startsWith("🔍") && !driverResp.startsWith("👨‍✈️ Nenhum motorista")) {
      return {
        intentId: "specific_driver",
        intentName: "Ficha Específica de Motorista",
        confidence: 0.9,
        responseText: driverResp,
      };
    }
  }

  // 4. Fourth Layer: Match against Registered Intents using strict word boundaries
  let bestIntent: IntentDefinition | null = null;
  let highestScore = 0;

  for (const intent of INTENT_REGISTRY) {
    let score = 0;

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

    for (const kw of intent.keywords) {
      if (matchesWord(normalized, kw)) {
        score += 20;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

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

  // 5. Universal Fallback Search across ALL database tables
  const universalSearchResp = await handleUniversalSearch(companyId, rawQuery);
  return {
    intentId: "universal_search",
    intentName: "Pesquisa Universal no Banco de Dados",
    confidence: 0.7,
    responseText: universalSearchResp,
  };
}
