import { z } from 'zod';

const money = z.number().finite().min(0).max(999999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.01, 'Use at most two decimal places');
export const hunterLedgerSchema = z.object({
  id: z.string().uuid(), hunter_id: z.string().uuid(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Choose a valid date'),
  order_count: z.number().int().min(0).max(2147483647),
  payable: money, paid: money, notes: z.string().trim().max(2000),
}).refine(v => v.paid <= v.payable, { message: 'Dewa taka mot paonar cheye beshi hote parbe na.', path: ['paid'] });
export type HunterLedgerInput = z.infer<typeof hunterLedgerSchema>;
export function ledgerTotals(rows: { order_count: number; payable: number; paid: number }[]) {
  const totals = rows.reduce((sum, r) => ({ orders: sum.orders + r.order_count, payable: sum.payable + Math.round(r.payable * 100), paid: sum.paid + Math.round(r.paid * 100) }), { orders: 0, payable: 0, paid: 0 });
  return { orders: totals.orders, payable: totals.payable / 100, paid: totals.paid / 100, due: (totals.payable - totals.paid) / 100 };
}
export function dhakaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}