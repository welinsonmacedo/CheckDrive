-- SQL Setup: Cron job for Daily Alerts
-- Run this in your Supabase SQL Editor

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the job to run every day at 08:00 AM (server time/UTC)
-- Note: Replace 'YOUR_PROJECT_REF' and 'YOUR_ANON_KEY' with your actual Supabase URL and Anon Key.
SELECT cron.schedule(
    'daily-date-alerts',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://' || current_setting('request.headers', true)::json->>'host' || '/functions/v1/check-daily-alerts',
        headers := json_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim.role', true)
        )::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- NOTE: If the current_setting variables fail in pg_cron (since it runs in the background), 
-- you will need to replace them with your hardcoded URL and Service Role Key:
-- 
-- SELECT cron.schedule(
--    'daily-date-alerts',
--    '0 8 * * *',
--    $$
--    SELECT net.http_post(
--        url := 'https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/check-daily-alerts',
--        headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb,
--        body := '{}'::jsonb
--    );
--    $$
-- );
