CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  serial INTEGER NOT NULL,
  phone TEXT,
  facebook_link TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  canonical_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leads_user_serial_idx ON public.leads (user_id, serial);
CREATE INDEX leads_user_created_idx ON public.leads (user_id, created_at DESC);
CREATE UNIQUE INDEX leads_user_phone_idx ON public.leads (user_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX leads_user_archived_idx ON public.leads (user_id, archived);
CREATE INDEX leads_deleted_at_idx ON public.leads (deleted_at);
CREATE UNIQUE INDEX leads_canonical_link_global_unique ON public.leads (canonical_link);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own leads" ON public.leads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_lead_serial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.serial IS NULL OR NEW.serial = 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
    SELECT COALESCE(MAX(serial), 0) + 1 INTO NEW.serial FROM public.leads WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER leads_set_serial BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_lead_serial();
REVOKE EXECUTE ON FUNCTION public.set_lead_serial() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.canonical_facebook_link(input_link text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = public AS $$
DECLARE normalized text; profile_id text;
BEGIN
  normalized := lower(btrim(input_link));
  normalized := regexp_replace(normalized, '[[:space:]]+', '', 'g');
  normalized := regexp_replace(normalized, '^https?://', '', 'i');
  normalized := regexp_replace(normalized, '^(www\.|m\.|mbasic\.|web\.|mobile\.)', '', 'i');
  normalized := regexp_replace(normalized, '^fb\.com/', 'facebook.com/', 'i');
  normalized := regexp_replace(normalized, '^facebook\.com/', '', 'i');
  normalized := regexp_replace(normalized, '#.*$', '');
  IF normalized ~ '^profile\.php\?' THEN
    profile_id := substring(normalized FROM '(?:^|[?&])id=([0-9]+)');
    IF profile_id IS NOT NULL THEN RETURN 'profile:' || profile_id; END IF;
  END IF;
  IF normalized ~ '^people/[^/]+/[0-9]+/?(?:[?#].*)?$' THEN
    profile_id := substring(normalized FROM '^people/[^/]+/([0-9]+)');
    IF profile_id IS NOT NULL THEN RETURN 'profile:' || profile_id; END IF;
  END IF;
  normalized := regexp_replace(normalized, '\?.*$', '');
  normalized := regexp_replace(normalized, '/+$', '');
  RETURN normalized;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_lead_canonical_link()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.facebook_link := btrim(NEW.facebook_link);
  NEW.canonical_link := public.canonical_facebook_link(NEW.facebook_link);
  RETURN NEW;
END;
$$;
CREATE TRIGGER leads_set_canonical_link BEFORE INSERT OR UPDATE OF facebook_link, canonical_link ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_lead_canonical_link();
REVOKE EXECUTE ON FUNCTION public.canonical_facebook_link(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.canonical_facebook_link(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_lead_canonical_link() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.collected_leads()
RETURNS TABLE (facebook_link text, canonical_link text, created_at timestamptz, mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.facebook_link, l.canonical_link, l.created_at, (l.user_id = auth.uid()) AS mine
  FROM public.leads l WHERE auth.uid() IS NOT NULL AND l.deleted_at IS NULL AND l.user_id = auth.uid()
  ORDER BY l.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.collected_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collected_leads() TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_old_trash()
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  DELETE FROM public.leads WHERE user_id = auth.uid() AND deleted_at < now() - interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.purge_old_trash() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_old_trash() TO authenticated;

CREATE TABLE public.lead_import_records (
  id uuid PRIMARY KEY,
  source_file text NOT NULL,
  record jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_import_records TO service_role;
ALTER TABLE public.lead_import_records ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_own_roles ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;

CREATE TABLE public.lead_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, lead_id uuid NOT NULL, added_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.lead_activity TO authenticated;
GRANT ALL ON public.lead_activity TO service_role;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_activity_read ON public.lead_activity FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.record_lead_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lead_import_records WHERE id = NEW.id) THEN
    INSERT INTO public.lead_activity(user_id,lead_id,added_at) VALUES(NEW.user_id,NEW.id,NEW.created_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER leads_record_activity AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.record_lead_activity();

-- Each account sees only its OWN previous-version leads
CREATE FUNCTION public.previous_version_leads() RETURNS TABLE(id uuid,facebook_link text,created_at timestamptz,serial integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT r.id, r.record->>'facebook_link', (r.record->>'created_at')::timestamptz, (r.record->>'serial')::integer
  FROM public.lead_import_records r
  WHERE auth.uid() IS NOT NULL AND (r.record->>'user_id')::uuid = auth.uid()
  ORDER BY (r.record->>'serial')::integer DESC
$$;
REVOKE ALL ON FUNCTION public.previous_version_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.previous_version_leads() TO authenticated;