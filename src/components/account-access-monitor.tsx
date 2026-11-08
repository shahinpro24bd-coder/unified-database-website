import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { recoverSession } from '@/lib/session-recovery';
import { assertAccountActive, ACCOUNT_PAUSED_MESSAGE } from '@/lib/account-access';
import { signOutThisDevice } from '@/lib/account-session';
import { boundedRequest, SESSION_TIMEOUT_MS } from '@/lib/request-recovery';

export function AccountAccessMonitor({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let disposed = false;
    let busy = false;
    let kicked = false;
    let userId: string | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const kick = async () => {
      if (disposed || kicked) return;
      kicked = true;
      setBlocked(true);
      await qc.cancelQueries();
      qc.clear();
      try { await boundedRequest(() => signOutThisDevice(), SESSION_TIMEOUT_MS); } catch { /* Data access is already blocked by database rules. */ }
      if (!disposed) { await router.navigate({ to: '/auth', search: { paused: true }, replace: true }); setBlocked(false); }
    };
    const check = async () => {
      if (busy || disposed || kicked) return;
      busy = true;
      try {
        const { data } = await recoverSession();
        const id = data.session?.user.id;
        if (id !== userId) {
          if (channel) { supabase.removeChannel(channel); channel = undefined; }
          userId = id;
          if (id) channel = supabase.channel(`account-access-${crypto.randomUUID()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'account_access', filter: `user_id=eq.${id}` }, payload => {
              if (('paused' in payload.new && payload.new['paused'] === true) || ('removed_at' in payload.new && payload.new['removed_at'])) void kick();
            }).subscribe();
        }
        if (id) await assertAccountActive(id);
      } catch (error) {
        if (error instanceof Error && error.message === ACCOUNT_PAUSED_MESSAGE) await kick();
      } finally { busy = false; }
    };
    void check();
    const timer = setInterval(() => { void check(); }, 15_000);
    const onFocus = () => { if (!document.hidden) void check(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onFocus);
    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      setTimeout(() => {
        if (disposed) return;
        if (event === 'SIGNED_IN') { kicked = false; setBlocked(false); }
        void check();
      }, 0);
    });
    return () => { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('online', onFocus); listener.subscription.unsubscribe(); if (channel) supabase.removeChannel(channel); };
  }, [qc, router]);
  return blocked ? <div className="min-h-screen bg-background px-5 py-16 text-center"><p role="alert" className="text-destructive">{ACCOUNT_PAUSED_MESSAGE}</p></div> : children;
}