-- Criar usuário administrador
-- NOTA: Este script insere manualmente um usuário na tabela auth.users
-- Em produção, você deve criar o usuário através do painel do Supabase ou pela API de signup

-- Primeiro, vamos criar uma função que adiciona a role de pastor para um usuário específico
CREATE OR REPLACE FUNCTION public.assign_pastor_role_to_user(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Busca o ID do usuário pelo email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  -- Se o usuário existir, adiciona a role de pastor
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'pastor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role de pastor atribuída ao usuário %', user_email;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado', user_email;
  END IF;
END;
$$;

-- Atribuir role de pastor ao email especificado
SELECT public.assign_pastor_role_to_user('breno.albuquerque@gmail.com');