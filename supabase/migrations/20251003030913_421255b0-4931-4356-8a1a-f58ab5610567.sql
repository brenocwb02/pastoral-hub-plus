-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS public.get_users_with_roles();

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(
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
  -- Only pastors can execute this function
  IF NOT has_role(auth.uid(), 'pastor'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Only pastors can view users with roles.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    COALESCE(p.full_name, '')::text,
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