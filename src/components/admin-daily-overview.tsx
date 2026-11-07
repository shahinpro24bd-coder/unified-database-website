import { useQuery } from '@tanstack/react-query';
import { ListChecks, Send, Users, CheckCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDailyCounts } from '@/lib/admin.functions';
import { dailyTotals } from '@/lib/admin-daily-summary';
import { boundedRequest, recoveryQueryOptions } from '@/lib/request-recovery';

export function AdminDailyOverview({ accounts, onOpen }: {
  accounts: { id: string; email: string }[];
  onOpen: (userId: string) => void;
}) {
  const query = useQuery({
    ...recoveryQueryOptions, queryKey: ['admin-daily-counts'],
    queryFn: ({ signal }) => boundedRequest(s => adminDailyCounts({ signal: s }), undefined, signal),
    refetchInterval: 30_000,
  });
  const rows = query.data ?? [];
  const totals = dailyTotals(rows);
  const counts = new Map(rows.map(row => [row.user_id, row]));
  const knownIds = new Set(accounts.map(a => a.id));
  const breakdown = [...accounts, ...rows.filter(row => !knownIds.has(row.user_id)).map(row => ({ id: row.user_id, email: 'Removed account' }))]
    .map(a => ({ ...a, counts: counts.get(a.id) }))
    .sort((a, b) => Number(b.counts?.leads_today ?? 0) - Number(a.counts?.leads_today ?? 0) || Number(b.counts?.messages_today ?? 0) - Number(a.counts?.messages_today ?? 0) || a.email.localeCompare(b.email));
  const reportDay = rows[0]?.report_day;
  const date = reportDay ? new Date(`${reportDay}T12:00:00+06:00`) : new Date();
  const metrics = [
    { label: 'Leads added today', value: totals.leads, icon: ListChecks },
    { label: 'Messages sent today', value: totals.messages, icon: Send },
    { label: 'Active accounts today', value: totals.activeAccounts, icon: Users },
    { label: 'Messages sent · all time', value: totals.sentTotal, icon: CheckCheck },
  ];
  return <div className="mt-8 mb-10" aria-label="Today's team activity">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Today's activity</h2><p className="mt-1 text-sm text-muted-foreground">{date.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric' })} · Bangladesh time</p></div>
      <Button variant="outline" size="icon" aria-label="Refresh today's activity" title="Refresh today's activity" disabled={query.isFetching} onClick={() => query.refetch()}><RotateCcw className={query.isFetching ? 'size-4 animate-spin' : 'size-4'} /></Button>
    </div>
    {query.isError && <p role="status" className="mt-4 text-sm text-destructive">{query.data ? 'Update unavailable. Showing the last counts.' : 'Activity counts could not load. Please retry.'}</p>}
    <div className="daily-metrics mt-5 grid grid-cols-2 gap-y-5 border-y py-6 lg:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 px-4 sm:px-6"><Icon className="mb-3 size-5 text-primary" /><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl font-semibold tabular-nums" aria-label={label}>{query.isPending || (query.isError && !query.data) ? '—' : value.toLocaleString('en-US')}</p></div>)}
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-semibold">Account performance</h3><p className="text-xs text-muted-foreground">✓ Message sent</p></div>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm" aria-label="Today's account performance"><thead><tr><th>Account</th><th className="whitespace-nowrap text-right">Leads today</th><th className="whitespace-nowrap text-right">Sent today</th><th className="whitespace-nowrap text-right">Sent · all time</th></tr></thead><tbody>{breakdown.map(a => <tr key={a.id} className="border-b"><td>{knownIds.has(a.id) ? <Button variant="link" className="h-auto whitespace-nowrap p-0 text-left font-semibold" onClick={() => onOpen(a.id)}>{a.email.split("@")[0]}</Button> : <span className="text-muted-foreground">{a.email}</span>}</td>{[a.counts?.leads_today, a.counts?.messages_today, a.counts?.messages_total].map((value, index) => <td key={index} className="text-right font-medium tabular-nums">{query.isPending || (query.isError && !query.data) ? '—' : Number(value ?? 0).toLocaleString('en-US')}</td>)}</tr>)}</tbody></table></div>
  </div>;
}