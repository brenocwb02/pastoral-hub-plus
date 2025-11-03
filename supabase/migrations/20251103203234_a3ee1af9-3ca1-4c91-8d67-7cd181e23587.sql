-- Sistema de Mensagens
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para mensagens
CREATE POLICY "Users can view messages they sent or received"
ON public.messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  (sender_id = auth.uid() OR recipient_id = auth.uid())
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  sender_id = auth.uid()
);

CREATE POLICY "Users can update their own sent messages"
ON public.messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  sender_id = auth.uid()
);

CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  recipient_id = auth.uid()
);

-- Trigger para updated_at
CREATE TRIGGER set_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger de auditoria
CREATE TRIGGER audit_messages
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- LGPD Compliance Tables
CREATE TYPE public.consent_type AS ENUM ('data_processing', 'marketing', 'data_sharing');
CREATE TYPE public.data_request_type AS ENUM ('export', 'delete');
CREATE TYPE public.data_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

CREATE TABLE public.data_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type data_request_type NOT NULL,
  status data_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies para consentimentos
CREATE POLICY "Users can view their own consents"
ON public.user_consents
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Users can manage their own consents"
ON public.user_consents
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- RLS Policies para solicitações de dados
CREATE POLICY "Users can view their own data requests"
ON public.data_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Users can create data requests"
ON public.data_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

CREATE POLICY "Pastors can view and process all data requests"
ON public.data_requests
FOR ALL
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'pastor'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'pastor'::app_role)
);

-- Triggers
CREATE TRIGGER set_user_consents_updated_at
BEFORE UPDATE ON public.user_consents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_data_requests_updated_at
BEFORE UPDATE ON public.data_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_user_consents
AFTER INSERT OR UPDATE OR DELETE ON public.user_consents
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_data_requests
AFTER INSERT OR UPDATE OR DELETE ON public.data_requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();