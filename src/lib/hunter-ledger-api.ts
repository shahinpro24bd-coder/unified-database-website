import { supabase } from '@/integrations/supabase/client';
import { hunterLedgerSchema, type HunterLedgerInput } from '@/lib/hunter-ledger';
import type { Tables } from '@/integrations/supabase/types';

export async function readHunterLedger(signal: AbortSignal) {
  const rows: Tables<'hunter_order_ledger'>[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from('hunter_order_ledger').select('*').order('order_date', { ascending: false }).order('id').range(start, start + 999).abortSignal(signal);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
export async function saveHunterLedger(input: HunterLedgerInput, editing: boolean, signal: AbortSignal) {
  const value = hunterLedgerSchema.parse(input);
  const request = editing ? supabase.from('hunter_order_ledger').update(value).eq('id', value.id) : supabase.from('hunter_order_ledger').insert(value);
  const { data, error } = await request.select('id').abortSignal(signal).single();
  if (error) throw error;
  return data;
}
export async function deleteHunterLedger(id: string, signal: AbortSignal) {
  const { error } = await supabase.from('hunter_order_ledger').delete().eq('id', id).select('id').abortSignal(signal).single();
  if (error) throw error;
}