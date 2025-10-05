-- FASE 3.2: Sistema de Auditoria e Políticas Atualizadas

-- Criar tabela de auditoria para rastrear todas as mudanças
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas pastores podem ver logs de auditoria
CREATE POLICY "Pastors can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'pastor'::app_role));

-- Criar índices para melhor performance
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON public.audit_logs(changed_by);

-- Função genérica para auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Adicionar triggers de auditoria nas tabelas principais
CREATE TRIGGER audit_membros_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.membros
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_casas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.casas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_encontros_1a1_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.encontros_1a1
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_reunioes_gerais_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reunioes_gerais
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Atualizar políticas RLS para incluir lider_casa

-- Política atualizada: Líderes de casa podem ver membros de sua casa
DROP POLICY IF EXISTS "Membros read: pastors all; own disciples or self only" ON public.membros;
CREATE POLICY "Membros read: pastors, leaders, disciples, self"
ON public.membros
FOR SELECT
USING (
  has_role(auth.uid(), 'pastor'::app_role) OR
  (discipulador_id = auth.uid()) OR
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.casas
    WHERE casas.id = membros.casa_id
    AND casas.leader_id = auth.uid()
  ))
);

-- Política atualizada: Líderes de casa podem atualizar membros de sua casa
DROP POLICY IF EXISTS "Membros update: pastors or their discipulador or self" ON public.membros;
CREATE POLICY "Membros update: pastors, leaders, disciples, self"
ON public.membros
FOR UPDATE
USING (
  has_role(auth.uid(), 'pastor'::app_role) OR
  (discipulador_id = auth.uid()) OR
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.casas
    WHERE casas.id = membros.casa_id
    AND casas.leader_id = auth.uid()
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'pastor'::app_role) OR
  (discipulador_id = auth.uid()) OR
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.casas
    WHERE casas.id = membros.casa_id
    AND casas.leader_id = auth.uid()
  ))
);

-- Política atualizada: Líderes podem ver encontros 1a1 dos membros de sua casa
DROP POLICY IF EXISTS "1a1 read: pastors, discipulador, discipulo" ON public.encontros_1a1;
CREATE POLICY "1a1 read: pastors, leaders, discipuladores, discipulos"
ON public.encontros_1a1
FOR SELECT
USING (
  has_role(auth.uid(), 'pastor'::app_role) OR
  (discipulador_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.membros m
    WHERE m.id = encontros_1a1.discipulo_membro_id
    AND m.user_id = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1 FROM public.membros m
    JOIN public.casas c ON c.id = m.casa_id
    WHERE m.id = encontros_1a1.discipulo_membro_id
    AND c.leader_id = auth.uid()
  ))
);

-- Atualizar política de casas: líderes podem atualizar suas próprias casas
DROP POLICY IF EXISTS "Casas update by pastors or leaders" ON public.casas;
CREATE POLICY "Casas update by pastors or leaders"
ON public.casas
FOR UPDATE
USING (
  has_role(auth.uid(), 'pastor'::app_role) OR
  (leader_id = auth.uid())
);

-- Comentários sobre as mudanças
COMMENT ON TABLE public.audit_logs IS 'Registra todas as alterações em tabelas importantes para auditoria e rastreamento';
COMMENT ON FUNCTION public.audit_trigger_func() IS 'Função genérica que registra INSERT, UPDATE e DELETE em audit_logs';