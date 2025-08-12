-- Fix critical security issues in RLS policies

-- 1. Fix profiles table - only allow users to see their own profile
DROP POLICY IF EXISTS "Profiles view self and public" ON public.profiles;
CREATE POLICY "Profiles view self only" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- 2. Fix user_roles table - only allow users to see their own roles
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- 3. Fix membros table - restrict access properly
DROP POLICY IF EXISTS "Membros read: pastors all; discipulador or self" ON public.membros;
CREATE POLICY "Membros read: pastors all; own disciples or self only" 
ON public.membros 
FOR SELECT 
USING (
  has_role(auth.uid(), 'pastor'::app_role) 
  OR (discipulador_id = auth.uid()) 
  OR (user_id = auth.uid())
);