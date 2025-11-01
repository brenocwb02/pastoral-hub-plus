-- Fix RLS policies by adding explicit authentication checks
-- This prevents vulnerabilities where auth.uid() could be NULL

-- ============================================
-- MEMBROS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Membros read: pastors, leaders, disciples, self" ON public.membros;
CREATE POLICY "Membros read: pastors, leaders, disciples, self" 
ON public.membros 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid() 
    OR user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM casas 
      WHERE casas.id = membros.casa_id 
      AND casas.leader_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Membros update: pastors, leaders, disciples, self" ON public.membros;
CREATE POLICY "Membros update: pastors, leaders, disciples, self" 
ON public.membros 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid() 
    OR user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM casas 
      WHERE casas.id = membros.casa_id 
      AND casas.leader_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid() 
    OR user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM casas 
      WHERE casas.id = membros.casa_id 
      AND casas.leader_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Membros insert: pastors or discipuladores" ON public.membros;
CREATE POLICY "Membros insert: pastors or discipuladores" 
ON public.membros 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR (
      has_role(auth.uid(), 'discipulador'::app_role) 
      AND discipulador_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Membros delete: pastors" ON public.membros;
CREATE POLICY "Membros delete: pastors" 
ON public.membros 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

-- ============================================
-- ENCONTROS_1A1 TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "1a1 read: pastors, leaders, discipuladores, discipulos" ON public.encontros_1a1;
CREATE POLICY "1a1 read: pastors, leaders, discipuladores, discipulos" 
ON public.encontros_1a1 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM membros m 
      WHERE m.id = encontros_1a1.discipulo_membro_id 
      AND m.user_id = auth.uid()
    ) 
    OR EXISTS (
      SELECT 1 FROM membros m 
      JOIN casas c ON c.id = m.casa_id 
      WHERE m.id = encontros_1a1.discipulo_membro_id 
      AND c.leader_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "1a1 insert: pastors or own discipulador" ON public.encontros_1a1;
CREATE POLICY "1a1 insert: pastors or own discipulador" 
ON public.encontros_1a1 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR (
      has_role(auth.uid(), 'discipulador'::app_role) 
      AND discipulador_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "1a1 update: pastors or discipulador" ON public.encontros_1a1;
CREATE POLICY "1a1 update: pastors or discipulador" 
ON public.encontros_1a1 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "1a1 delete: pastors or discipulador" ON public.encontros_1a1;
CREATE POLICY "1a1 delete: pastors or discipulador" 
ON public.encontros_1a1 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR discipulador_id = auth.uid()
  )
);

-- ============================================
-- CASAS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Casas read for authenticated" ON public.casas;
CREATE POLICY "Casas read for authenticated" 
ON public.casas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Casas create by pastors or discipuladores" ON public.casas;
CREATE POLICY "Casas create by pastors or discipuladores" 
ON public.casas 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR has_role(auth.uid(), 'discipulador'::app_role)
  )
);

DROP POLICY IF EXISTS "Casas update by pastors or leaders" ON public.casas;
CREATE POLICY "Casas update by pastors or leaders" 
ON public.casas 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR leader_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Casas delete by pastors" ON public.casas;
CREATE POLICY "Casas delete by pastors" 
ON public.casas 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

-- ============================================
-- PROGRESSO TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Progresso read: pastors or discipulador of membro or member sel" ON public.progresso;
CREATE POLICY "Progresso read: pastors or discipulador of membro or member sel" 
ON public.progresso 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR EXISTS (
      SELECT 1 FROM membros m 
      WHERE m.id = progresso.membro_id 
      AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Progresso upsert: pastors or discipulador or member self" ON public.progresso;
CREATE POLICY "Progresso upsert: pastors or discipulador or member self" 
ON public.progresso 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR EXISTS (
      SELECT 1 FROM membros m 
      WHERE m.id = progresso.membro_id 
      AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Progresso update: pastors or discipulador or member self" ON public.progresso;
CREATE POLICY "Progresso update: pastors or discipulador or member self" 
ON public.progresso 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'pastor'::app_role) 
    OR EXISTS (
      SELECT 1 FROM membros m 
      WHERE m.id = progresso.membro_id 
      AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
    )
  )
);

-- ============================================
-- REUNIOES_GERAIS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Reunioes read: all authenticated" ON public.reunioes_gerais;
CREATE POLICY "Reunioes read: all authenticated" 
ON public.reunioes_gerais 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Reunioes create: pastors" ON public.reunioes_gerais;
CREATE POLICY "Reunioes create: pastors" 
ON public.reunioes_gerais 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

DROP POLICY IF EXISTS "Reunioes update: pastors" ON public.reunioes_gerais;
CREATE POLICY "Reunioes update: pastors" 
ON public.reunioes_gerais 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

DROP POLICY IF EXISTS "Reunioes delete: pastors" ON public.reunioes_gerais;
CREATE POLICY "Reunioes delete: pastors" 
ON public.reunioes_gerais 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

-- ============================================
-- NOTIFICATIONS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Notifications: user view own" ON public.notifications;
CREATE POLICY "Notifications: user view own" 
ON public.notifications 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Notifications: user manage own" ON public.notifications;
CREATE POLICY "Notifications: user manage own" 
ON public.notifications 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- ============================================
-- USER_ROLES TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert own member role" ON public.user_roles;
CREATE POLICY "Users can insert own member role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid() 
  AND role = 'membro'::app_role
);

DROP POLICY IF EXISTS "Pastors can view users with roles" ON public.user_roles;
CREATE POLICY "Pastors can view users with roles" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

DROP POLICY IF EXISTS "Pastors manage roles" ON public.user_roles;
CREATE POLICY "Pastors manage roles" 
ON public.user_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

-- ============================================
-- PROFILES TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Profiles view self only" ON public.profiles;
CREATE POLICY "Profiles view self only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

DROP POLICY IF EXISTS "Profiles upsert self" ON public.profiles;
CREATE POLICY "Profiles upsert self" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

DROP POLICY IF EXISTS "Profiles update self" ON public.profiles;
CREATE POLICY "Profiles update self" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

-- Add DELETE policy for profiles
CREATE POLICY "Profiles delete self" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()
);

-- ============================================
-- GOOGLE_TOKENS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Google tokens: user manage own" ON public.google_tokens;
CREATE POLICY "Google tokens: user manage own" 
ON public.google_tokens 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- ============================================
-- AUDIT_LOGS TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Pastors can view audit logs" ON public.audit_logs;
CREATE POLICY "Pastors can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);

-- ============================================
-- PLANOS_ESTUDO TABLE - Fix authentication checks
-- ============================================

DROP POLICY IF EXISTS "Planos read: all authenticated" ON public.planos_estudo;
CREATE POLICY "Planos read: all authenticated" 
ON public.planos_estudo 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Planos create/update/delete: pastors" ON public.planos_estudo;
CREATE POLICY "Planos create/update/delete: pastors" 
ON public.planos_estudo 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'pastor'::app_role)
);