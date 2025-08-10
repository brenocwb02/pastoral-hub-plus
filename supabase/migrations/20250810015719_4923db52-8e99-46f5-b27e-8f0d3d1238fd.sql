-- Cuidar+ Database Schema and RLS
-- 1) Enums
CREATE TYPE public.app_role AS ENUM ('pastor', 'discipulador', 'membro');
CREATE TYPE public.progress_status AS ENUM ('not_started','in_progress','completed');
CREATE TYPE public.notification_status AS ENUM ('pending','sent','failed');
CREATE TYPE public.notification_channel AS ENUM ('none','telegram','whatsapp');

-- 2) Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Roles table and helper
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- 4) Domain tables
CREATE TABLE public.casas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  discipulador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  casa_id uuid REFERENCES public.casas(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.encontros_1a1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipulador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipulo_membro_id uuid NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  notes text,
  outcome text,
  google_event_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.encontros_1a1 ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunioes_gerais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  location text,
  google_event_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reunioes_gerais ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.planos_estudo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planos_estudo ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id uuid NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_estudo(id) ON DELETE CASCADE,
  status public.progress_status NOT NULL DEFAULT 'not_started',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membro_id, plano_id)
);
ALTER TABLE public.progresso ENABLE ROW LEVEL SECURITY;

-- Google tokens
CREATE TABLE public.google_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz
);
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications (optional)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('1a1','reuniao_geral')),
  related_id uuid NOT NULL,
  remind_at timestamptz NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'none',
  status public.notification_status NOT NULL DEFAULT 'pending',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5) Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_casas_updated BEFORE UPDATE ON public.casas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_membros_updated BEFORE UPDATE ON public.membros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_encontros_1a1_updated BEFORE UPDATE ON public.encontros_1a1 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reunioes_gerais_updated BEFORE UPDATE ON public.reunioes_gerais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_planos_estudo_updated BEFORE UPDATE ON public.planos_estudo FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) RLS Policies
-- profiles: users can see their profile; everyone can see list basic? we'll allow select for authenticated
CREATE POLICY "Profiles view self and public" ON public.profiles
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles upsert self" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles update self" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles
CREATE POLICY "Users can view roles" ON public.user_roles
FOR SELECT TO authenticated USING (true);
-- Users can assign themselves only 'membro' by default
CREATE POLICY "Users can insert own member role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role <> 'pastor');
-- Only pastors can modify roles
CREATE POLICY "Pastors manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'pastor'))
WITH CHECK (public.has_role(auth.uid(),'pastor'));

-- casas
CREATE POLICY "Casas read for authenticated" ON public.casas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Casas create by pastors or leaders" ON public.casas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'pastor') OR leader_id = auth.uid()
);
CREATE POLICY "Casas update by pastors or leaders" ON public.casas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'pastor') OR leader_id = auth.uid()
);
CREATE POLICY "Casas delete by pastors" ON public.casas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'pastor'));

-- membros
CREATE POLICY "Membros read: pastors all; discipulador or self" ON public.membros FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'pastor')
  OR discipulador_id = auth.uid()
  OR user_id = auth.uid()
);
CREATE POLICY "Membros insert: pastors or discipuladores" ON public.membros FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'pastor') OR public.has_role(auth.uid(),'discipulador')
);
CREATE POLICY "Membros update: pastors or their discipulador or self" ON public.membros FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'pastor') OR discipulador_id = auth.uid() OR user_id = auth.uid()
);
CREATE POLICY "Membros delete: pastors" ON public.membros FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'pastor'));

-- encontros_1a1
CREATE POLICY "1a1 read: pastors, discipulador, discipulo" ON public.encontros_1a1 FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'pastor')
  OR discipulador_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.membros m WHERE m.id = discipulo_membro_id AND m.user_id = auth.uid()
  )
);
CREATE POLICY "1a1 insert: pastors or discipuladores" ON public.encontros_1a1 FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'pastor') OR public.has_role(auth.uid(),'discipulador')
);
CREATE POLICY "1a1 update: pastors or discipulador" ON public.encontros_1a1 FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'pastor') OR discipulador_id = auth.uid()
);
CREATE POLICY "1a1 delete: pastors or discipulador" ON public.encontros_1a1 FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'pastor') OR discipulador_id = auth.uid()
);

-- reunioes_gerais
CREATE POLICY "Reunioes read: all authenticated" ON public.reunioes_gerais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reunioes create: pastors" ON public.reunioes_gerais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'pastor'));
CREATE POLICY "Reunioes update: pastors" ON public.reunioes_gerais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'pastor'));
CREATE POLICY "Reunioes delete: pastors" ON public.reunioes_gerais FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'pastor'));

-- planos_estudo
CREATE POLICY "Planos read: all authenticated" ON public.planos_estudo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Planos create/update/delete: pastors" ON public.planos_estudo
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'pastor'))
WITH CHECK (public.has_role(auth.uid(),'pastor'));

-- progresso
CREATE POLICY "Progresso read: pastors or discipulador of membro or member self" ON public.progresso FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'pastor')
  OR EXISTS (
    SELECT 1 FROM public.membros m WHERE m.id = membro_id AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
  )
);
CREATE POLICY "Progresso upsert: pastors or discipulador or member self" ON public.progresso FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'pastor')
  OR EXISTS (
    SELECT 1 FROM public.membros m WHERE m.id = membro_id AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
  )
);
CREATE POLICY "Progresso update: pastors or discipulador or member self" ON public.progresso FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'pastor')
  OR EXISTS (
    SELECT 1 FROM public.membros m WHERE m.id = membro_id AND (m.discipulador_id = auth.uid() OR m.user_id = auth.uid())
  )
);

-- google_tokens
CREATE POLICY "Google tokens: user manage own" ON public.google_tokens
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- notifications
CREATE POLICY "Notifications: user view own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notifications: user manage own" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7) Useful indexes
CREATE INDEX IF NOT EXISTS idx_membros_discipulador ON public.membros(discipulador_id);
CREATE INDEX IF NOT EXISTS idx_membros_casa ON public.membros(casa_id);
CREATE INDEX IF NOT EXISTS idx_encontros_discipulador ON public.encontros_1a1(discipulador_id);
CREATE INDEX IF NOT EXISTS idx_encontros_membro ON public.encontros_1a1(discipulo_membro_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_scheduled ON public.reunioes_gerais(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_remind ON public.notifications(remind_at, status);
