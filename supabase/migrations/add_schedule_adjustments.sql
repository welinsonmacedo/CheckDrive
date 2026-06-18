-- Run this in your Supabase SQL Editor to support editing schedule averages directly on schedules
-- without changing the original driver checklist submissions.

ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_start_odometer INTEGER;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_end_odometer INTEGER;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_liters NUMERIC;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_fuel_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_status TEXT DEFAULT 'pending';
