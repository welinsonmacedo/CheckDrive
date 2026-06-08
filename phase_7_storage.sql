-- Fase 7 - Restrição de RLS e Bloqueio nos Buckets do Storage
-- Garante isolamento no download e listagem de evidências no storage.

-- Como a engine de Auth está atrelada à tabela storage.objects do Supabase, definiremos
-- regras em que cada motorista gerencia a própria pasta {auth.uid()}/* e admins gerenciam
-- arquivos dos funcionários da sua empresa via matching estrutural ou funções seguras.

-- Remover buckets das permissões públicas se estiverem
UPDATE storage.buckets SET public = false WHERE id IN ('checklist-photos', 'truck-photos', 'avatars');

-- Ativar RLS se não estiver
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Excluir genéricas de leitura (Caso existam na infraestrutura do SaaS, substituiremos)
DROP POLICY IF EXISTS "Public Read on Storage" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can insert" ON storage.objects;

-- Insert: usuário cadastra apenas no próprio container
CREATE POLICY "Users can upload their own files" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id IN ('checklist-photos', 'avatars') AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update: usuários não editam evidências dadas (Imutabilidade em Checklists)
-- Apenas admins podem renomear/mexer caso requeira a nivel organizacional.
CREATE POLICY "Admins can update storage files" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
  is_manager()
) WITH CHECK (is_manager());

-- Delete: Apenas admins
CREATE POLICY "Admins can delete files" 
ON storage.objects FOR DELETE TO authenticated 
USING (
  is_manager()
);

-- Select: Usuário pode baixar sua própria imagem. Ou Managers podem baixar de todos os usuários
-- Note: Se can_access_company(company_id) envolvesse ID na photo ok, 
-- mas usaremos uma regra baseada no profiles.company_id associando folder path.
CREATE POLICY "Tenant Read Object" 
ON storage.objects FOR SELECT TO authenticated 
USING (
  -- O dono é o próprio usuário
  (storage.foldername(name))[1] = auth.uid()::text 
  OR 
  -- Ou o solicitante é admin/superadmin e o dono apontado pela regex percente a mesma empresa
  (
    is_manager() AND 
    can_access_company(
      (SELECT company_id FROM public.profiles WHERE id::text = (storage.foldername(name))[1] LIMIT 1)
    )
  )
  OR
  -- Acesso complementar para assinaturas genéricas assinadas
  (is_admin() AND (storage.foldername(name))[1] = 'admin_' || auth.uid()::text)
);
