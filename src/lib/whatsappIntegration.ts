import { supabase } from "./supabase";

export async function triggerWhatsAppDispatches(
  generatedAlerts: any[],
  currentKm: number,
  vehiclePlate?: string,
): Promise<string[]> {
  const logs: string[] = [];
  if (!generatedAlerts || generatedAlerts.length === 0) {
    logs.push("No generated alerts.");
    return logs;
  }

  try {
    const companyId = generatedAlerts[0].company_id;
    if (!companyId) {
      logs.push("No companyId found on alert.");
      return logs;
    }

    logs.push("companyId: " + companyId);

    const { data: configRows, error: configError } = await supabase
      .from("integration_evolution_api")
      .select("*")
      .eq("company_id", companyId)
      .limit(1);

    const config = configRows?.[0];

    if (configError) logs.push("Config Error: " + configError.message);

    if (!config || !config.url || !config.api_key || !config.instance_name) {
      logs.push("No WhatsApp integration configured or incomplete config.");
      return logs;
    }

    logs.push("Config loaded for instance: " + config.instance_name);

    const alertIds = generatedAlerts.map((a) => a.id);
    const { data: rules, error: rulesError } = await supabase
      .from("integration_whatsapp_rules")
      .select("*")
      .in("auto_alert_id", alertIds);

    if (rulesError) logs.push("Rules error: " + rulesError.message);

    if (!rules || rules.length === 0) {
      logs.push("No rules found for these alertIds.");
      return logs;
    }

    logs.push("Found " + rules.length + " rules.");

    for (const alert of generatedAlerts) {
      const alertRules = rules.filter((r) => r.auto_alert_id === alert.id);
      logs.push("Alert " + alert.id + " has " + alertRules.length + " rules.");

      for (const rule of alertRules) {
        let message = rule.message || "";
        const vPlate = vehiclePlate || "N/D";
        message = message.replace(/\{\{veiculo\}\}/g, vPlate);
        message = message.replace(/\{\{veiculo_placa\}\}/g, vPlate);
        message = message.replace(/\{\{km\}\}/g, currentKm.toString());
        message = message.replace(/\{\{alerta\}\}/g, alert.title);

        let kmManutencaoStr = "N/D";
        let kmAvisoStr = "N/D";
        if (alert.trigger_type === "km" && alert.last_km != null && alert.interval_km != null) {
          const mnt = Number(alert.last_km) + Number(alert.interval_km);
          kmManutencaoStr = mnt.toString();
          if (alert.warning_km != null) {
            kmAvisoStr = (mnt - Number(alert.warning_km)).toString();
          }
        }
        
        message = message.replace(/\{\{km_atual\}\}/g, currentKm.toString());
        message = message.replace(/\{\{km_manutencao\}\}/g, kmManutencaoStr);
        message = message.replace(/\{\{km_aviso\}\}/g, kmAvisoStr);

        const numbersStr = rule.phone_numbers || "";
        const numbers = numbersStr
          .split(",")
          .map((n: string) => {
            let cleaned = n.trim().replace(/\D/g, "");
            if (cleaned.length === 10 || cleaned.length === 11) {
              cleaned = "55" + cleaned;
            }
            return cleaned;
          })
          .filter((n: string) => !!n);
        
        logs.push("Sending to " + numbers.length + " numbers.");

        for (const phone of numbers) {
          const payload = {
            number: phone,
            textMessage: { text: message },
            text: message,
            options: { delay: 1200 },
          };

          const endpoint = `${config.url.replace(/\/$/, "")}/message/sendText/${config.instance_name}`;

          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": config.api_key,
                "Authorization": `Bearer ${config.api_key}`,
              },
              body: JSON.stringify(payload),
            });
            
            if (!res.ok) {
              const errText = await res.text();
              logs.push(`HTTP ${res.status}: ${errText}`);
            } else {
              logs.push(`Success to ${phone}`);
            }
          } catch (err: any) {
            logs.push(`Network error to ${phone}: ${err.message}`);
          }
        }
      }
    }
  } catch (error: any) {
    logs.push("CRITICAL ERROR: " + error.message);
  }
  return logs;
}
