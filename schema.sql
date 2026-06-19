-- CheckDrive PWA - Database Schema (PostgreSQL/Supabase)

-- 1. Users table (Profiles linked to Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('driver', 'admin', 'standard', 'superadmin')) DEFAULT 'driver',
    driver_type TEXT DEFAULT 'Interno/Pátio',
    participates_in_ranking BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    modality_ids UUID[] DEFAULT '{}',
    visible_tabs TEXT[] DEFAULT NULL,
    score_profile_id UUID REFERENCES score_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vehicles table
CREATE TABLE IF NOT EXISTS vehicle_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    type TEXT, -- 'Truck', 'Van', etc.
    modality_id UUID REFERENCES vehicle_modalities(id),
    requires_trailer BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    visible_tabs TEXT[] DEFAULT NULL,
    manual_location TEXT,
    manual_status TEXT,
    last_status_update TIMESTAMP WITH TIME ZONE,
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
    distance_km NUMERIC,
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
    input_type TEXT DEFAULT 'boolean',
    appears_in_manual BOOLEAN DEFAULT false,
    is_fuel_liters BOOLEAN DEFAULT false,
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
    latitude NUMERIC,
    longitude NUMERIC,
    photos JSONB DEFAULT '{}'::jsonb, -- { front: url, back: url, ... }
    receipt_photo_url TEXT,
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
    trailer_id UUID REFERENCES trailers(id),
    driver_id UUID REFERENCES profiles(id),
    item_title TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- New: Support for multiple photos/descriptions if needed as one record
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    report_count INTEGER DEFAULT 1,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. App Settings (Global config)
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    system_type TEXT NOT NULL DEFAULT 'points', -- 'points' or 'cash'
    initial_value NUMERIC NOT NULL DEFAULT 1000,
    penalty_value NUMERIC NOT NULL DEFAULT 50, -- Legacy/Fallback
    penalty_start NUMERIC NOT NULL DEFAULT 50,
    penalty_end NUMERIC NOT NULL DEFAULT 50,
    penalty_fuel NUMERIC NOT NULL DEFAULT 50,
    penalty_yard NUMERIC NOT NULL DEFAULT 50,
    require_external_photos BOOLEAN NOT NULL DEFAULT true,
    require_fuel_receipt_photo BOOLEAN NOT NULL DEFAULT true,
    require_location BOOLEAN NOT NULL DEFAULT false,
    closing_rule TEXT DEFAULT 'manual', -- 'manual', 'fixed_day', 'last_sunday'
    closing_day INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    max_speed NUMERIC,
    ideal_consumption NUMERIC,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
    fuel_checklist_id UUID REFERENCES checklist_submissions(id),
    requires_fueling BOOLEAN DEFAULT true,
    bait1_id UUID REFERENCES baits(id),
    bait2_id UUID REFERENCES baits(id),
    bait3_id UUID REFERENCES baits(id),
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Baits (Iscas)
CREATE TABLE IF NOT EXISTS baits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Audit Logs (Histórico de Pontuação/Saldo)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'penalty', 'reset', 'manual'
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO app_settings (id, system_type, initial_value, penalty_value, penalty_start, penalty_end, penalty_fuel, penalty_yard)
VALUES ('global', 'points', 1000, 50, 50, 50, 50, 50)
ON CONFLICT (id) DO NOTHING;

-- 14. Score Profiles
CREATE TABLE IF NOT EXISTS score_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    calculation_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'per_workday', 'per_schedule'
    base_value NUMERIC NOT NULL DEFAULT 1000,
    penalty_start NUMERIC NOT NULL DEFAULT 50,
    penalty_end NUMERIC NOT NULL DEFAULT 50,
    penalty_fuel NUMERIC NOT NULL DEFAULT 50,
    penalty_yard NUMERIC NOT NULL DEFAULT 50,
    apply_penalty_start BOOLEAN DEFAULT true,
    apply_penalty_end BOOLEAN DEFAULT true,
    apply_penalty_fuel BOOLEAN DEFAULT true,
    apply_penalty_yard BOOLEAN DEFAULT true,
    closing_rule TEXT DEFAULT 'manual', -- 'manual', 'fixed_day', 'last_sunday'
    closing_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Manual Penalties
CREATE TABLE IF NOT EXISTS manual_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    points NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --- RLS (Row Level Security) ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE baits ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_penalties ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin safely
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper to check if current user is admin or standard safely
CREATE OR REPLACE FUNCTION public.is_manager() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'standard')
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

CREATE POLICY "Public Read" ON vehicle_modalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON vehicle_modalities FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON checklist_items FOR ALL USING (is_admin());

