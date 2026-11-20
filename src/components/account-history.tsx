import { useState } from 'react';
import { History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (t: string) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function AccountHistoryButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const week = useQuery({
    queryKey: ['account-week', userId], enabled: open,
    queryFn: async () => { const { data, error } = await supabase.rpc('account_week_history', { _user_id: userId }); if (error) throw error; return data ?? []; },
  });
  const badges = useQuery({
    queryKey: ['account-badges', userId], enabled: open,
    queryFn: async () => { const { data, error } = await supabase.from('badge_history').select('id,badge,rank,started_at,ended_at').eq('user_id', userId).order('started_at', { ascending: false }); if (error) throw error; return data ?? []; },
  });
  const rows = week.data ?? [];
  const totalLeads = rows.reduce((s, r) => s + Number(r.leads_added), 0);
  const totalMsgs = rows.reduce((s, r) => s + Number(r.messages_sent), 0);
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><History className="size-4" /> 7-day history</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Last 7 days</DialogTitle><DialogDescription>Leads added, messages sent and badge history.</DialogDescription></DialogHeader>
        {week.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : week.error ? <p className="text-sm text-destructive">Could not load history.</p> : <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Leads added</p><p className="text-2xl font-semibold tabular-nums">{totalLeads}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Messages sent</p><p className="text-2xl font-semibold tabular-nums">{totalMsgs}</p></div>
          </div>
          <table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Date</th><th className="text-right">Leads</th><th className="text-right">Messages</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.day} className="border-b"><td className="py-2">{fmtDay(r.day)}</td><td className="text-right tabular-nums">{Number(r.leads_added)}</td><td className="text-right tabular-nums">{Number(r.messages_sent)}</td></tr>)}</tbody></table>
        </>}
        <h3 className="mt-2 font-semibold">Badges</h3>
        {badges.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (badges.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No badges yet.</p> :
          <ul className="space-y-2">{(badges.data ?? []).map(b => <li key={b.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{b.badge === 'best_hunter' ? 'Best Hunter' : `No.${b.rank} Client Hunter`}</span><span className={b.ended_at ? 'text-muted-foreground' : 'text-primary'}>{b.ended_at ? 'Lost' : 'Current'}</span></div>
            <p className="text-muted-foreground">{fmtTime(b.started_at)} → {b.ended_at ? fmtTime(b.ended_at) : 'now'}</p>
          </li>)}</ul>}
        <p className="text-xs text-muted-foreground">Badge history is recorded from today onward; earlier tag changes were not saved.</p>
      </DialogContent>
    </Dialog>
  </>;
}
