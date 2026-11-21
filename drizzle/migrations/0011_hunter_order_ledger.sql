CREATE TABLE public.hunter_order_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 hunter_id uuid NOT NULL,
 order_date date NOT NULL,
 order_count integer NOT NULL DEFAULT 0 CHECK (order_count >= 0),
 payable numeric(14,2) NOT NULL DEFAULT 0 CHECK (payable >= 0),
 paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid >= 0 AND paid <= payable),
 due numeric(14,2) GENERATED ALWAYS AS (payable - paid) STORED,
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hunter_order_ledger TO authenticated;
GRANT ALL ON public.hunter_order_ledger TO service_role;
ALTER TABLE public.hunter_order_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_admin_only ON public.hunter_order_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND NOT public.account_is_paused(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND NOT public.account_is_paused(auth.uid()));
CREATE INDEX hunter_order_ledger_date_idx ON public.hunter_order_ledger (order_date DESC, id);
CREATE INDEX hunter_order_ledger_hunter_idx ON public.hunter_order_ledger (hunter_id);