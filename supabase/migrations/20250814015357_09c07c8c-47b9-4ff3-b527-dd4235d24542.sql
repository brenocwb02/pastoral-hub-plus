-- Fix RLS policies for form registrations

-- 1. Fix casas table policies
-- The current policy requires leader_id = auth.uid() but during creation, leader_id might be set to the current user
-- We need to allow pastors and discipuladores to create casas
DROP POLICY IF EXISTS "Casas create by pastors or leaders" ON public.casas;

CREATE POLICY "Casas create by pastors or discipuladores" 
ON public.casas 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'discipulador'::app_role)
);

-- 2. Fix membros table policies  
-- The current policy only allows pastors or discipuladores to insert, but we need to ensure
-- they can set the discipulador_id properly
DROP POLICY IF EXISTS "Membros insert: pastors or discipuladores" ON public.membros;

CREATE POLICY "Membros insert: pastors or discipuladores" 
ON public.membros 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role) OR 
  (has_role(auth.uid(), 'discipulador'::app_role) AND discipulador_id = auth.uid())
);

-- 3. Fix encontros_1a1 policies
-- Ensure the discipulador_id is set correctly during creation
DROP POLICY IF EXISTS "1a1 insert: pastors or discipuladores" ON public.encontros_1a1;

CREATE POLICY "1a1 insert: pastors or discipuladores" 
ON public.encontros_1a1 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role) OR 
  (has_role(auth.uid(), 'discipulador'::app_role) AND discipulador_id = auth.uid())
);

-- 4. Ensure user_roles table allows users to set their own member role on first registration
-- This should already be correct but let's verify
DROP POLICY IF EXISTS "Users can insert own member role" ON public.user_roles;

CREATE POLICY "Users can insert own member role" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() AND role = 'membro'::app_role
);

-- 5. Add policy for profiles table to allow users to create their own profile
DROP POLICY IF EXISTS "Profiles upsert self" ON public.profiles;

CREATE POLICY "Profiles upsert self" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- 6. Ensure progresso table allows proper creation
DROP POLICY IF EXISTS "Progresso upsert: pastors or discipulador or member self" ON public.progresso;

CREATE POLICY "Progresso upsert: pastors or discipulador or member self" 
ON public.progresso 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role) OR 
  EXISTS (
    SELECT 1 FROM membros m 
    WHERE m.id = progresso.membro_id 
    AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
  )
);