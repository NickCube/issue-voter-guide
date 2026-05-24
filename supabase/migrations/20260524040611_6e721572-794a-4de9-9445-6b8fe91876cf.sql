CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous version of this job
SELECT cron.unschedule('refresh-elections-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-elections-daily');

SELECT cron.schedule(
  'refresh-elections-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1dd9875e-f156-45ef-960a-35964b9ac3ce.lovable.app/api/public/cron/refresh-elections',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluY3J0aXJ3aWxyaXl6bnRxd2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTY1NTgsImV4cCI6MjA5NTEzMjU1OH0.iLREsMaxRpkBQJvBn-SgPjw9Z2kk6BEuuTLyOTaLDmk'
    ),
    body := jsonb_build_object('maxRaces', 10)
  ) AS request_id;
  $$
);