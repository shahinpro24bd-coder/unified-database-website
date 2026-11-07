CREATE TABLE public.account_access (user_id uuid PRIMARY KEY, paused boolean NOT NULL DEFAULT false, changed_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.account_access TO authenticated;
GRANT ALL ON public.account_access TO service_role;
ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.account_is_paused(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT paused FROM public.account_access WHERE user_id=_user_id),false) $$;
REVOKE ALL ON FUNCTION public.account_is_paused(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_is_paused(uuid) TO authenticated,service_role;
CREATE POLICY account_access_read ON public.account_access FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.admin_set_account_paused(_user_id uuid,_paused boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') OR public.account_is_paused(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _user_id=auth.uid() OR public.has_role(_user_id,'admin') THEN RAISE EXCEPTION 'Admin accounts cannot be paused'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'Account not found'; END IF;
 INSERT INTO public.account_access(user_id,paused,changed_at) VALUES(_user_id,_paused,now()) ON CONFLICT(user_id) DO UPDATE SET paused=EXCLUDED.paused,changed_at=EXCLUDED.changed_at;
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_account_paused(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_paused(uuid,boolean) TO authenticated,service_role;
CREATE POLICY paused_leads_block ON public.leads AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_is_paused(auth.uid())) WITH CHECK (NOT public.account_is_paused(auth.uid()));
CREATE POLICY paused_roles_block ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_is_paused(auth.uid())) WITH CHECK (NOT public.account_is_paused(auth.uid()));
CREATE POLICY paused_activity_block ON public.lead_activity AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.account_is_paused(auth.uid())) WITH CHECK (NOT public.account_is_paused(auth.uid()));
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT NOT public.account_is_paused(_user_id) AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.collected_leads() RETURNS TABLE(facebook_link text,canonical_link text,created_at timestamptz,mine boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT l.facebook_link,l.canonical_link,l.created_at,(l.user_id=auth.uid()) FROM public.leads l WHERE auth.uid() IS NOT NULL AND NOT public.account_is_paused(auth.uid()) AND l.deleted_at IS NULL AND l.user_id=auth.uid() ORDER BY l.created_at DESC $$;
CREATE OR REPLACE FUNCTION public.previous_version_leads() RETURNS TABLE(id uuid,facebook_link text,created_at timestamptz,serial integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT r.id,r.record->>'facebook_link',(r.record->>'created_at')::timestamptz,(r.record->>'serial')::integer FROM public.lead_import_records r WHERE auth.uid() IS NOT NULL AND NOT public.account_is_paused(auth.uid()) AND (r.record->>'user_id')::uuid=auth.uid() ORDER BY (r.record->>'serial')::integer DESC $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_access;