CREATE POLICY "Public Read" ON manual_penalties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON manual_penalties FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public Read" ON score_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON score_profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Submissions Policies
CREATE POLICY "Drivers can see own submissions" ON checklist_submissions FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Drivers can insert own submissions" ON checklist_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Managers can view/manage all" ON checklist_submissions FOR ALL USING (is_manager());

-- Performance Policies
CREATE POLICY "Public Read" ON driver_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers Manage" ON driver_performance FOR ALL USING (is_manager());

-- Issues Policies
CREATE POLICY "Public Read for Issues" ON public.checklist_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers can insert issues" ON public.checklist_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update issues" ON public.checklist_issues FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Managers can manage all issues" ON public.checklist_issues FOR ALL TO authenticated USING (is_manager());

-- Settings Policies
CREATE POLICY "Anyone authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin());

-- Database Stats Function
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size BIGINT;
    storage_size BIGINT;
    file_count BIGINT;
    fotos_size BIGINT;
    docs_size BIGINT;
    out_json JSON;
BEGIN
    SELECT pg_database_size(current_database()) INTO db_size;
    
    BEGIN
        SELECT COALESCE(SUM((metadata->>'size')::numeric), 0), COUNT(*)
        INTO storage_size, file_count
        FROM storage.objects;
        
        SELECT COALESCE(SUM((metadata->>'size')::numeric), 0)
        INTO fotos_size
        FROM storage.objects
        WHERE bucket_id IN ('checklist-photos', 'truck-photos');

        SELECT COALESCE(SUM((metadata->>'size')::numeric), 0)
        INTO docs_size
        FROM storage.objects
        WHERE bucket_id NOT IN ('checklist-photos', 'truck-photos');
    EXCEPTION WHEN OTHERS THEN
        storage_size := 0;
        file_count := 0;
        fotos_size := 0;
        docs_size := 0;
    END;

    out_json := json_build_object(
        'db_size', db_size,
        'storage_size', storage_size,
        'file_count', file_count,
        'fotos_size', fotos_size,
        'docs_size', docs_size
    );
    
    RETURN out_json;
END;
$$;

ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vehicle_types" ON public.vehicle_types FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Anyone authenticated can read vehicle_models" ON public.vehicle_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vehicle_models" ON public.vehicle_models FOR ALL TO authenticated USING (is_admin());

-- Schedules Policies
CREATE POLICY "Anyone authenticated can read schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert schedules" ON public.schedules FOR INSERT TO authenticated WITH CHECK (is_manager());
CREATE POLICY "Managers can update schedules" ON public.schedules FOR UPDATE TO authenticated USING (is_manager() OR auth.uid() = driver_id);
CREATE POLICY "Admins can delete schedules" ON public.schedules FOR DELETE TO authenticated USING (is_admin());

-- Baits Policies
CREATE POLICY "Anyone authenticated can read baits" ON public.baits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage baits" ON public.baits FOR ALL TO authenticated USING (is_admin());

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

CREATE TABLE IF NOT EXISTS score_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS score_closing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID REFERENCES score_closings(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id),
    score INTEGER NOT NULL,
    total_checklists INTEGER DEFAULT 0
);

ALTER TABLE score_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_closing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view score closings" ON score_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert score closings" ON score_closings FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Public can view score closing items" ON score_closing_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert score closing items" ON score_closing_items FOR INSERT TO authenticated WITH CHECK (is_admin());

-- Auto Closing RPC function
CREATE OR REPLACE FUNCTION public.run_auto_score_closing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    settings record;
    last_closing date;
    start_d date;
    end_d date;
    new_closing_id uuid;
    driver record;
    initial_score integer;
    d_initial_score integer;
    sp_calc TEXT;
