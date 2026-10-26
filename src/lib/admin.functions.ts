// Admin data access runs from the browser against database functions and
// admin-only row policies, so it needs no server secrets and works on any host.
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

type Opts<T = undefined> = T extends undefined ? { signal?: AbortSignal } | void : { data: T; signal?: AbortSignal };

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user.id;
  if (!uid) throw new Error('Please sign in again');
  const { data, error } = await supabase.rpc('has_role', { _user_id: uid, _role: 'admin' });
  if (error || !data) throw new Error('Admin access required');
  return uid;
}

export async function adminDashboard(opts?: Opts) {
  const signal = opts ? opts.signal : undefined;
  const selfId = await requireAdmin();
  let req = supabase.rpc('admin_list_accounts');
  if (signal) req = req.abortSignal(signal);
  const { data: users, error } = await req;
  if (error) throw new Error(error.message);
  const accounts = (users ?? []).map(u => ({ id: u.id, email: u.email, createdAt: u.created_at }));
  const activity: { id: string; user_id: string; added_at: string }[] = [];
  for (let start = 0; ; start += 1000) {
    let q = supabase.from('lead_activity').select('id,user_id,added_at').order('added_at', { ascending: false }).order('id').range(start, start + 999);
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    activity.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { accounts, activity, selfId };
}

export async function removeAccount({ data }: { data: { userId: string } }) {
  const { userId } = z.object({ userId: z.string().uuid() }).parse(data);
  await requireAdmin();
  const { error } = await supabase.rpc('admin_remove_account', { _user_id: userId });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function createAccount({ data }: { data: { email: string; password: string } }) {
  const v = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(data);
  await requireAdmin();
  const { error } = await supabase.rpc('admin_create_account', { _email: v.email, _password: v.password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function accountLeads({ data, signal }: { data: { userId: string }; signal?: AbortSignal }) {
  const { userId } = z.object({ userId: z.string().uuid() }).parse(data);
  await requireAdmin();
  const rows: { id: string; serial: number; phone: string | null; facebook_link: string; verified: boolean; archived: boolean; deleted_at: string | null; created_at: string }[] = [];
  for (let start = 0; ; start += 1000) {
    let q = supabase.from('leads').select('id,serial,phone,facebook_link,verified,archived,deleted_at,created_at').eq('user_id', userId).order('serial', { ascending: false }).range(start, start + 999);
    if (signal) q = q.abortSignal(signal);
    const { data: page, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }
  return rows;
}

export async function allLeads(opts?: Opts) {
  const signal = opts ? opts.signal : undefined;
  await requireAdmin();
  const rows: { id: string; user_id: string; serial: number; phone: string | null; facebook_link: string; verified: boolean; archived: boolean; deleted_at: string | null; created_at: string }[] = [];
  for (let start = 0; ; start += 1000) {
    let q = supabase.from('leads').select('id,user_id,serial,phone,facebook_link,verified,archived,deleted_at,created_at').order('created_at', { ascending: false }).range(start, start + 999);
    if (signal) q = q.abortSignal(signal);
    const { data: page, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }
  return rows;
}

export async function updateAccountLead({ data }: { data: { id: string; action: 'verify' | 'unverify' | 'archive' | 'unarchive' | 'trash' | 'restore' | 'delete' | 'phone'; phone?: string } }) {
  const v = z.object({
    id: z.string().uuid(),
    action: z.enum(['verify', 'unverify', 'archive', 'unarchive', 'trash', 'restore', 'delete', 'phone']),
    phone: z.string().max(50).optional(),
  }).parse(data);
  await requireAdmin();
  const patch = {
    verify: { verified: true }, unverify: { verified: false }, archive: { archived: true }, unarchive: { archived: false },
    trash: { deleted_at: new Date().toISOString() }, restore: { deleted_at: null }, phone: { phone: v.phone || null }, delete: {},
  }[v.action];
  const q = supabase.from('leads');
  const { error } = v.action === 'delete' ? await q.delete().eq('id', v.id) : await q.update(patch).eq('id', v.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
