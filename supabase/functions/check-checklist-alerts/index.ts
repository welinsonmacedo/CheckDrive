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
    const rawBody = await req.json();
    console.log("Received payload:", JSON.stringify(rawBody));

    // Handle webhook payload format from Supabase (which wraps the row in 'record')
    const submission = rawBody.record ? rawBody.record : rawBody;

    if (!submission || !submission.id || !submission.vehicle_id) {
      return new Response(
        JSON.stringify({ success: false, message: "No valid checklist submission found in the body." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const submissionId = submission.id;
    const vehicleId = submission.vehicle_id;
    const currentKm = Number(submission.odometer) || 0;
    const companyId = submission.company_id;
    const driverId = submission.driver_id;

    // Connect to Supabase using system environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials environment variables are not set on the server.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing checklist sub #${submissionId} for vehicle #${vehicleId} to verify alert targets at ${currentKm} KM...`);

    // 1. Fetch vehicle's active auto alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from("auto_alerts")
      .select("*")
      .eq("target_vehicle_id", vehicleId)
      .eq("active", true)
      .eq("generate_issue", true);

    if (alertsError) {
      throw new Error(`Failed to load auto alerts: ${alertsError.message}`);
    }

    if (!alertsData || alertsData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active auto alerts found for this vehicle." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${alertsData.length} active alerts configured for vehicle ${vehicleId}`);

    const triggeredAlerts = alertsData.filter((alert) => {
      if (alert.trigger_type === "date" && alert.trigger_date) {
        const warningDays = alert.warning_days ? Number(alert.warning_days) : 0;
        const targetDate = new Date(alert.trigger_date + "T00:00:00");
        targetDate.setDate(targetDate.getDate() - warningDays);
        return new Date() >= targetDate;
      } else if (
        alert.trigger_type === "km" &&
        alert.last_km != null &&
        alert.interval_km != null
      ) {
        const warningKm = alert.warning_km ? Number(alert.warning_km) : 0;
        const targetKm = Number(alert.last_km) + Number(alert.interval_km) - warningKm;
        return currentKm >= targetKm;
      }
      return false;
    });

    if (triggeredAlerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No alerts triggered based on KM or date thresholds." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${triggeredAlerts.length} alerts were triggered:`, triggeredAlerts.map(a => a.title));

    // 2. Fetch vehicle details to get license plate
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("plate")
      .eq("id", vehicleId)
      .single();

    const vehiclePlate = vehicleData?.plate || "N/D";

    // 3. Filter out alerts that already have a pending check_list issue (avoid duplicates)
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
        JSON.stringify({ success: true, message: "Triggered alerts already have active pending issues. Skipping insertion." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inserting ${alertsToInsert.length} new checklist issue entries...`);

    // 4. Insert issues for active alerts
    const issuesData = alertsToInsert.map((alert) => ({
      submission_id: submissionId,
      vehicle_id: vehicleId,
      driver_id: driverId || null,
      company_id: companyId,
      item_title: `🚨 Alerta de Manutenção: ${alert.title}`,
      description: `Gerado automaticamente via Edge Function. ${
        alert.trigger_type === "km"
          ? `KM Alvo atingido na vistoria (${currentKm} km).`
          : `Data Alvo atingida (${alert.trigger_date.split("-").reverse().join("/")}).`
      }`,
      status: "pending",
      auto_alert_id: alert.id,
    }));

    const { error: insertError } = await supabase.from("checklist_issues").insert(issuesData);
    if (insertError) {
      throw new Error(`Failed to insert issues entries: ${insertError.message}`);
    }

    // 5. Trigger WhatsApp alerts dispatching using Evolutionary API details
    // We search for configuration in integration_evolution_api
    const { data: configRows } = await supabase
      .from("integration_evolution_api")
      .select("*")
      .eq("company_id", companyId)
      .limit(1);

    const config = configRows?.[0];

    if (!config || !config.url || !config.api_key || !config.instance_name) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Issues registered successfully but WhatsApp is not configured or incompleted for company " + companyId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load WhatsApp messages rules for the triggered alerts
    const { data: rules } = await supabase
      .from("integration_whatsapp_rules")
      .select("*")
      .in("auto_alert_id", alertsToInsert.map((a) => a.id));

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Issues registered. No WhatsApp notification rules configured for these alerts."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending WhatsApp messages via API using instances ${config.instance_name}...`);

    let sentMessageCount = 0;
    const deduplicatedSendsSet = new Set<string>();

    for (const alert of alertsToInsert) {
      const alertRules = rules.filter((r) => r.auto_alert_id === alert.id);

      for (const rule of alertRules) {
        let message = rule.message || "";
        // Fit placeholders
        message = message.replace(/\{\{veiculo\}\}/g, vehiclePlate);
        message = message.replace(/\{\{veiculo_placa\}\}/g, vehiclePlate);
        message = message.replace(/\{\{km\}\}/g, currentKm.toString());
        message = message.replace(/\{\{alerta\}\}/g, alert.title);
        message = message.replace(/\{\{km_atual\}\}/g, currentKm.toString());

        let kmManutencaoStr = "N/D";
        let kmAvisoStr = "N/D";
        if (alert.trigger_type === "km" && alert.last_km != null && alert.interval_km != null) {
          const mnt = Number(alert.last_km) + Number(alert.interval_km);
          kmManutencaoStr = mnt.toString();
          if (alert.warning_km != null) {
            kmAvisoStr = (mnt - Number(alert.warning_km)).toString();
          }
        }
        
        message = message.replace(/\{\{km_manutencao\}\}/g, kmManutencaoStr);
        message = message.replace(/\{\{km_aviso\}\}/g, kmAvisoStr);

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
          // Safety unique key
          const dedupKey = `${phone}:::${message}`;
          if (deduplicatedSendsSet.has(dedupKey)) {
            console.log(`Skipping duplicate message dispatch to ${phone} for rule: ${rule.id}`);
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
              console.log(`Alert message sent successfully to ${phone}`);
            } else {
              const errorText = await apiResponse.text();
              console.error(`Failed to send message to ${phone}. Status: ${apiResponse.status} - ${errorText}`);
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
        message: `System alert process completed. Created issues and dispatched ${sentMessageCount} notification messages via WhatsApp.`,
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
