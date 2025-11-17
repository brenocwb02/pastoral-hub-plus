-- Sprint 5-6: Advanced Analytics, Resource Library, and Gamification

-- =====================================================
-- RESOURCE LIBRARY TABLES
-- =====================================================

-- Resources table
CREATE TABLE IF NOT EXISTS public.recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('video', 'document', 'link', 'audio', 'image')),
  url TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on recursos
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recursos
CREATE POLICY "Recursos read: all authenticated"
  ON public.recursos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recursos create: pastors and discipuladores"
  ON public.recursos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'pastor'::app_role) OR
      has_role(auth.uid(), 'discipulador'::app_role)
    )
  );

CREATE POLICY "Recursos update: pastors and creator"
  ON public.recursos FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'pastor'::app_role) OR
      created_by = auth.uid()
    )
  );

CREATE POLICY "Recursos delete: pastors"
  ON public.recursos FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pastor'::app_role));

-- Add updated_at trigger for recursos
CREATE TRIGGER set_recursos_updated_at
  BEFORE UPDATE ON public.recursos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add audit trigger for recursos
CREATE TRIGGER audit_recursos
  AFTER INSERT OR UPDATE OR DELETE ON public.recursos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- =====================================================
-- GAMIFICATION TABLES
-- =====================================================

-- Achievements table
CREATE TABLE IF NOT EXISTS public.conquistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on conquistas
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conquistas
CREATE POLICY "Conquistas read: all authenticated"
  ON public.conquistas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Conquistas manage: pastors only"
  ON public.conquistas FOR ALL
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pastor'::app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pastor'::app_role));

-- User achievements table
CREATE TABLE IF NOT EXISTS public.conquistas_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conquista_id UUID NOT NULL REFERENCES public.conquistas(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, conquista_id)
);

-- Enable RLS on conquistas_usuario
ALTER TABLE public.conquistas_usuario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conquistas_usuario
CREATE POLICY "User achievements read: own or pastor"
  ON public.conquistas_usuario FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

CREATE POLICY "User achievements insert: system or pastor"
  ON public.conquistas_usuario FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

CREATE POLICY "User achievements update: own or pastor"
  ON public.conquistas_usuario FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

-- User points and levels table
CREATE TABLE IF NOT EXISTS public.pontos_usuario (
  user_id UUID PRIMARY KEY,
  total_points INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on pontos_usuario
ALTER TABLE public.pontos_usuario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pontos_usuario
CREATE POLICY "User points read: own or pastor"
  ON public.pontos_usuario FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

CREATE POLICY "User points upsert: own or pastor"
  ON public.pontos_usuario FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

CREATE POLICY "User points update: own or pastor"
  ON public.pontos_usuario FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      has_role(auth.uid(), 'pastor'::app_role)
    )
  );

-- Add updated_at trigger for pontos_usuario
CREATE TRIGGER set_pontos_usuario_updated_at
  BEFORE UPDATE ON public.pontos_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ANALYTICS TABLES
-- =====================================================

-- Analytics events table for detailed tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
CREATE POLICY "Analytics events insert: all authenticated"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Analytics events read: pastors only"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'pastor'::app_role));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);

-- =====================================================
-- INITIAL GAMIFICATION DATA
-- =====================================================

-- Insert initial achievements
INSERT INTO public.conquistas (name, description, icon, points, criteria) VALUES
  ('Primeiro Passo', 'Complete seu perfil pela primeira vez', '🎯', 10, '{"type": "profile_complete"}'),
  ('Estudante Dedicado', 'Complete 5 estudos', '📚', 50, '{"type": "studies_completed", "count": 5}'),
  ('Mestre do Conhecimento', 'Complete 20 estudos', '🎓', 200, '{"type": "studies_completed", "count": 20}'),
  ('Amigo Fiel', 'Participe de 10 encontros 1:1', '🤝', 100, '{"type": "meetings_attended", "count": 10}'),
  ('Líder em Formação', 'Discipule 3 pessoas', '⭐', 150, '{"type": "disciples", "count": 3}'),
  ('Frequência Exemplar', 'Participe de 10 reuniões gerais', '✨', 100, '{"type": "general_meetings", "count": 10}')
ON CONFLICT DO NOTHING;