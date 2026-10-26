export const READ_TIMEOUT_MS = 12_000;
export const SESSION_TIMEOUT_MS = 10_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('Connection slow — abar try korun.');
    this.name = 'RequestTimeoutError';
  }
}

// Deadline covers storage/auth waits too; abort also stops compatible HTTP reads.
export async function boundedRequest<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = READ_TIMEOUT_MS,
  parentSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new RequestTimeoutError());
        controller.abort();
      }, timeoutMs);
      cancel = () => {
        reject(new Error('Request cancelled'));
        controller.abort();
      };
      if (parentSignal?.aborted) cancel();
      else parentSignal?.addEventListener('abort', cancel, { once: true });
    });
    if (parentSignal?.aborted) return await deadline;
    return await Promise.race([Promise.resolve(request(controller.signal)), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (cancel) parentSignal?.removeEventListener('abort', cancel);
  }
}

export function retryRead(failureCount: number, error: unknown) {
  const value = error as { status?: number; code?: string; message?: string } | null;
  if (value?.status === 401 || value?.status === 403 || value?.code === '42501' ||
      /unauthorized|admin access required|session shesh|request cancelled/i.test(value?.message ?? '')) return false;
  return failureCount < 1;
}

export const recoveryQueryOptions = {
  retry: retryRead,
  retryDelay: 1_000,
  staleTime: 30_000,
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
};