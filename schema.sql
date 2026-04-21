-- CheckDrive PWA - Database Schema (PostgreSQL/Supabase)

-- 1. Users table (Profiles linked to Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('driver', 'admin')) DEFAULT 'driver',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    type TEXT, -- 'Truck', 'Van', etc.
    requires_trailer BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.1 Trailers table
CREATE TABLE IF NOT EXISTS trailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    stops JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Checklist Types
CREATE TABLE IF NOT EXISTS checklist_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Checklist Items (Configuration)
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id UUID REFERENCES checklist_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_trailer_item BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Checklist Submissions
CREATE TABLE IF NOT EXISTS checklist_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id),
    vehicle_id UUID REFERENCES vehicles(id),
    trailer_id UUID REFERENCES trailers(id),
    route_id UUID REFERENCES routes(id),
    type TEXT NOT NULL, -- 'Início de Viagem', 'Abastecimento', 'Fim de Viagem'
    odometer INTEGER NOT NULL,
    photos JSONB DEFAULT '{}'::jsonb, -- { front: url, back: url, ... }
    details JSONB DEFAULT '{}'::jsonb, -- { itemValues: { id: status } }
    status TEXT DEFAULT 'pending', -- 'pending', 'concluded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Driver Performance
CREATE TABLE IF NOT EXISTS driver_performance (
    driver_id UUID PRIMARY KEY REFERENCES profiles(id),
    score INTEGER DEFAULT 1000,
    total_checklists INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Checklist Issues (Pendencies)
CREATE TABLE IF NOT EXISTS checklist_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES checklist_submissions(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES profiles(id),
    item_title TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. App Settings (Global config)
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    system_type TEXT NOT NULL DEFAULT 'points', -- 'points' or 'cash'
    initial_value NUMERIC NOT NULL DEFAULT 1000,
    penalty_value NUMERIC NOT NULL DEFAULT 50,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Schedules (Escalas)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    trailer_id UUID REFERENCES trailers(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    start_checklist_id UUID REFERENCES checklist_submissions(id),
    end_checklist_id UUID REFERENCES checklist_submissions(id),
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Audit Logs (Histórico de Pontuação/Saldo)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'penalty', 'reset', 'manual'
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO app_settings (id, system_type, initial_value, penalty_value)
VALUES ('global', 'points', 1000, 50)
ON CONFLICT (id) DO NOTHING;

-- --- RLS (Row Level Security) ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin safely (Security Definer with search_path avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles Policies
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles are manageable by admins" ON public.profiles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Vehicles & Routes & Types (Publicly readable by authenticated, manageable by admins)
CREATE POLICY "Public Read" ON vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON vehicles FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON routes FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON trailers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON trailers FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON checklist_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON checklist_types FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON checklist_items FOR ALL USING (is_admin());

-- Submissions Policies
CREATE POLICY "Drivers can see own submissions" ON checklist_submissions FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can insert own submissions" ON checklist_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins can view/manage all" ON checklist_submissions FOR ALL USING (is_admin());

-- Performance Policies
CREATE POLICY "Public Read" ON driver_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON driver_performance FOR ALL USING (is_admin());

-- Issues Policies
CREATE POLICY "Drivers can see own related issues" ON public.checklist_issues FOR SELECT TO authenticated USING (auth.uid() = driver_id OR is_admin());
CREATE POLICY "Drivers can insert own related issues" ON public.checklist_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Admins can manage all issues" ON public.checklist_issues FOR ALL TO authenticated USING (is_admin());

-- Settings Policies
CREATE POLICY "Anyone authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin());

-- Schedules Policies
CREATE POLICY "Anyone authenticated can read schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL TO authenticated USING (is_admin());

-- Audit Logs Policies
CREATE POLICY "Drivers can see own audits" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = driver_id OR is_admin());
CREATE POLICY "Admins can manage audits" ON public.audit_logs FOR ALL TO authenticated USING (is_admin());

-- --- Post-Setup Helper ---
-- Function to automatically set first user as admin
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'driver' END
  );
  
  -- Create initial performance entry for drivers
  IF (SELECT role FROM public.profiles WHERE id = new.id) = 'driver' THEN
    INSERT INTO public.driver_performance (driver_id, score) VALUES (new.id, 1000);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add slug to checklist_types
ALTER TABLE public.checklist_types ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
UPDATE public.checklist_types SET slug = 'start' WHERE title = 'Início de Viagem';
UPDATE public.checklist_types SET slug = 'fuel' WHERE title = 'Abastecimento';
UPDATE public.checklist_types SET slug = 'end' WHERE title = 'Fim de Viagem';