BEGIN
    SELECT * INTO settings FROM public.app_settings WHERE id = 'global';
    
    IF settings.closing_rule IS NULL OR settings.closing_rule = 'manual' THEN
        RETURN;
    END IF;

    initial_score := COALESCE(settings.initial_value, 1000);

    SELECT period_end INTO last_closing FROM public.score_closings ORDER BY period_end DESC LIMIT 1;
    IF last_closing IS NULL THEN
        -- Fallback to the start of the current month
        last_closing := date_trunc('month', current_date)::date - integer '1';
    END IF;

    start_d := last_closing + integer '1';

    IF settings.closing_rule = 'fixed_day' THEN
        -- Find the target closing date for the CURRENT month
        end_d := date_trunc('month', current_date)::date + ((COALESCE(settings.closing_day, 1) - 1) || ' days')::interval;
        
        -- If current date is after end_d, and start_d <= end_d (we haven't already closed it)
        IF current_date > end_d AND start_d <= end_d THEN
             
             INSERT INTO public.score_closings (period_start, period_end, closed_by)
             VALUES (start_d, end_d, NULL)
             RETURNING id INTO new_closing_id;

             -- Insert items & Reset scores
             FOR driver IN 
                SELECT p.id, p.role, p.score_profile_id, sp.base_value, sp.calculation_type 
                FROM public.profiles p
                LEFT JOIN score_profiles sp ON p.score_profile_id = sp.id
                WHERE p.role = 'driver' AND p.full_name NOT LIKE '%//INTERNO%' AND p.participates_in_ranking = true
             LOOP
                 d_initial_score := initial_score;
                 IF driver.base_value IS NOT NULL THEN
                     IF driver.calculation_type = 'fixed' THEN
                         d_initial_score := driver.base_value;
                     ELSE
                         d_initial_score := 0;
                     END IF;
                 END IF;

                 INSERT INTO public.score_closing_items (closing_id, driver_id, score, total_checklists)
                 VALUES (
                    new_closing_id, driver.id, 
                    COALESCE((SELECT score FROM public.driver_performance WHERE driver_id = driver.id), d_initial_score), 
                    COALESCE((SELECT total_checklists FROM public.driver_performance WHERE driver_id = driver.id), 0)
                 );
                 
                 UPDATE public.driver_performance SET score = d_initial_score, total_checklists = 0 WHERE driver_id = driver.id;

                 INSERT INTO public.audit_logs (driver_id, type, amount, reason)
                 VALUES (driver.id, 'reset', d_initial_score, 'Fechamento automático (' || start_d || ' a ' || end_d || ') e reset do ciclo');
             END LOOP;
        END IF;
    END IF;
END;
$$;

-- Script de Migração para Transformar o Sistema em Multi-Empresa

-- 1. Tabela de Empresas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT, -- CNPJ ou CPF
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inserir Empresa Padrão para não quebrar o sistema atual
INSERT INTO public.companies (name) VALUES ('Empresa Padrão') ON CONFLICT DO NOTHING;

-- 3. Função para pegar ID da Empresa Padrão
CREATE OR REPLACE FUNCTION get_default_company_id() RETURNS UUID AS $$
DECLARE
  cid UUID;
BEGIN
  SELECT id INTO cid FROM public.companies LIMIT 1;
  RETURN cid;
END;
$$ LANGUAGE plpgsql;

-- 4. Adicionando column company_id nas tabelas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.profiles SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicles SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.trailers SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.routes SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.checklist_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_types SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.vehicle_modalities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicle_modalities SET company_id = get_default_company_id() WHERE company_id IS NULL;

-- checklist_items: dependendo da sua arquitetura, se os tipos de checklist são por empresa, os itens não precisam, 
-- mas por segurança pode-se isolar pelo type_id.

ALTER TABLE public.checklist_submissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_submissions SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.driver_performance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.driver_performance SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.checklist_issues ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_issues SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.schedules SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.score_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.score_profiles SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.manual_penalties ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.manual_penalties SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.audit_logs SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.score_closings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.score_closings SET company_id = get_default_company_id() WHERE company_id IS NULL;

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.app_settings SET company_id = get_default_company_id() WHERE company_id IS NULL;
-- Alterar a tabela de settings para permitir diferentes configs por empresa e remover 'global' fixo opcionalmente.

-- 5. Função para obter o company_id do usuário atual
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID AS $$
DECLARE
  cid UUID;
BEGIN
  SELECT company_id INTO cid FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger Genérica para sempre preencher company_id no INSERT se não for passado
CREATE OR REPLACE FUNCTION set_company_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.current_user_company_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_company_id_vehicles BEFORE INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_trailers BEFORE INSERT ON public.trailers FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_routes BEFORE INSERT ON public.routes FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_checklist_submissions BEFORE INSERT ON public.checklist_submissions FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_checklist_issues BEFORE INSERT ON public.checklist_issues FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_schedules BEFORE INSERT ON public.schedules FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();

-- 7. REFEZER AS POLÍTICAS DE RLS PARA MULTI EMPRESA
-- Para manter a compatibilidade mas restringindo, vamos recriar o is_admin e as regras RLS
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_manager() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'standard', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aqui o usuário superadmin vê todas as empresas e admins veem apenas a sua
CREATE OR REPLACE FUNCTION public.can_access_company(target_company_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  user_company UUID;
  user_role TEXT;
BEGIN
  SELECT company_id, role INTO user_company, user_role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  IF user_role = 'superadmin' THEN
    RETURN true;
  END IF;
  RETURN user_company = target_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- (Você deverá excluir as policies antigas caso precise, e recriar utilizando can_access_company(company_id))

-- EXCEÇÃO PARA PERMITIR LOGIN E BUSCAR PERFIL:
CREATE POLICY "Profiles readable by own company or self" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR can_access_company(company_id));

-- ... (Reaplicar lógicas nas outras tabelas garantindo AND can_access_company(company_id))


-- APÊNDICE DE REVISÃO
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.profiles SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicles SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.trailers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.trailers SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.routes SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.checklist_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_types SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.vehicle_modalities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicle_modalities SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.checklist_submissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_submissions SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.driver_performance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.driver_performance SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.checklist_issues ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_issues SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.schedules SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.score_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.score_profiles SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.manual_penalties ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.manual_penalties SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.audit_logs SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.score_closings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.score_closings SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.app_settings SET company_id = get_default_company_id() WHERE company_id IS NULL;
CREATE TRIGGER set_company_id_vehicles BEFORE INSERT ON public.vehicles FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_trailers BEFORE INSERT ON public.trailers FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_routes BEFORE INSERT ON public.routes FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_checklist_submissions BEFORE INSERT ON public.checklist_submissions FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_checklist_issues BEFORE INSERT ON public.checklist_issues FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_schedules BEFORE INSERT ON public.schedules FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.checklist_items SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.vehicle_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicle_types SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.vehicle_models ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.vehicle_models SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.baits ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.baits SET company_id = get_default_company_id() WHERE company_id IS NULL;
ALTER TABLE public.score_closing_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
UPDATE public.score_closing_items SET company_id = get_default_company_id() WHERE company_id IS NULL;
CREATE TRIGGER set_company_id_checklist_types BEFORE INSERT ON public.checklist_types FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_checklist_items BEFORE INSERT ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_vehicle_modalities BEFORE INSERT ON public.vehicle_modalities FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_driver_performance BEFORE INSERT ON public.driver_performance FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_score_profiles BEFORE INSERT ON public.score_profiles FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_manual_penalties BEFORE INSERT ON public.manual_penalties FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_audit_logs BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_score_closings BEFORE INSERT ON public.score_closings FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_score_closing_items BEFORE INSERT ON public.score_closing_items FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_vehicle_types BEFORE INSERT ON public.vehicle_types FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_vehicle_models BEFORE INSERT ON public.vehicle_models FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_baits BEFORE INSERT ON public.baits FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_profiles BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();
CREATE TRIGGER set_company_id_app_settings BEFORE INSERT ON public.app_settings FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();

-- PLANOS
-- Atualizando a tabela de empresas para gerenciar planos SaaS
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Básico';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_vehicles INTEGER DEFAULT 10;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled', 'past_due'));
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;


