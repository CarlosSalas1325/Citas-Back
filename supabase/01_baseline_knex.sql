-- ALREADY APPLIED to the fgcawshhrqlkhkszqnwt project on 2026-08-25. Kept for reference and
-- for any *other* environment bootstrapped the same way. Re-running it is a no-op.
--
-- Context: that database was created from supabase_schema_and_seed.sql instead of by running
-- the knex migrations, so it had no knex bookkeeping at all — knex would have tried to
-- CREATE TABLE businesses again and failed.
--
-- IMPORTANT — the .sql does NOT reproduce every migration. When this was run, the real state
-- was 001..010 applied and 011 NOT applied (appointment_products still had quantity_used).
-- So only 001..010 are baselined here; 011 must run as a normal migration afterwards.
-- Verify with the query at the bottom before trusting this on a different database.
--
-- Usage: run in the Supabase SQL Editor, then `knex migrate:latest --env production`.

BEGIN;

CREATE TABLE IF NOT EXISTS knex_migrations (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255),
  batch          INTEGER,
  migration_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knex_migrations_lock (
  index     SERIAL PRIMARY KEY,
  is_locked INTEGER
);

-- knex expects exactly one lock row.
INSERT INTO knex_migrations_lock (is_locked)
SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM knex_migrations_lock);

-- Guard: only baseline 008 if its column is really there. Marking a migration as applied
-- when it never ran leaves a schema that silently disagrees with the code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION
      'businesses.slug is missing: this database is older than migration 008. Do NOT baseline.';
  END IF;
END $$;

INSERT INTO knex_migrations (name, batch, migration_time)
SELECT m.name, 1, NOW()
FROM (VALUES
  ('001_create_businesses.ts'),
  ('002_create_users.ts'),
  ('003_create_services.ts'),
  ('004_create_products.ts'),
  ('005_create_service_products.ts'),
  ('006_create_appointments.ts'),
  ('007_create_appointment_products.ts'),
  ('008_add_business_slug.ts'),
  ('009_create_portfolio.ts'),
  ('010_create_business_schedules.ts')
) AS m(name)
WHERE NOT EXISTS (SELECT 1 FROM knex_migrations k WHERE k.name = m.name);

-- 011 is intentionally absent above. If a database DOES already have the post-011 shape,
-- baseline it too, otherwise migrate:latest will re-run it and fail on the duplicate column.
INSERT INTO knex_migrations (name, batch, migration_time)
SELECT '011_fix_appointment_products.ts', 1, NOW()
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'appointment_products'
    AND column_name = 'unit_price'
)
AND NOT EXISTS (
  SELECT 1 FROM knex_migrations WHERE name = '011_fix_appointment_products.ts'
);

COMMIT;

SELECT name, batch FROM knex_migrations ORDER BY name;
