import { afterEach, expect, it, vi } from 'vitest';
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession } } }));
import { recoverSession } from '@/lib/session-recovery';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

it('ends stalled session restoration after 10 seconds', async () => {
  vi.useFakeTimers();
  getSession.mockReturnValue(new Promise(() => {}));
  const assertion = expect(recoverSession()).rejects.toThrow('Connection slow');
  await vi.advanceTimersByTimeAsync(10_000);
  await assertion;
});
it('preserves an available signed-in session', async () => {
  const result = { data: { session: { user: { id: 'account-1' } } }, error: null };
  getSession.mockResolvedValue(result);
  expect(await recoverSession()).toEqual(result);
});