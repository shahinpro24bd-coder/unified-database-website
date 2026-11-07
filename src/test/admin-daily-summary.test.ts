import { expect, it } from 'vitest';
import { dailyTotals } from '@/lib/admin-daily-summary';

it('counts today additions across every profile without using all-time sent totals', () => {
  const rows = [
    { user_id: 'a', leads_today: 3, messages_today: 2, messages_total: 10, report_day: '2026-11-07' },
    { user_id: 'b', leads_today: 5, messages_today: 1, messages_total: 20, report_day: '2026-11-07' },
    { user_id: 'c', leads_today: 0, messages_today: 0, messages_total: 100, report_day: '2026-11-07' },
  ];
  expect(dailyTotals(rows)).toEqual({ leads: 8, messages: 3, sentTotal: 130, activeAccounts: 2 });
});

it('shows zero totals when no account has additions or checked leads', () => {
  expect(dailyTotals([])).toEqual({ leads: 0, messages: 0, sentTotal: 0, activeAccounts: 0 });
});