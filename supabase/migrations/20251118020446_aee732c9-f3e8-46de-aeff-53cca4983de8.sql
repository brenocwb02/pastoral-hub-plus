-- Remove foreign key constraint on audit_logs that references auth.users
-- This violates Supabase best practices as auth schema shouldn't be referenced directly
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey;

-- The changed_by field will remain as UUID but without FK constraint
-- This is acceptable since we're just tracking who made the change for audit purposes