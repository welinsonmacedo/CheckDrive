-- Migration Script: Gestão de Ativos (Asset Management)
-- Versão totalmente aditiva para suportar Veículos, Máquinas e Equipamentos.
-- Mantém 100% de compatibilidade com o banco Supabase e o aplicativo Android (Kotlin) existente.

DO $$
BEGIN
    -- 1. Novas colunas na tabela vehicles (Ativos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' AND column_name='asset_type') THEN
        ALTER TABLE public.vehicles ADD COLUMN asset_type TEXT DEFAULT 'VEHICLE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' AND column_name='control_unit') THEN
        ALTER TABLE public.vehicles ADD COLUMN control_unit TEXT DEFAULT 'KM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' AND column_name='hour_meter') THEN
        ALTER TABLE public.vehicles ADD COLUMN hour_meter NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' AND column_name='hour_meter_initial') THEN
        ALTER TABLE public.vehicles ADD COLUMN hour_meter_initial NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' AND column_name='hour_meter_current') THEN
        ALTER TABLE public.vehicles ADD COLUMN hour_meter_current NUMERIC DEFAULT 0;
    END IF;

    -- 2. Migrar registros de veículos existentes para valores padrão (VEHICLE e KM)
    UPDATE public.vehicles
    SET asset_type = 'VEHICLE'
    WHERE asset_type IS NULL;

    UPDATE public.vehicles
    SET control_unit = 'KM'
    WHERE control_unit IS NULL;

    -- 3. Adicionar configuração de modo de operação na tabela de empresas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='operation_mode') THEN
        ALTER TABLE public.companies ADD COLUMN operation_mode TEXT DEFAULT 'ALL_ASSETS';
    END IF;

    UPDATE public.companies
    SET operation_mode = 'ALL_ASSETS'
    WHERE operation_mode IS NULL;

    -- 4. Suporte a horímetro em submissões de checklist e manutenções preventivas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checklist_submissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_submissions' AND column_name='hour_meter_reading') THEN
            ALTER TABLE public.checklist_submissions ADD COLUMN hour_meter_reading NUMERIC DEFAULT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='auto_alerts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auto_alerts' AND column_name='interval_hours') THEN
            ALTER TABLE public.auto_alerts ADD COLUMN interval_hours NUMERIC DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auto_alerts' AND column_name='last_hours') THEN
            ALTER TABLE public.auto_alerts ADD COLUMN last_hours NUMERIC DEFAULT NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='auto_alerts' AND column_name='warning_hours') THEN
            ALTER TABLE public.auto_alerts ADD COLUMN warning_hours NUMERIC DEFAULT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checklist_issues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_issues' AND column_name='current_hours') THEN
            ALTER TABLE public.checklist_issues ADD COLUMN current_hours NUMERIC DEFAULT NULL;
        END IF;
    END IF;

    -- 5. Suporte a vinculação de tipo de veículo em itens de checklist e limites em app_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checklist_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_items' AND column_name='vehicle_type') THEN
            ALTER TABLE public.checklist_items ADD COLUMN vehicle_type TEXT DEFAULT 'ALL';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklist_items' AND column_name='vehicle_type_id') THEN
            ALTER TABLE public.checklist_items ADD COLUMN vehicle_type_id UUID DEFAULT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_settings' AND column_name='max_hours') THEN
            ALTER TABLE public.app_settings ADD COLUMN max_hours NUMERIC DEFAULT 100;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_settings' AND column_name='hours_limit_enabled') THEN
            ALTER TABLE public.app_settings ADD COLUMN hours_limit_enabled BOOLEAN DEFAULT false;
        END IF;
    END IF;

END $$;
