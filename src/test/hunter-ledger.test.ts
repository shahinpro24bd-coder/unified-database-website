import { describe, expect, it } from 'vitest';
import { hunterLedgerSchema, ledgerTotals } from '@/lib/hunter-ledger';
const record = { id: '11111111-1111-4111-8111-111111111111', hunter_id: '22222222-2222-4222-8222-222222222222', order_date: '2026-11-21', order_count: 4, payable: 1000, paid: 650, notes: '' };
describe('hunter order and payment ledger', () => {
  it('calculates remaining taka from payable minus paid', () => {
    expect(ledgerTotals([record])).toEqual({ orders: 4, payable: 1000, paid: 650, due: 350 });
  });
  it('sums all hunters without decimal rounding drift', () => {
    expect(ledgerTotals([{ order_count: 2, payable: 0.1, paid: 0 }, { order_count: 3, payable: 0.2, paid: 0.1 }])).toEqual({ orders: 5, payable: 0.3, paid: 0.1, due: 0.2 });
  });
  it('rejects payments larger than the total payable', () => {
    expect(hunterLedgerSchema.safeParse({ ...record, paid: 1001 }).success).toBe(false);
  });
  it('rejects negative amounts', () => {
    expect(hunterLedgerSchema.safeParse({ ...record, paid: -1 }).success).toBe(false);
  });
  it('requires whole order counts', () => {
    expect(hunterLedgerSchema.safeParse({ ...record, order_count: 1.5 }).success).toBe(false);
  });
  it('rejects impossible dates', () => {
    expect(hunterLedgerSchema.safeParse({ ...record, order_date: '2026-02-30' }).success).toBe(false);
  });
});