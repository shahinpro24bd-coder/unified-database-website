import { supabase } from '@/integrations/supabase/client';
import { boundedRequest, SESSION_TIMEOUT_MS } from './request-recovery';

export function recoverSession() {
  return boundedRequest(() => supabase.auth.getSession(), SESSION_TIMEOUT_MS);
}