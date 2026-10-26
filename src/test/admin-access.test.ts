import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
const deleteUser = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { auth: { admin: { deleteUser } } } }));
import { adminDashboard, removeAccount } from '@/lib/admin.functions';

// Invoke the handler after replacing the transport, keeping its actual authorization logic.
const dashboardHandler = adminDashboard as unknown as (input: unknown) => Promise<unknown>;
const removeHandler = removeAccount as unknown as (input: unknown) => Promise<unknown>;
describe('Admin account permissions', () => {
  beforeEach(() => deleteUser.mockClear());
  it('denies dashboard data to a non-admin account', async () => {
    await expect(dashboardHandler({ context: { userId: 'ordinary-user', supabase: { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) } } })).rejects.toThrow('Admin access required');
  });
  it('denies account removal to a non-admin account', async () => {
    await expect(removeHandler({ data: { userId: 'other-user' }, context: { userId: 'ordinary-user', supabase: { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) } } })).rejects.toThrow('Admin access required');
    expect(deleteUser).not.toHaveBeenCalled();
  });
  it('allows an admin to remove an ordinary account', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    await expect(removeHandler({ data: { userId: 'ordinary-user' }, context: { userId: 'admin-user', supabase: { rpc } } })).resolves.toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith('ordinary-user');
  });
});