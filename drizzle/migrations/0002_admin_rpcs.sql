CREATE POLICY "Admins manage all leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY SELECT u.id, COALESCE(u.email,'No email')::text, u.created_at FROM auth.users u ORDER BY u.created_at;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_account(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin account'; END IF;
  IF public.has_role(_user_id,'admin') THEN RAISE EXCEPTION 'Admin accounts cannot be removed here'; END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_remove_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_account(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_account(_email text, _password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE uid uuid := gen_random_uuid(); em text := lower(btrim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF length(_password) < 6 THEN RAISE EXCEPTION 'Password must be at least 6 characters'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = em) THEN RAISE EXCEPTION 'An account with this email already exists'; END IF;
  INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
  VALUES ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',em,extensions.crypt(_password,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
  INSERT INTO auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  VALUES (gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',em,'email_verified',true),'email',now(),now(),now());
  RETURN uid;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_account(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_account(text,text) TO authenticated;