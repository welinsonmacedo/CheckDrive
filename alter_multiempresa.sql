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

-- Adicionando para tabelas faltantes
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

-- Adicionando Triggers faltantes
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
