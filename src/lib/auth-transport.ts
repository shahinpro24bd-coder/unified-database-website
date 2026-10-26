import { createMiddleware } from '@tanstack/react-start';
import { recoverSession } from './session-recovery';

// Project-owned replacement: never let auth storage stall a server-function call.
export const attachSessionWithDeadline = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data, error } = await recoverSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Session shesh hoye geche, abar login korun.');
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);