import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { boundedRequest, recoveryQueryOptions } from '@/lib/request-recovery';
import { dhakaToday, hunterLedgerSchema, ledgerTotals, type HunterLedgerInput } from '@/lib/hunter-ledger';
import { deleteHunterLedger, readHunterLedger, saveHunterLedger } from '@/lib/hunter-ledger-api';
import type { DirectoryAccount } from '@/lib/account-directory';

const taka = (v: number) => `৳${v.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const dateLabel = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export function AdminHunterLedger({ accounts, selfId }: { accounts: DirectoryAccount[]; selfId: string }) {
  const qc = useQueryClient();
  const [hunter, setHunter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<HunterLedgerInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const q = useQuery({ ...recoveryQueryOptions, queryKey: ['hunter-ledger'], queryFn: ({ signal }) => boundedRequest(readHunterLedger, undefined, signal) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['hunter-ledger'] });
  const save = useMutation({ retry: false, mutationFn: (value: HunterLedgerInput) => boundedRequest(signal => saveHunterLedger(value, editing, signal)), onSuccess: () => { setDraft(null); setError(''); refresh(); toast.success('Hisab save hoyeche.'); }, onError: (e: Error) => setError(e.message) });
  const remove = useMutation({ retry: false, mutationFn: (id: string) => boundedRequest(signal => deleteHunterLedger(id, signal)), onSuccess: () => { refresh(); toast.success('Hisab delete hoyeche.'); }, onError: (e: Error) => toast.error(e.message) });
  const rows = (q.data ?? []).filter(r => (hunter === 'all' || r.hunter_id === hunter) && (!from || r.order_date >= from) && (!to || r.order_date <= to));
  const totals = ledgerTotals(rows);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1));
  const choices = accounts.filter(a => a.id !== selfId).sort((a, b) => Number(Boolean(a.removedAt)) - Number(Boolean(b.removedAt)) || a.email.localeCompare(b.email));
  const name = (id: string) => accounts.find(a => a.id === id)?.email.split('@')[0] ?? 'Unknown hunter';
  const startNew = () => { setEditing(false); setError(''); setDraft({ id: crypto.randomUUID(), hunter_id: hunter === 'all' ? '' : hunter, order_date: dhakaToday(), order_count: 1, payable: 0, paid: 0, notes: '' }); };
  const update = (patch: Partial<HunterLedgerInput>) => setDraft(v => v ? { ...v, ...patch } : v);
  return <section id="hunter-ledger" className="mb-10 border-b pb-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Hunter order & payment</h2><div className="flex gap-2"><Button variant="ghost" size="icon" title="Refresh hisab" aria-label="Refresh hisab" onClick={() => q.refetch()}><RotateCcw className="size-4" /></Button><Button onClick={startNew}><Plus className="size-4" /> Add record</Button></div></div>
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-60"><p className="mb-1 text-xs text-muted-foreground">Client hunter</p><Select value={hunter} onValueChange={v => { setHunter(v); setPage(0); }}><SelectTrigger aria-label="Filter hunter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All hunters</SelectItem>{choices.map(a => <SelectItem key={a.id} value={a.id}>{name(a.id)}{a.removedAt ? ' · Removed' : ''}</SelectItem>)}</SelectContent></Select></div>
      <label className="text-xs text-muted-foreground">From<Input aria-label="From date" className="mt-1 w-40" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} /></label>
      <label className="text-xs text-muted-foreground">To<Input aria-label="To date" className="mt-1 w-40" type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setPage(0); }} /></label>
      {(hunter !== 'all' || from || to) && <Button variant="ghost" size="icon" title="Clear filters" aria-label="Clear filters" onClick={() => { setHunter('all'); setFrom(''); setTo(''); setPage(0); }}><X className="size-4" /></Button>}
    </div>
    <div className="mb-5 grid grid-cols-2 gap-5 border-y py-5 sm:grid-cols-4">{[['Orders', String(totals.orders)], ['Total payable', taka(totals.payable)], ['Paid', taka(totals.paid)], ['Remaining', taka(totals.due)]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-xl font-semibold tabular-nums">{value}</p></div>)}</div>
    {q.isError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3"><p className="text-sm text-destructive">{q.data ? 'Update hoyni; ager hisab dekhano hocche.' : 'Hisab load hoyni.'}</p><Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button></div>}
    {q.isPending ? <p className="py-8 text-muted-foreground">Loading…</p> : <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3 pr-4">Date</th><th className="pr-4">Hunter</th><th className="pr-4 text-right">Orders</th><th className="pr-4 text-right">Payable</th><th className="pr-4 text-right">Paid</th><th className="pr-4 text-right">Remaining</th><th className="pr-4">Notes</th><th /></tr></thead><tbody>{rows.slice(currentPage * 20, currentPage * 20 + 20).map(r => <tr key={r.id} className="border-b"><td className="whitespace-nowrap py-4 pr-4">{dateLabel(r.order_date)}</td><td className="whitespace-nowrap pr-4 font-medium">{name(r.hunter_id)}</td><td className="pr-4 text-right tabular-nums">{r.order_count}</td><td className="whitespace-nowrap pr-4 text-right tabular-nums">{taka(r.payable)}</td><td className="whitespace-nowrap pr-4 text-right tabular-nums">{taka(r.paid)}</td><td className="whitespace-nowrap pr-4 text-right font-semibold tabular-nums text-primary">{taka(r.due ?? r.payable - r.paid)}</td><td className="min-w-32 max-w-64 break-words pr-4">{r.notes || '—'}</td><td><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit record ${r.id}`} title="Edit record" onClick={() => { setDraft({ id: r.id, hunter_id: r.hunter_id, order_date: r.order_date, order_count: r.order_count, payable: r.payable, paid: r.paid, notes: r.notes }); setEditing(true); setError(''); }}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete record ${r.id}`} title="Delete record" disabled={remove.isPending} onClick={() => { if (window.confirm('Ei order o payment hisab delete korben?')) remove.mutate(r.id); }}><Trash2 className="size-4 text-destructive" /></Button></div></td></tr>)}</tbody></table></div>{rows.length === 0 && !q.isError && <p className="py-8 text-sm text-muted-foreground">No records found.</p>}{rows.length > 20 && <div className="mt-4 flex items-center justify-end gap-3"><span className="text-sm text-muted-foreground">{currentPage + 1} / {Math.ceil(rows.length / 20)}</span><Button variant="outline" size="icon" aria-label="Previous records" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next records" disabled={(currentPage + 1) * 20 >= rows.length} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div>}</>}
    <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !save.isPending) setDraft(null); }}><DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? 'Edit record' : 'Add order & payment'}</DialogTitle></DialogHeader>{draft && <form className="space-y-4" onSubmit={e => { e.preventDefault(); const result = hunterLedgerSchema.safeParse(draft); if (!result.success) { setError(result.error.issues[0]?.message ?? 'Hisab check korun.'); return; } setError(''); save.mutate(result.data); }}>
      <div><p className="mb-1 text-sm">Client hunter</p><Select value={draft.hunter_id} onValueChange={v => update({ hunter_id: v })}><SelectTrigger aria-label="Record hunter"><SelectValue placeholder="Choose hunter" /></SelectTrigger><SelectContent>{choices.map(a => <SelectItem key={a.id} value={a.id}>{name(a.id)}{a.removedAt ? ' · Removed' : ''}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-4"><label className="text-sm">Order date<Input aria-label="Order date" className="mt-1" type="date" required value={draft.order_date} onChange={e => update({ order_date: e.target.value })} /></label><label className="text-sm">Orders<Input aria-label="Order count" className="mt-1" type="number" required min={0} step={1} value={draft.order_count} onChange={e => update({ order_count: Number(e.target.value) })} /></label></div>
      <div className="grid grid-cols-2 gap-4"><label className="text-sm">Total payable (৳)<Input aria-label="Total payable" className="mt-1" type="number" required min={0} step="0.01" value={draft.payable} onChange={e => update({ payable: Number(e.target.value) })} /></label><label className="text-sm">Paid (৳)<Input aria-label="Paid amount" className="mt-1" type="number" required min={0} max={draft.payable} step="0.01" value={draft.paid} onChange={e => update({ paid: Number(e.target.value) })} /></label></div>
      <div className="flex items-center justify-between border-y py-3"><span className="text-sm text-muted-foreground">Remaining</span><output className="font-semibold tabular-nums">{taka((Math.round(draft.payable * 100) - Math.round(draft.paid * 100)) / 100)}</output></div>
      <label className="block text-sm">Notes<Input aria-label="Record notes" className="mt-1" maxLength={2000} value={draft.notes} onChange={e => update({ notes: e.target.value })} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" disabled={save.isPending}><Save className="size-4" /> {save.isPending ? 'Saving…' : 'Save record'}</Button></div>
    </form>}</DialogContent></Dialog>
  </section>;
}