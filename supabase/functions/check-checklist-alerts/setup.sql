-- SQL Setup: Link checklist_submissions to the check-checklist-alerts Edge Function
-- Execute this script in your Supabase SQL Editor to set up the Database Webhook.

-- 1. Enable Database Webhooks if not already enabled in your Supabase project:
-- (Supabase might do this automatically when you use the dashboard, but safe to verify)
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- 2. Create the Trigger Function to call the Edge Function webhook
CREATE OR REPLACE FUNCTION public.trg_on_new_checklist_submission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
  v_headers TEXT;
  v_payload TEXT;
  v_response_status INTEGER;
BEGIN
  -- Get your custom edge function variables (supabase_url from dec_config or vaults if stored,
  -- or we can trigger an HTTP request using Supabase's built-in net hook)
  
  -- The simplest and most standard Supabase approach is creating a Database Webhook 
  -- via the Supabase Dashboard UI, which handles security credentials natively:
  -- Dashboard -> Database -> Webhooks -> Create Webhook
  -- - Table: checklist_submissions
  -- - Events: Insert
  -- - Type: HTTP POST (Edge Function)
  -- - Edge Function: check-checklist-alerts
  --
  -- Alternatively, for full SQL automation, you can run the standard pg_net extension HTTP call:
  
  BEGIN
    -- Construct standard webhook payload matching Supabase structure
    v_payload := json_build_object(
      'type', 'INSERT',
      'table', 'checklist_submissions',
      'schema', 'public',
      'record', row_to_json(NEW)
    )::text;

    -- HTTP POST to the check-checklist-alerts Edge Function
    -- Note: Replace with your actual project URL reference 
    -- (e.g. https://phyodfszatjfdfjtzpmm.supabase.co/functions/v1/dynamic-responder)
    -- WARNING: For this SQL script to succeed directly, pg_net extension must be enabled.
    PERFORM net.http_post(
      url := 'https://' || current_setting('request.headers', true)::json->>'host' || '/functions/v1/check-checklist-alerts',
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claim.role', true) -- Or your vault.decrypted_secrets
      )::raw,
      body := v_payload::raw
    );
  EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger failure from blocking client submissions
    RAISE WARNING 'Failed to fire background edge function trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 3. Bind the trigger to checklist_submissions table
-- Wait: Let's remove the trigger first if it exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_checklist_submission_alert ON public.checklist_submissions;

CREATE TRIGGER trg_checklist_submission_alert
AFTER INSERT ON public.checklist_submissions
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_new_checklist_submission();

-- IMPORTANT NOTE FOR DEPLOYMENT:
-- Since Supabase utilizes secure Vault parameters, we advise configuring the Webhook 
-- directly through the Supabase Dashboard UI for maximum security. Below are the steps:
--
-- 1. Run "supabase db push" or deploy your function:
--    supabase functions deploy check-checklist-alerts
--
-- 2. In your Supabase Dashboard UI:
--    - Go to: Database > Webhooks
--    - Click: "Enable Webhooks" (if not active yet)
--    - Click: "Create Webhook"
--    - Name: "trigger_checklist_alerts"
--    - Table: "checklist_submissions"
--    - Events: Check "Insert"
--    - Action: Select "Supabase Edge Function"
--    - Edge Function: "check-checklist-alerts"
--    - Method: "POST"
--    - Timeout: "10000" (10s)
--    - Click "Save"
