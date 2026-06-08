-- Atualizando a tabela de empresas para gerenciar planos SaaS
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Básico';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_vehicles INTEGER DEFAULT 10;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial', 'cancelled', 'past_due'));
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;
