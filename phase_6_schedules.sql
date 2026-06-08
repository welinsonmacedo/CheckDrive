-- Fase 6 - Blindagem da Tabela de Escalas (Schedules)
-- Impedir que Drivers alterem campos imutáveis das suas escalas.

DROP POLICY IF EXISTS "Anyone authenticated can read schedules" ON public.schedules;
DROP POLICY IF EXISTS "Managers can insert schedules" ON public.schedules;
DROP POLICY IF EXISTS "Managers can update schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.schedules;

-- Leitura de schedules limitadas ao locatário
CREATE POLICY "Tenant view schedules" 
ON public.schedules FOR SELECT TO authenticated 
USING (can_access_company(company_id));

CREATE POLICY "Managers insert schedules" 
ON public.schedules FOR INSERT TO authenticated 
WITH CHECK (is_manager() AND can_access_company(company_id));

CREATE POLICY "Admins delete schedules" 
ON public.schedules FOR DELETE TO authenticated 
USING (is_admin() AND can_access_company(company_id));

-- Trigger impeditivo para updates sensíveis de motorista em schedules
CREATE OR REPLACE FUNCTION public.restrict_schedule_driver_updates()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(current_role, '') NOT IN ('admin', 'superadmin', 'standard') THEN
    -- Motoristas não podem mudar a estrutura da escala
    IF NEW.driver_id != OLD.driver_id OR
       NEW.vehicle_id != OLD.vehicle_id OR
       NEW.trailer_id IS DISTINCT FROM OLD.trailer_id OR
       NEW.route_id != OLD.route_id OR
       NEW.start_at != OLD.start_at OR
       NEW.end_at != OLD.end_at OR
       NEW.bait1_id IS DISTINCT FROM OLD.bait1_id OR
       NEW.bait2_id IS DISTINCT FROM OLD.bait2_id OR
       NEW.bait3_id IS DISTINCT FROM OLD.bait3_id THEN
      RAISE EXCEPTION 'Acesso negado: Motoristas não possuem permissão para repactuar rotas e vinculadores da escala.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_schedule_driver_updates_trigger ON public.schedules;
CREATE TRIGGER restrict_schedule_driver_updates_trigger
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.restrict_schedule_driver_updates();

-- Update para drivers x managers (com WITH CHECK apropriado)
CREATE POLICY "Schedules update logic" 
ON public.schedules FOR UPDATE TO authenticated 
USING (
  (is_manager() AND can_access_company(company_id)) OR 
  (auth.uid() = driver_id)
)
WITH CHECK (can_access_company(company_id));

DROP TRIGGER IF EXISTS lock_company_id_scheds ON public.schedules;
CREATE TRIGGER lock_company_id_scheds BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();
