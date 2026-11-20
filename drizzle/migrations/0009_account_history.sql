CREATE TABLE public.badge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge text NOT NULL,
  rank int,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX badge_history_user_idx ON public.badge_history(user_id, started_at DESC);
GRANT SELECT ON public.badge_history TO authenticated;
GRANT ALL ON public.badge_history TO service_role;
ALTER TABLE public.badge_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY badge_history_read ON public.badge_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.sync_hunter_badges() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _ranks(user_id uuid, rank int) ON COMMIT DROP;
  DELETE FROM _ranks;
  INSERT INTO _ranks
  SELECT l.user_id, (row_number() OVER (ORDER BY count(*) DESC, max(l.created_at) ASC))::int
  FROM public.leads l JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.account_access a ON a.user_id = l.user_id
  WHERE l.deleted_at IS NULL AND a.removed_at IS NULL AND COALESCE(a.paused,false) = false
    AND NOT public.has_role(l.user_id,'admin')
  GROUP BY l.user_id ORDER BY 2 LIMIT 4;
  UPDATE public.badge_history h SET ended_at = now()
  WHERE h.badge = 'top_hunter' AND h.ended_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM _ranks r WHERE r.user_id = h.user_id AND r.rank = h.rank);
  INSERT INTO public.badge_history(user_id, badge, rank)
  SELECT r.user_id, 'top_hunter', r.rank FROM _ranks r
  WHERE NOT EXISTS (SELECT 1 FROM public.badge_history h WHERE h.badge='top_hunter' AND h.ended_at IS NULL AND h.user_id=r.user_id AND h.rank=r.rank);
END; $$;
REVOKE ALL ON FUNCTION public.sync_hunter_badges() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_hunter_badges_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.sync_hunter_badges(); RETURN NULL; END; $$;
CREATE TRIGGER leads_sync_hunter_badges AFTER INSERT OR UPDATE OR DELETE ON public.leads FOR EACH STATEMENT EXECUTE FUNCTION public.sync_hunter_badges_trg();
CREATE TRIGGER access_sync_hunter_badges AFTER INSERT OR UPDATE OR DELETE ON public.account_access FOR EACH STATEMENT EXECUTE FUNCTION public.sync_hunter_badges_trg();

CREATE OR REPLACE FUNCTION public.track_best_hunter_badge() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.best_hunter AND (TG_OP = 'INSERT' OR NOT OLD.best_hunter) THEN
    INSERT INTO public.badge_history(user_id, badge) VALUES (NEW.user_id, 'best_hunter');
  ELSIF NOT NEW.best_hunter AND TG_OP = 'UPDATE' AND OLD.best_hunter THEN
    UPDATE public.badge_history SET ended_at = now() WHERE user_id = NEW.user_id AND badge='best_hunter' AND ended_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER access_best_hunter_badge AFTER INSERT OR UPDATE OF best_hunter ON public.account_access FOR EACH ROW EXECUTE FUNCTION public.track_best_hunter_badge();

INSERT INTO public.badge_history(user_id, badge, started_at)
SELECT user_id, 'best_hunter', changed_at FROM public.account_access WHERE best_hunter;
SELECT public.sync_hunter_badges();

CREATE OR REPLACE FUNCTION public.account_week_history(_user_id uuid)
RETURNS TABLE(day date, leads_added bigint, messages_sent bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = _user_id OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
  WITH days AS (
    SELECT (timezone('Asia/Dhaka', now())::date - g)::date AS d FROM generate_series(0,6) g
  )
  SELECT d.d,
    (SELECT count(*) FROM public.lead_activity a WHERE a.user_id=_user_id AND timezone('Asia/Dhaka', a.added_at)::date = d.d),
    (SELECT count(*) FROM public.leads l WHERE l.user_id=_user_id AND l.verified AND l.message_sent_at IS NOT NULL AND timezone('Asia/Dhaka', l.message_sent_at)::date = d.d)
  FROM days d ORDER BY d.d DESC;
END; $$;
REVOKE ALL ON FUNCTION public.account_week_history(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.account_week_history(uuid) TO authenticated;