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
