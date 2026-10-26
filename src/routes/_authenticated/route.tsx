import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { recoverSession } from "@/lib/session-recovery";
import { boundedRequest, SESSION_TIMEOUT_MS } from "@/lib/request-recovery";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Check the locally stored session first — it needs no network call. Calling
    // the auth server on every page load made /leads hang or bounce to /auth
    // whenever the internet was slow or flaky.
    const { data: sessionData } = await recoverSession();
    if (sessionData.session) return { user: sessionData.session.user };
    const { data, error } = await boundedRequest(() => supabase.auth.getUser(), SESSION_TIMEOUT_MS);
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
