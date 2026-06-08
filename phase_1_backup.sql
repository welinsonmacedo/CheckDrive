-- Fase 1 - Inventário e Backup de Policies, Functions, Triggers e Views Antigas
-- Este script serve como registro histórico para rollback antes de aplicarmos a RLS segura.

-- ---- BACKUP DAS POLICIES ANTIGAS (schema.sql atual) ----
-- profiles
-- CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Profiles are manageable by admins" ON public.profiles FOR ALL TO authenticated USING (is_admin());
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- CREATE POLICY "Profiles readable by own company or self" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR can_access_company(company_id));

-- vehicles
-- CREATE POLICY "Public Read" ON vehicles FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON vehicles FOR ALL USING (is_admin());

-- routes
-- CREATE POLICY "Public Read" ON routes FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON routes FOR ALL USING (is_admin());

-- trailers
-- CREATE POLICY "Public Read" ON trailers FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON trailers FOR ALL USING (is_admin());

-- checklist_types
-- CREATE POLICY "Public Read" ON checklist_types FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON checklist_types FOR ALL USING (is_admin());

-- vehicle_modalities
-- CREATE POLICY "Public Read" ON vehicle_modalities FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON vehicle_modalities FOR ALL USING (is_admin());

-- checklist_items
-- CREATE POLICY "Public Read" ON checklist_items FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON checklist_items FOR ALL USING (is_admin());

-- manual_penalties
-- CREATE POLICY "Public Read" ON manual_penalties FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON manual_penalties FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- score_profiles
-- CREATE POLICY "Public Read" ON score_profiles FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admin Manage" ON score_profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- checklist_submissions
-- CREATE POLICY "Drivers can see own submissions" ON checklist_submissions FOR SELECT USING (auth.uid() = driver_id);
-- CREATE POLICY "Drivers can insert own submissions" ON checklist_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
-- CREATE POLICY "Managers can view/manage all" ON checklist_submissions FOR ALL USING (is_manager());

-- driver_performance
-- CREATE POLICY "Public Read" ON driver_performance FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Managers Manage" ON driver_performance FOR ALL USING (is_manager());

-- checklist_issues
-- CREATE POLICY "Public Read for Issues" ON public.checklist_issues FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Drivers can insert issues" ON public.checklist_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
-- CREATE POLICY "Drivers can update issues" ON public.checklist_issues FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "Managers can manage all issues" ON public.checklist_issues FOR ALL TO authenticated USING (is_manager());

-- app_settings
-- CREATE POLICY "Anyone authenticated can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin());

-- vehicle_types
-- CREATE POLICY "Anyone authenticated can read vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can manage vehicle_types" ON public.vehicle_types FOR ALL TO authenticated USING (is_admin());

-- vehicle_models
-- CREATE POLICY "Anyone authenticated can read vehicle_models" ON public.vehicle_models FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can manage vehicle_models" ON public.vehicle_models FOR ALL TO authenticated USING (is_admin());

-- schedules
-- CREATE POLICY "Anyone authenticated can read schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Managers can insert schedules" ON public.schedules FOR INSERT TO authenticated WITH CHECK (is_manager());
-- CREATE POLICY "Managers can update schedules" ON public.schedules FOR UPDATE TO authenticated USING (is_manager() OR auth.uid() = driver_id);
-- CREATE POLICY "Admins can delete schedules" ON public.schedules FOR DELETE TO authenticated USING (is_admin());

-- baits
-- CREATE POLICY "Anyone authenticated can read baits" ON public.baits FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can manage baits" ON public.baits FOR ALL TO authenticated USING (is_admin());

-- audit_logs
-- CREATE POLICY "Drivers can see own audits" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = driver_id OR is_admin());
-- CREATE POLICY "Admins can manage audits" ON public.audit_logs FOR ALL TO authenticated USING (is_admin());

-- score_closings
-- CREATE POLICY "Public can view score closings" ON score_closings FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can insert score closings" ON score_closings FOR INSERT TO authenticated WITH CHECK (is_admin());

-- score_closing_items
-- CREATE POLICY "Public can view score closing items" ON score_closing_items FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can insert score closing items" ON score_closing_items FOR INSERT TO authenticated WITH CHECK (is_admin());

-- SECURITY DEFINER FUNCTIONS (BACKUP):
-- is_admin(), is_manager(), can_access_company(), current_user_company_id(), set_company_id_on_insert(), get_database_stats()
