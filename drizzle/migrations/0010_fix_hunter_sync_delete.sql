CREATE OR REPLACE FUNCTION public.sync_hunter_badges()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _ranks(user_id uuid, rank int) ON COMMIT DROP;
  DELETE FROM _ranks WHERE true;
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
END; $function$;