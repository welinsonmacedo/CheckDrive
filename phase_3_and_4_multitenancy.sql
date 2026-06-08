-- Fase 3 e 4 - Remoção de USING(true) e Blindagem Multiempresa

-- Criar a trigger transversal que impede mutação do company_id via UPDATE
CREATE OR REPLACE FUNCTION public.lock_company_id_on_update()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  -- Se for o mesmo n faz nada
  IF NEW.company_id = OLD.company_id THEN
    RETURN NEW;
  END IF;

  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(current_role, '') != 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: Alteração de locatário (company_id) estritamente proibida.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Excluir genéricas inseguras:
DROP POLICY IF EXISTS "Public Read" ON vehicles;
DROP POLICY IF EXISTS "Admin Manage" ON vehicles;

CREATE POLICY "Tenant Read Vehicles" ON vehicles FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Vehicles" ON vehicles FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_vehicles ON public.vehicles;
CREATE TRIGGER lock_company_id_vehicles BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON routes;
DROP POLICY IF EXISTS "Admin Manage" ON routes;
CREATE POLICY "Tenant Read Routes" ON routes FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Routes" ON routes FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_routes ON public.routes;
CREATE TRIGGER lock_company_id_routes BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON trailers;
DROP POLICY IF EXISTS "Admin Manage" ON trailers;
CREATE POLICY "Tenant Read Trailers" ON trailers FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Trailers" ON trailers FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_trailers ON public.trailers;
CREATE TRIGGER lock_company_id_trailers BEFORE UPDATE ON public.trailers FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON checklist_types;
DROP POLICY IF EXISTS "Admin Manage" ON checklist_types;
CREATE POLICY "Tenant Read Types" ON checklist_types FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Types" ON checklist_types FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_chk_types ON public.checklist_types;
CREATE TRIGGER lock_company_id_chk_types BEFORE UPDATE ON public.checklist_types FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON vehicle_modalities;
DROP POLICY IF EXISTS "Admin Manage" ON vehicle_modalities;
CREATE POLICY "Tenant Read Modalities" ON vehicle_modalities FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Modalities" ON vehicle_modalities FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_modalities ON public.vehicle_modalities;
CREATE TRIGGER lock_company_id_modalities BEFORE UPDATE ON public.vehicle_modalities FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON checklist_items;
DROP POLICY IF EXISTS "Admin Manage" ON checklist_items;
CREATE POLICY "Tenant Read Items" ON checklist_items FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Items" ON checklist_items FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_chk_items ON public.checklist_items;
CREATE TRIGGER lock_company_id_chk_items BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();


DROP POLICY IF EXISTS "Public Read" ON manual_penalties;
DROP POLICY IF EXISTS "Admin Manage" ON manual_penalties;
CREATE POLICY "Tenant Read Manual Penalties" ON manual_penalties FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Manual Penalties" ON manual_penalties FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id)) WITH CHECK (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_penalties ON public.manual_penalties;
CREATE TRIGGER lock_company_id_penalties BEFORE UPDATE ON public.manual_penalties FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Public Read" ON score_profiles;
DROP POLICY IF EXISTS "Admin Manage" ON score_profiles;
CREATE POLICY "Tenant Read Score Profiles" ON score_profiles FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Score Profiles" ON score_profiles FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id)) WITH CHECK (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_sp ON public.score_profiles;
CREATE TRIGGER lock_company_id_sp BEFORE UPDATE ON public.score_profiles FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Public Read" ON driver_performance;
DROP POLICY IF EXISTS "Managers Manage" ON driver_performance;
CREATE POLICY "Tenant Read Driver Performance" ON driver_performance FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Driver Performance" ON driver_performance FOR ALL TO authenticated USING (is_manager() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_dp ON public.driver_performance;
CREATE TRIGGER lock_company_id_dp BEFORE UPDATE ON public.driver_performance FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Tenant Read App Settings" ON app_settings FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage App Settings" ON app_settings FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_as ON public.app_settings;
CREATE TRIGGER lock_company_id_as BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Anyone authenticated can read vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "Admins can manage vehicle_types" ON public.vehicle_types;
CREATE POLICY "Tenant Read Vehicle Types" ON vehicle_types FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Vehicle Types" ON vehicle_types FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_vt ON public.vehicle_types;
CREATE TRIGGER lock_company_id_vt BEFORE UPDATE ON public.vehicle_types FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Anyone authenticated can read vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Admins can manage vehicle_models" ON public.vehicle_models;
CREATE POLICY "Tenant Read Vehicle Models" ON vehicle_models FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Vehicle Models" ON vehicle_models FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_vm ON public.vehicle_models;
CREATE TRIGGER lock_company_id_vm BEFORE UPDATE ON public.vehicle_models FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Anyone authenticated can read baits" ON public.baits;
DROP POLICY IF EXISTS "Admins can manage baits" ON public.baits;
CREATE POLICY "Tenant Read Baits" ON baits FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Baits" ON baits FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_baits ON public.baits;
CREATE TRIGGER lock_company_id_baits BEFORE UPDATE ON public.baits FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Public can view score closings" ON score_closings;
DROP POLICY IF EXISTS "Admins can insert score closings" ON score_closings;
CREATE POLICY "Tenant Read Score Closings" ON score_closings FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Score Closings" ON score_closings FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_asc ON public.score_closings;
CREATE TRIGGER lock_company_id_asc BEFORE UPDATE ON public.score_closings FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

DROP POLICY IF EXISTS "Public can view score closing items" ON score_closing_items;
DROP POLICY IF EXISTS "Admins can insert score closing items" ON score_closing_items;
CREATE POLICY "Tenant Read Score Closing Items" ON score_closing_items FOR SELECT TO authenticated USING (can_access_company(company_id));
CREATE POLICY "Tenant Manage Score Closing Items" ON score_closing_items FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_asci ON public.score_closing_items;
CREATE TRIGGER lock_company_id_asci BEFORE UPDATE ON public.score_closing_items FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

-- Submissions Limits
DROP POLICY IF EXISTS "Drivers can see own submissions" ON checklist_submissions;
DROP POLICY IF EXISTS "Drivers can insert own submissions" ON checklist_submissions;
DROP POLICY IF EXISTS "Managers can view/manage all" ON checklist_submissions;
CREATE POLICY "Drivers can see own submissions" ON checklist_submissions FOR SELECT USING (auth.uid() = driver_id);
-- Permitimos managers de enxergar tudo na companhia:
CREATE POLICY "Managers can view/manage all submissions" ON checklist_submissions FOR ALL USING (is_manager() AND can_access_company(company_id));
CREATE POLICY "Drivers can insert own submissions" ON checklist_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id AND can_access_company(company_id));
-- Evita mutação nos submissions para empresa errada
DROP TRIGGER IF EXISTS lock_company_id_subs ON public.checklist_submissions;
CREATE TRIGGER lock_company_id_subs BEFORE UPDATE ON public.checklist_submissions FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

-- Drivers audits:
DROP POLICY IF EXISTS "Drivers can see own audits" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can manage audits" ON public.audit_logs;
CREATE POLICY "Tenant Drivers read own audits" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Tenant Admins manage audits" ON public.audit_logs FOR ALL TO authenticated USING (is_admin() AND can_access_company(company_id));
DROP TRIGGER IF EXISTS lock_company_id_audits ON public.audit_logs;
CREATE TRIGGER lock_company_id_audits BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.lock_company_id_on_update();

