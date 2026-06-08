-- Fase 5 - Tratamento de Checklist Issues
-- Impedir que Drivers manipulem defeitos de outros Drivers/Empresas.

DROP POLICY IF EXISTS "Public Read for Issues" ON public.checklist_issues;
DROP POLICY IF EXISTS "Drivers can insert issues" ON public.checklist_issues;
DROP POLICY IF EXISTS "Drivers can update issues" ON public.checklist_issues;
DROP POLICY IF EXISTS "Managers can manage all issues" ON public.checklist_issues;

-- Leitura: Motoristas enxergam os próprios. Analistas/Admins enxergam da empresa toda.
CREATE POLICY "Drivers view own or company issues" 
ON public.checklist_issues FOR SELECT TO authenticated 
USING (
  (auth.uid() = driver_id) OR (is_manager() AND can_access_company(company_id))
);

-- Inserção: Motorista insere e o tenant correspondente deve ser o mesmo
CREATE POLICY "Drivers create own issues" 
ON public.checklist_issues FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = driver_id AND can_access_company(company_id)
);

-- Atualização: Motorista atualiza o próprio issue
CREATE POLICY "Drivers update own issues" 
ON public.checklist_issues FOR UPDATE TO authenticated 
USING (
  auth.uid() = driver_id
)
WITH CHECK (
  auth.uid() = driver_id AND can_access_company(company_id)
);

-- Gerentes coordenam tudo na mesma empresa:
CREATE POLICY "Managers manage all company issues" 
ON public.checklist_issues FOR ALL TO authenticated 
USING (
  is_manager() AND can_access_company(company_id)
);

-- Trigger para impedir lock de locatario já criado no passo 3/4
DROP TRIGGER IF EXISTS lock_company_id_iss ON public.checklist_issues;
CREATE TRIGGER lock_company_id_iss BEFORE UPDATE ON public.checklist_issues FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();
