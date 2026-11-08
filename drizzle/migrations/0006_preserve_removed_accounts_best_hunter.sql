ALTER TABLE public.account_access ADD COLUMN removed_at timestamptz;
ALTER TABLE public.account_access ADD COLUMN best_hunter boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.account_access.removed_at IS 'Soft removal preserves account identity and leads for admin folder access.';
CREATE OR REPLACE FUNCTION public.account_is_paused(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT paused OR removed_at IS NOT NULL FROM public.account_access WHERE user_id=_user_id),false) $$;
CREATE OR REPLACE FUNCTION public.admin_remove_account(_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin') THEN RAISE EXCEPTION 'Admin accounts cannot be removed here'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'Account not found'; END IF;
 INSERT INTO public.account_access(user_id,paused,removed_at,changed_at) VALUES(_user_id,true,now(),now()) ON CONFLICT(user_id) DO UPDATE SET paused=true,removed_at=coalesce(account_access.removed_at,EXCLUDED.removed_at),changed_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.admin_remove_account(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_account(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_set_best_hunter(_user_id uuid,_best_hunter boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'Account not found'; END IF;
 INSERT INTO public.account_access(user_id,best_hunter,changed_at) VALUES(_user_id,_best_hunter,now()) ON CONFLICT(user_id) DO UPDATE SET best_hunter=EXCLUDED.best_hunter,changed_at=now();
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_best_hunter(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_best_hunter(uuid,boolean) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_set_account_paused(_user_id uuid,_paused boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF _user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin') THEN RAISE EXCEPTION 'Admin accounts cannot be paused'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id) THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_access WHERE user_id=_user_id AND removed_at IS NOT NULL) THEN RAISE EXCEPTION 'Removed accounts cannot be resumed'; END IF;
 INSERT INTO public.account_access(user_id,paused,changed_at) VALUES(_user_id,_paused,now()) ON CONFLICT(user_id) DO UPDATE SET paused=EXCLUDED.paused,changed_at=now();
END; $$;