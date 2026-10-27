import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'me' } } } }) },
    rpc: (...a: unknown[]) => rpc(...a),
    from: (...a: unknown[]) => from(...a),
  },
}));
import { adminDashboard, removeAccount, allLeads, accountEmail } from '@/lib/admin.functions';

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
  it('denies the all-leads view to a non-admin account', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(allLeads()).rejects.toThrow('Admin access required');
    expect(from).not.toHaveBeenCalled();
  });
  it('denies another account\'s workspace details to a non-admin account', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(accountEmail({ data: { userId: OTHER } })).rejects.toThrow('Admin access required');
    expect(rpc).not.toHaveBeenCalledWith('admin_list_accounts');
  });
  it('names the account whose workspace an admin is opening', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ id: OTHER, email: 'member@example.com', created_at: new Date().toISOString() }], error: null });
    await expect(accountEmail({ data: { userId: OTHER } })).resolves.toBe('member@example.com');
  });
  it('loads every lead across all accounts for an admin', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `l${i}`, user_id: OTHER, serial: i, phone: null, facebook_link: 'https://facebook.com/x', verified: false, archived: false, deleted_at: null, created_at: new Date().toISOString() }));
    const page2 = [{ ...page1[0], id: 'last', serial: 1000 }];
    let call = 0;
    from.mockImplementation(() => {
      const builder = {
        select: () => builder,
        order: () => builder,
        range: () => Promise.resolve({ data: call++ === 0 ? page1 : page2, error: null }),
      };
      return builder;
    });
    const rows = await allLeads();
    expect(rows).toHaveLength(1001);
    expect(rows[1000]!.id).toBe('last');
    expect(from).toHaveBeenCalledTimes(2);
  });
});
