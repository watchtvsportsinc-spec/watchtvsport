-- Disposable CI fixture ONLY. Never run against a Supabase project.
DO $$ BEGIN IF current_database()<>'wts_review_test' THEN RAISE EXCEPTION 'Disposable test database required'; END IF; END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id));
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb; $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid; $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
CREATE TABLE public.import_items(id uuid PRIMARY KEY);
CREATE TABLE public.events(id uuid PRIMARY KEY);
CREATE TABLE public.data_sources(id uuid PRIMARY KEY);
CREATE TABLE public.broadcasters(id uuid PRIMARY KEY,name text NOT NULL);
CREATE TABLE public.territories(id uuid PRIMARY KEY,name text NOT NULL,code text NOT NULL);
CREATE TABLE public.event_broadcasts(id uuid PRIMARY KEY);
