import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Connect to Supabase using system environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials environment variables are not set on the server.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing daily alerts check...`);

    // 1. Fetch active date-based auto alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from("auto_alerts")
      .select("*, vehicles(plate)")
      .eq("active", true)
      .eq("generate_issue", true)
      .eq("trigger_type", "date");

    if (alertsError) {
      throw new Error(`Failed to load auto alerts: ${alertsError.message}`);
    }

    if (!alertsData || alertsData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active date auto alerts found." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${alertsData.length} active date alerts configured`);

    const triggeredAlerts = alertsData.filter((alert) => {
      if (alert.trigger_date) {
        const warningDays = alert.warning_days ? Number(alert.warning_days) : 0;
        const targetDate = new Date(alert.trigger_date + "T00:00:00");
        targetDate.setDate(targetDate.getDate() - warningDays);
        return new Date() >= targetDate;
      }
      return false;
    });

    if (triggeredAlerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No alerts triggered based on date thresholds." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${triggeredAlerts.length} date alerts were triggered:`, triggeredAlerts.map(a => a.title));

    // 2. Filter out alerts that already have a pending check_list issue
    const alertIds = triggeredAlerts.map((a) => a.id);
    const { data: existingIssues } = await supabase
      .from("checklist_issues")
      .select("auto_alert_id")
      .in("auto_alert_id", alertIds)
      .eq("status", "pending");

    const alreadyGeneratedSet = new Set((existingIssues || []).map((ei) => ei.auto_alert_id));
    const alertsToInsert = triggeredAlerts.filter((alert) => !alreadyGeneratedSet.has(alert.id));

    if (alertsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Triggered date alerts already have active pending issues. Skipping." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inserting ${alertsToInsert.length} new checklist issue entries...`);

    // 3. Insert issues for active alerts
    const issuesData = alertsToInsert.map((alert) => ({
      submission_id: null,
      vehicle_id: alert.target_vehicle_id,
      driver_id: null,
      company_id: alert.company_id,
      item_title: `🚨 Alerta de Manutenção (Data): ${alert.title}`,
      description: `Gerado automaticamente pelo check diário. Data Alvo atingida (${alert.trigger_date.split("-").reverse().join("/")}).`,
      status: "pending",
      auto_alert_id: alert.id,
    }));

    const { error: insertError } = await supabase.from("checklist_issues").insert(issuesData);
    if (insertError) {
      throw new Error(`Failed to insert issues entries: ${insertError.message}`);
    }

    // 4. Trigger WhatsApp alerts
    const companyIds = [...new Set(alertsToInsert.map(a => a.company_id))];
    const { data: configRows } = await supabase
      .from("integration_evolution_api")
      .select("*")
      .in("company_id", companyIds);

    const configsByCompany = (configRows || []).reduce((acc: any, curr: any) => {
      acc[curr.company_id] = curr;
      return acc;
    }, {});

    const { data: rules } = await supabase
      .from("integration_whatsapp_rules")
      .select("*")
      .in("auto_alert_id", alertsToInsert.map((a) => a.id));

    let sentMessageCount = 0;
    const deduplicatedSendsSet = new Set<string>();

    for (const alert of alertsToInsert) {
      const config = configsByCompany[alert.company_id];
      if (!config || !config.url || !config.api_key || !config.instance_name) {
        console.log(`Skipping WhatsApp for alert ${alert.id} - missing company integration config.`);
        continue;
      }

      const alertRules = (rules || []).filter((r) => r.auto_alert_id === alert.id);
      const vehiclePlate = alert.vehicles?.plate || "N/D";

      for (const rule of alertRules) {
        let message = rule.message || "";
        // Replace placeholders
        message = message.replace(/\{\{veiculo\}\}/g, vehiclePlate);
        message = message.replace(/\{\{veiculo_placa\}\}/g, vehiclePlate);
        message = message.replace(/\{\{km\}\}/g, "N/A (Alerta por Data)");
        message = message.replace(/\{\{alerta\}\}/g, alert.title);
        message = message.replace(/\{\{km_atual\}\}/g, "N/A");
        message = message.replace(/\{\{km_manutencao\}\}/g, "N/A");
        message = message.replace(/\{\{km_aviso\}\}/g, "N/A");

        const phoneNumbers = (rule.phone_numbers || "")
          .split(",")
          .map((n: string) => {
            let cleaned = n.trim().replace(/\D/g, "");
            if (cleaned.length === 10 || cleaned.length === 11) {
              cleaned = "55" + cleaned;
            }
            return cleaned;
          })
          .filter((n: string) => !!n);

        for (const phone of phoneNumbers) {
          const dedupKey = `${phone}:::${message}`;
          if (deduplicatedSendsSet.has(dedupKey)) {
            continue;
          }
          deduplicatedSendsSet.add(dedupKey);

          const endpoint = `${config.url.replace(/\/$/, "")}/message/sendText/${config.instance_name}`;
          const textPayload = {
            number: phone,
            textMessage: { text: message },
            text: message,
            options: { delay: 1200 },
          };

          try {
            const apiResponse = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": config.api_key,
                "Authorization": `Bearer ${config.api_key}`,
              },
              body: JSON.stringify(textPayload),
            });

            if (apiResponse.ok) {
              sentMessageCount++;
            } else {
              console.error(`Failed to send message to ${phone}. Status: ${apiResponse.status}`);
            }
          } catch (fetchErr: any) {
            console.error(`Network error sending message to ${phone}:`, fetchErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily alert process completed. Created issues and dispatched ${sentMessageCount} notification messages via WhatsApp.`,
        triggeredAlerts: alertsToInsert.map((a) => a.id),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Critical edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, message: `Intern Server Error: ${err.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
