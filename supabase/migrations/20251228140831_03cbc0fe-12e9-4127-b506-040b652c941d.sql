-- Create trigger to prevent modification of sender_id and recipient_id in messages table
CREATE OR REPLACE FUNCTION public.prevent_message_id_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modification of sender_id and recipient_id
  IF OLD.sender_id IS DISTINCT FROM NEW.sender_id THEN
    RAISE EXCEPTION 'Cannot modify sender_id after message creation';
  END IF;
  
  IF OLD.recipient_id IS DISTINCT FROM NEW.recipient_id THEN
    RAISE EXCEPTION 'Cannot modify recipient_id after message creation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS prevent_message_id_modification_trigger ON public.messages;

CREATE TRIGGER prevent_message_id_modification_trigger
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_message_id_modification();