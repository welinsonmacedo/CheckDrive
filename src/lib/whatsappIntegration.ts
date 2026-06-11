import { supabase } from "./supabase";

export async function triggerWhatsAppDispatches(generatedAlerts: any[], currentKm: number, vehiclePlate?: string) {
  if (!generatedAlerts || generatedAlerts.length === 0) return;

  try {
    // Determine the company ID from the first alert
    const companyId = generatedAlerts[0].company_id;
    if (!companyId) return;

    // Fetch Evolution API Settings
    const { data: config } = await supabase
      .from("integration_evolution_api")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (!config || !config.url || !config.api_key || !config.instance_name) {
       console.log("No WhatsApp integration configured.");
       return;
    }

    // Connect to rules
    const alertIds = generatedAlerts.map(a => a.id);
    const { data: rules } = await supabase
      .from("integration_whatsapp_rules")
      .select("*")
      .in("auto_alert_id", alertIds);

    if (!rules || rules.length === 0) return;

    // For each triggered alert, find its rules and send messages
    for (const alert of generatedAlerts) {
      const alertRules = rules.filter(r => r.auto_alert_id === alert.id);
      
      for (const rule of alertRules) {
         let message = rule.message || "";
         const vPlate = vehiclePlate || "N/D";
         message = message.replace(/\{\{veiculo\}\}/g, vPlate);
         message = message.replace(/\{\{veiculo_placa\}\}/g, vPlate);
         message = message.replace(/\{\{km\}\}/g, currentKm.toString());
         message = message.replace(/\{\{alerta\}\}/g, alert.title);
         
         const numbersStr = rule.phone_numbers || "";
         const numbers = numbersStr.split(",").map((n: string) => n.trim()).filter((n: string) => !!n);

         for (const phone of numbers) {
             const payload = {
                 number: phone,
                 options: {
                   delay: 1200,
                 },
                 textMessage: {
                   text: message
                 }
             };

             const endpoint = `${config.url.replace(/\/$/, '')}/message/sendText/${config.instance_name}`;

             fetch(endpoint, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'apikey': config.api_key
                 },
                 body: JSON.stringify(payload)
             }).catch(err => {
                 console.error("WhatsApp Integration fail for", phone, err);
             });
         }
      }
    }
  } catch (error) {
    console.error("Trigger WhatsApp Dispatches Error:", error);
  }
}
