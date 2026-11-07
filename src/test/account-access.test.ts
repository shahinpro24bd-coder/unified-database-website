import { expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { assertAccountActive } from '@/lib/account-access';
it('blocks a paused account even with a valid signed-in identity', async () => {
  rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: true, error: null }) });
  await expect(assertAccountActive('member')).rejects.toThrow('Apnake Team Shahin theke ber kore dewa hoyeche');
});
it('restores access when the account is resumed', async () => {
  rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: false, error: null }) });
  await expect(assertAccountActive('member')).resolves.toBeUndefined();
});
it('does not assume access is allowed when its check fails', async () => {
  rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: null, error: { message: 'Connection unavailable' } }) });
  await expect(assertAccountActive('member')).rejects.toThrow('Connection unavailable');
});