-- Socle minimal imitant un projet Supabase hébergé (rôles, schémas auth et storage).
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE ROLE supabase_storage_admin NOLOGIN;
-- « postgres » de Supabase hébergé : pas super-utilisateur, mais BYPASSRLS et CREATEROLE.
CREATE ROLE migrator LOGIN CREATEROLE BYPASSRLS;
GRANT anon, authenticated, service_role TO migrator;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE, CREATE ON SCHEMA public TO migrator;
ALTER SCHEMA public OWNER TO migrator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- Privilèges par défaut de Supabase : tout est accordé, la sécurité repose sur RLS.
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE migrator IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
SET ROLE supabase_auth_admin;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, banned_until timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE auth.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz DEFAULT now());
CREATE TABLE auth.refresh_tokens (id bigserial PRIMARY KEY, token text, user_id varchar(255), session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
RESET ROLE;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, migrator;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role, migrator;
-- Hypothèse : « postgres » garde les droits de lecture/écriture sur les tables auth (pas de DDL).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO migrator;

CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
SET ROLE supabase_storage_admin;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text, owner uuid, created_at timestamptz DEFAULT now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
RESET ROLE;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role, migrator;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role, migrator;
-- Comme sur Supabase, « postgres » peut créer des politiques sur storage.objects.
ALTER TABLE storage.objects OWNER TO migrator;
