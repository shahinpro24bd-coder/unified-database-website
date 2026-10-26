import { afterEach, expect, it, vi } from 'vitest';
import { boundedRequest, RequestTimeoutError, retryRead } from '@/lib/request-recovery';

afterEach(() => vi.useRealTimers());

it('ends a stalled read after 12 seconds and cancels its network request', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const result = boundedRequest(s => { signal = s; return new Promise(() => {}); });
  const assertion = expect(result).rejects.toBeInstanceOf(RequestTimeoutError);
  await vi.advanceTimersByTimeAsync(12_000);
  await assertion;
  expect(signal?.aborted).toBe(true);
});
it('returns successful data without waiting for the deadline', async () => {
  expect(await boundedRequest(async () => ({ id: 'lead-1' }))).toEqual({ id: 'lead-1' });
});
it('cancels reads when their query is cancelled', async () => {
  const parent = new AbortController();
  let signal: AbortSignal | undefined;
  const result = boundedRequest(s => { signal = s; return new Promise(() => {}); }, 12_000, parent.signal);
  const assertion = expect(result).rejects.toThrow('Request cancelled');
  parent.abort();
  await assertion;
  expect(signal?.aborted).toBe(true);
});
it('retries temporary read failures once but does not retry forbidden access', () => {
  expect(retryRead(0, new RequestTimeoutError())).toBe(true);
  expect(retryRead(1, new RequestTimeoutError())).toBe(false);
  expect(retryRead(0, { status: 403 })).toBe(false);
  expect(retryRead(0, new Error('Admin access required'))).toBe(false);
});