-- SAAS PLANS
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_users INTEGER NOT NULL DEFAULT 10,
    max_vehicles INTEGER NOT NULL DEFAULT 10,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir planos iniciais se não existirem
INSERT INTO public.saas_plans (name, max_users, max_vehicles, price) VALUES 
('Básico', 10, 10, 0.00),
('Pro', 50, 50, 99.90),
('Enterprise', 1000, 1000, 499.90)
ON CONFLICT (name) DO NOTHING;

-- Adicionar FK na tabela companies (opcional, mas bom pra integridade, ou manter só o nome)
-- Vamos manter a coluna plan_name por enquanto e vincular pela string para evitar quebra, ou podemos adicionar plan_id.
-- Melhor adicionar plan_id e migrar plan_name para referenciar.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.saas_plans(id);

-- Linkar plans existentes
UPDATE public.companies SET plan_id = (SELECT id FROM public.saas_plans WHERE name = companies.plan_name LIMIT 1) WHERE plan_name IS NOT NULL AND plan_id IS NULL;

-- TABELA DEDICADA DE MÉDIAS DE CONSUMO
CREATE TABLE IF NOT EXISTS public.vehicle_averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    fuel_submission_id UUID REFERENCES public.checklist_submissions(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    start_odometer INTEGER,
    end_odometer INTEGER,
    distance INTEGER,
    liters NUMERIC,
    average NUMERIC,
    status TEXT DEFAULT 'reviewed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicle_averages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages;
CREATE POLICY "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can manage vehicle_averages" ON public.vehicle_averages;
CREATE POLICY "Managers can manage vehicle_averages" ON public.vehicle_averages
  FOR ALL TO authenticated USING (is_manager());

CREATE TRIGGER set_company_id_vehicle_averages BEFORE INSERT ON public.vehicle_averages FOR EACH ROW EXECUTE FUNCTION set_company_id_on_insert();

