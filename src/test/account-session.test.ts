import { afterEach, expect, it, vi } from 'vitest';
const { rpc, signOut } = vi.hoisted(() => ({ rpc: vi.fn(), signOut: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, auth: { signOut } } }));
import { accountDestination, signOutThisDevice } from '@/lib/account-session';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it('keeps other devices signed in when this device logs out', async () => {
  signOut.mockResolvedValue({ error: null });
  await signOutThisDevice();
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('opens leads after 8 seconds if the role request never responds', async () => {
  vi.useFakeTimers();
  rpc.mockReturnValue(new Promise(() => {}));
  const destination = accountDestination('u1');
  await vi.advanceTimersByTimeAsync(8000);
  expect(await destination).toBe('/leads');
});
it('opens leads when role lookup fails instead of trapping a signed-in account', async () => {
  rpc.mockRejectedValue(new Error('Network unavailable'));
  expect(await accountDestination('u1')).toBe('/leads');
});