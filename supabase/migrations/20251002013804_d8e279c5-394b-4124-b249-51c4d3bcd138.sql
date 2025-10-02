-- Garantir que o usuário admin tenha a role de pastor
-- Esta função será executada e atribuirá a role se o usuário existir
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Busca o ID do usuário admin pelo email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'breno.albuquerque@gmail.com'
  LIMIT 1;
  
  -- Se o usuário existir, adiciona a role de pastor
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'pastor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role de pastor atribuída ao usuário breno.albuquerque@gmail.com';
  ELSE
    RAISE NOTICE 'Usuário breno.albuquerque@gmail.com ainda não está registrado. A role será atribuída quando o usuário se registrar.';
  END IF;
END $$;

-- Criar uma função helper para adicionar role de membro automaticamente em novos usuários
CREATE OR REPLACE FUNCTION public.assign_default_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Adiciona a role de membro para todos os novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'membro'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Se o email for do admin, adiciona também a role de pastor
  IF NEW.email = 'breno.albuquerque@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pastor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role de pastor atribuída automaticamente ao admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atribuir roles automaticamente quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created_assign_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_member_role();

-- Criar uma view para facilitar a consulta de usuários com suas roles
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  COALESCE(
    array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),
    ARRAY[]::app_role[]
  ) as roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, p.full_name;

COMMENT ON VIEW public.users_with_roles IS 'View que mostra todos os usuários com suas roles agregadas. Útil para interfaces de gerenciamento.';
COMMENT ON FUNCTION public.assign_default_member_role() IS 'Atribui automaticamente a role de membro para novos usuários, e role de pastor para o admin configurado.';