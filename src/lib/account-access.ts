import { supabase } from '@/integrations/supabase/client';
import { boundedRequest } from '@/lib/request-recovery';

export const ACCOUNT_PAUSED_MESSAGE = 'Apnake Team Shahin theke ber kore dewa hoyeche';

export async function assertAccountActive(userId: string) {
  const { data, error } = await boundedRequest(s => supabase.rpc('account_is_paused', { _user_id: userId }).abortSignal(s));
  if (error) throw new Error(error.message);
  if (data === true) throw new Error(ACCOUNT_PAUSED_MESSAGE);
}