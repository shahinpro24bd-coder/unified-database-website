import { supabase } from '@/integrations/supabase/client';

export async function accountDestination(userId: string): Promise<'/admin' | '/leads'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve(supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 8000); }),
    ]);
    return result && !result.error && result.data === true ? '/admin' : '/leads';
  } catch {
    return '/leads';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Revoke this device's refresh token, never other devices' sessions.
export function signOutThisDevice() {
  return supabase.auth.signOut({ scope: 'local' });
}