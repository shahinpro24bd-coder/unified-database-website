import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'me' } } } }) },
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));
import { adminDashboard, removeAccount } from '@/lib/admin.functions';

const OTHER = '11111111-1111-4111-8111-111111111111';
describe('Admin account permissions', () => {
  beforeEach(() => rpc.mockReset());
  it('denies dashboard data to a non-admin account', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(adminDashboard()).rejects.toThrow('Admin access required');
  });
  it('denies account removal to a non-admin account', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(removeAccount({ data: { userId: OTHER } })).rejects.toThrow('Admin access required');
    expect(rpc).not.toHaveBeenCalledWith('admin_remove_account', expect.anything());
  });
  it('allows an admin to remove an ordinary account', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: null });
    await expect(removeAccount({ data: { userId: OTHER } })).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('admin_remove_account', { _user_id: OTHER });
  });
});
