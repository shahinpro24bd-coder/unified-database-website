import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const adminDashboard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || !allowed) throw new Error('Admin access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const accounts = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      accounts.push(...data.users.map(u => ({ id: u.id, email: u.email ?? 'No email', createdAt: u.created_at })));
      if (data.users.length < 1000) break;
    }
    const activity = [];
    for (let start = 0; ; start += 1000) {
      const { data, error } = await context.supabase.from('lead_activity').select('id,user_id,added_at').order('added_at', { ascending: false }).order('id').range(start, start + 999);
      if (error) throw error;
      activity.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return { accounts, activity, selfId: context.userId };
  });

export const removeAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || !allowed) throw new Error('Admin access required');
    if (data.userId === context.userId) throw new Error('You cannot remove your own admin account');
    const { data: targetAdmin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: data.userId, _role: 'admin' });
    if (roleError || targetAdmin) throw new Error('Admin accounts cannot be removed here');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (deleteError) throw deleteError;
    return { ok: true };
  });
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !allowed) throw new Error('Admin access required');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

export const createAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), password: z.string().min(6) }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const accountLeads = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const { data: page, error } = await admin.from('leads').select('id,serial,phone,facebook_link,verified,archived,deleted_at,created_at').eq('user_id', data.userId).order('serial', { ascending: false }).range(start, start + 999);
      if (error) throw new Error(error.message);
      rows.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    return rows;
  });

export const updateAccountLead = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(['verify', 'unverify', 'archive', 'unarchive', 'trash', 'restore', 'delete', 'phone']),
    phone: z.string().max(50).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const q = admin.from('leads');
    const patch: Record<string, unknown> = {
      verify: { verified: true }, unverify: { verified: false }, archive: { archived: true }, unarchive: { archived: false },
      trash: { deleted_at: new Date().toISOString() }, restore: { deleted_at: null }, phone: { phone: data.phone || null }, delete: {},
    }[data.action];
    const { error } = data.action === 'delete' ? await q.delete().eq('id', data.id) : await q.update(patch as never).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
