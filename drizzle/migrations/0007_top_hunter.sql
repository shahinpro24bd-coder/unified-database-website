CREATE OR REPLACE FUNCTION public.top_hunter_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.user_id FROM public.leads l
  LEFT JOIN public.account_access a ON a.user_id = l.user_id
  WHERE l.deleted_at IS NULL AND a.removed_at IS NULL AND COALESCE(a.paused, false) = false
    AND NOT public.has_role(l.user_id, 'admin')
    AND auth.uid() IS NOT NULL
  GROUP BY l.user_id
  ORDER BY count(*) DESC, max(l.created_at) ASC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.top_hunter_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.top_hunter_id() TO authenticated;

CREATE TABLE public.top_hunter_ack (
  user_id uuid PRIMARY KEY,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.top_hunter_ack TO authenticated;
GRANT ALL ON public.top_hunter_ack TO service_role;
ALTER TABLE public.top_hunter_ack ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ack read" ON public.top_hunter_ack FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own ack insert" ON public.top_hunter_ack FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());