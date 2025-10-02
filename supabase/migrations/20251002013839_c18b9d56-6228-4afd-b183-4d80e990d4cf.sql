-- Remover a view insegura que expõe auth.users
DROP VIEW IF EXISTS public.users_with_roles;

-- Criar uma função segura para pastores consultarem usuários com roles
-- Esta função usa SECURITY DEFINER mas só permite acesso a pastores
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  roles app_role[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas pastores podem executar esta função
  IF NOT has_role(auth.uid(), 'pastor'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Only pastors can view users with roles.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    p.full_name,
    COALESCE(
      array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::app_role[]
    ) as roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email, p.full_name;
END;
$$;

COMMENT ON FUNCTION public.get_users_with_roles() IS 'Retorna todos os usuários com suas roles. Apenas acessível por pastores.';

-- Garantir que a função possa ser executada por usuários autenticados
-- mas a verificação de permissão interna garante que apenas pastores a usem
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;