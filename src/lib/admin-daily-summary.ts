export type DailyAccountCount = {
  user_id: string;
  leads_today: number;
  messages_today: number;
  messages_total: number;
  report_day: string;
};

export function dailyTotals(rows: DailyAccountCount[]) {
  return rows.reduce((total, row) => ({
    leads: total.leads + Number(row.leads_today),
    messages: total.messages + Number(row.messages_today),
    sentTotal: total.sentTotal + Number(row.messages_total),
    activeAccounts: total.activeAccounts + (Number(row.leads_today) > 0 || Number(row.messages_today) > 0 ? 1 : 0),
  }), { leads: 0, messages: 0, sentTotal: 0, activeAccounts: 0 });
}