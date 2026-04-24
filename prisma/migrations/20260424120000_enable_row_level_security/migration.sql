-- Enable Row Level Security on every ordinary table in public.
-- The app uses Prisma over the Supabase Postgres connection (role bypasses RLS);
-- PostgREST roles (anon / authenticated) have no policies here, so they cannot read or write these rows.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relispartition
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.relname);
  END LOOP;
END $$;
