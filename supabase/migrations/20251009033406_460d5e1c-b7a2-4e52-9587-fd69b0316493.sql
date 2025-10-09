-- Configure cron job to run notification generator every hour
-- This will automatically check for upcoming meetings and inactive members

-- First, enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the notification generator to run every hour
SELECT cron.schedule(
  'generate-notifications-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://yzeekoxgykzjzjprrmnl.supabase.co/functions/v1/notification-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZWVrb3hneWt6anpqcHJybW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODk4MzAsImV4cCI6MjA3MDM2NTgzMH0.Vgq6rkX3ycJwFal9BFGXZWCLoi-SeEsgLTc5ygmG5qQ"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler for automatic notification generation';
