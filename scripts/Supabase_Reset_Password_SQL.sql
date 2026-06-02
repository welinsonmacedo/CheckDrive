-- Script para habilitar a troca de senhas pelo painel Admin
-- Cole isso no seu Supabase > SQL Editor e clique em 'RUN'

CREATE EXTENSION IF NOT EXISTS pgcrypto;
      
CREATE OR REPLACE FUNCTION admin_change_user_password(target_email TEXT, new_password TEXT)
RETURNS void AS $$
DECLARE
  target_uid UUID;
BEGIN
  -- 1. Verifica se quem chamou a função é Admin (ou se preferir, remova essa checagem se der erro, mas é mais seguro manter)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 2. Encontra o ID do usuário usando o e-mail (que fica no esquema auth)
  SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com esse e-mail.';
  END IF;

  -- 3. Criptografa a nova senha e atualiza no esquema Auth
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
