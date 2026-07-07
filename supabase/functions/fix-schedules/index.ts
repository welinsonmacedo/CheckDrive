import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Set penalty_applied = true for all schedules older than 1 hour
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from("schedules")
      .update({ penalty_applied: true })
      .lt("end_at", oneHourAgo)
      .eq("penalty_applied", false)
      .select("id");
      
    if (error) {
      return new Response(JSON.stringify({ success: false, error }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ success: true, updated: data?.length }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
});
