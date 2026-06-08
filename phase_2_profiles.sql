-- Fase 2 - Correção Crítica da Tabela Profiles
-- Objetivo: Restringir atualizações de campos sensíveis para evitar escalada de privilégios.

-- Remover as policies antigas para recriá-las com rigor
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are manageable by admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by own company or self" ON public.profiles;

-- 1. Leitura: Perfil próprio OU usuários da mesma empresa. Superadmin vê tudo (através do can_access_company que é bypass)
CREATE POLICY "Profiles readable by own company or self" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id OR can_access_company(company_id)
);

-- 2. Gerenciamento por admins (Apenas na mesma empresa, e admins normais não alteram superadmins e não tornam ninguém superadmin)
CREATE POLICY "Profiles manageable by admins" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  is_admin() AND can_access_company(company_id)
) WITH CHECK (
  is_admin() AND can_access_company(company_id)
);

-- 3. Trigger para impedir escalada ou bypass na própria tabela PROFILES
CREATE OR REPLACE FUNCTION public.restrict_profile_sensible_updates()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  -- Identifica o role real do usuário que está submetendo a query
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  
  -- Se NÃO for superadmin, restringir certas mudanças absolutas:
  IF COALESCE(current_role, '') != 'superadmin' THEN
    -- Apenas superadmin pode alterar para ou de 'superadmin'
    IF NEW.role = 'superadmin' OR OLD.role = 'superadmin' THEN
      RAISE EXCEPTION 'Acesso negado: Somente SuperAdmins podem gerenciar contas SuperAdmin.';
    END IF;
  
    -- Se o usuário estiver alterando o próprio perfil e NÃO for um admin da sua própria empresa gerenciando
    -- o ideal é congelar campos administrativos (company_id não pode ser alterado por conta própria)
    IF NEW.id = auth.uid() AND current_role NOT IN ('admin') THEN
      NEW.role := OLD.role;
      NEW.company_id := OLD.company_id;
      NEW.score_profile_id := OLD.score_profile_id;
      NEW.participates_in_ranking := OLD.participates_in_ranking;
      NEW.active := OLD.active;
      NEW.visible_tabs := OLD.visible_tabs;
      NEW.driver_type := OLD.driver_type;
      NEW.modality_ids := OLD.modality_ids;
    END IF;

    -- Nenhum admin regular pode mover usuários entre empresas diferentes
    IF current_role = 'admin' AND NEW.company_id != OLD.company_id THEN
      RAISE EXCEPTION 'Acesso negado: Administradores não podem transferir motoristas entre empresas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_profile_sensible_updates_trigger ON public.profiles;
CREATE TRIGGER restrict_profile_sensible_updates_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.restrict_profile_sensible_updates();

-- Permitimos que usuários modifiquem seu proprio perfil (somente update limitadamente)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

