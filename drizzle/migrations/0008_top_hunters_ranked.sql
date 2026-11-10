CREATE OR REPLACE FUNCTION public.top_hunters()
RETURNS TABLE(user_id uuid, rank int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.user_id, (row_number() OVER (ORDER BY count(*) DESC, max(l.created_at) ASC))::int
  FROM public.leads l
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.account_access a ON a.user_id = l.user_id
  WHERE l.deleted_at IS NULL AND a.removed_at IS NULL AND COALESCE(a.paused, false) = false
    AND NOT public.has_role(l.user_id, 'admin') AND auth.uid() IS NOT NULL
  GROUP BY l.user_id
  ORDER BY 2
  LIMIT 4
$$;
REVOKE ALL ON FUNCTION public.top_hunters() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.top_hunters() TO authenticated;
CREATE OR REPLACE FUNCTION public.top_hunter_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.top_hunters() WHERE rank = 1
$$;