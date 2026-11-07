ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS message_sent_at timestamptz;
COMMENT ON COLUMN public.leads.message_sent_at IS 'Time the verified tick was assigned as message sent; older checked leads have unknown sent dates.';
CREATE OR REPLACE FUNCTION public.track_lead_message_sent() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.message_sent_at := CASE WHEN NEW.verified THEN now() ELSE NULL END;
  ELSIF NEW.verified IS DISTINCT FROM OLD.verified THEN
    NEW.message_sent_at := CASE WHEN NEW.verified THEN now() ELSE NULL END;
  ELSE
    NEW.message_sent_at := OLD.message_sent_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER track_lead_message_sent BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.track_lead_message_sent();
CREATE INDEX IF NOT EXISTS lead_activity_added_at_user_idx ON public.lead_activity(added_at,user_id);
CREATE INDEX IF NOT EXISTS leads_message_sent_at_idx ON public.leads(message_sent_at) WHERE verified;
CREATE OR REPLACE FUNCTION public.admin_daily_lead_counts() RETURNS TABLE(user_id uuid, leads_today bigint, messages_today bigint, messages_total bigint, report_day date) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka';
  day_end timestamptz := day_start + interval '24 hours';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY
  WITH additions AS (
    SELECT a.user_id, count(*) AS total FROM public.lead_activity a WHERE a.added_at >= day_start AND a.added_at < day_end GROUP BY a.user_id
  ), sent AS (
    SELECT l.user_id, count(*) FILTER (WHERE l.message_sent_at >= day_start AND l.message_sent_at < day_end) AS today, count(*) AS total FROM public.leads l WHERE l.verified GROUP BY l.user_id
  )
  SELECT coalesce(a.user_id,s.user_id), coalesce(a.total,0::bigint), coalesce(s.today,0::bigint), coalesce(s.total,0::bigint), (now() AT TIME ZONE 'Asia/Dhaka')::date FROM additions a FULL JOIN sent s ON a.user_id=s.user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_daily_lead_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_daily_lead_counts() TO authenticated, service_role;