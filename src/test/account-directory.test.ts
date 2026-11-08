import { describe, expect, it } from 'vitest';
import { directoryAccounts } from '@/lib/account-directory';

const accounts = [
  { id: 'ordinary', email: 'alpha@example.com', paused: false, removedAt: null, bestHunter: false },
  { id: 'hunter', email: 'zeta@example.com', paused: false, removedAt: null, bestHunter: true },
  { id: 'removed', email: 'old@example.com', paused: true, removedAt: '2026-11-08T14:00:00Z', bestHunter: true },
];
describe('Account directory rules', () => {
  it('hides removed profiles from the main list', () => {
    expect(directoryAccounts(accounts, false).map(a => a.id)).not.toContain('removed');
  });
  it('preserves removed profiles in their folder', () => {
    expect(directoryAccounts(accounts, true).map(a => a.id)).toEqual(['removed']);
  });
  it('always puts Best Hunters before ordinary accounts', () => {
    expect(directoryAccounts(accounts, false).map(a => a.id)).toEqual(['hunter', 'ordinary']);
  });
});