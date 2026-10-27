import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Users, Clock, ListChecks, Plus, UserPlus, Check, Archive, ArchiveRestore, RotateCcw, ExternalLink, Eye, Filter } from 'lucide-react';
import { TeamBrand } from '@/components/team-brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminDashboard, removeAccount, createAccount, updateAccountLead, allLeads } from '@/lib/admin.functions';
import { boundedRequest, recoveryQueryOptions } from '@/lib/request-recovery';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({ meta: [
    { title: 'Admin Dashboard — TEAM SHAHIN' }, { name: 'description', content: 'TEAM SHAHIN account management and lead activity.' },
    { property: 'og:title', content: 'Admin Dashboard — TEAM SHAHIN' }, { property: 'og:description', content: 'Private team administration.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: AdminPage,
});

function AdminPage() {
  const load = adminDashboard;
  const remove = removeAccount;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState('');
  const [showAll, setShowAll] = useState(false);
  const query = useQuery({ ...recoveryQueryOptions, queryKey: ['admin-dashboard'], queryFn: ({ signal }) => boundedRequest(s => load({ signal: s }), undefined, signal) });
  const deletion = useMutation({ mutationFn: (userId: string) => remove({ data: { userId } }), onSuccess: () => { toast.success('Account removed. Leads preserved.'); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); }, onError: (e: Error) => toast.error(e.message) });
  const data = query.data;
  // Clicking an account opens the very same workspace that account sees.
  const openWorkspace = (userId: string) => navigate({ to: '/leads', search: { as: userId } });
  return <main className="admin-page min-h-screen">
    <header className="workspace-header px-5 py-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><TeamBrand /><Button asChild><Link to="/leads"><Plus /> Collect leads</Link></Button></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-xs font-semibold uppercase text-primary">TEAM SHAHIN / Administration</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Admin dashboard<span className="text-primary">.</span></h1>
       {query.isError && data && <div role="status" className="mt-6 flex items-center gap-3"><p>Update load hoyni; ager data dekhano hocche.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>}
       {query.isPending ? <p className="py-12">Loading…</p> : query.isError && !data ? <div className="py-12"><p>{query.error instanceof Error ? query.error.message : 'Load hoyni — abar try korun.'}</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : data && <>
        <div className="admin-stats my-8 grid grid-cols-2 gap-6 border-y py-6"><div><Users className="mb-2 size-5 text-primary" /><p className="text-sm text-muted-foreground">Accounts</p><p className="text-3xl font-semibold">{data.accounts.length}</p></div><div><ListChecks className="mb-2 size-5 text-primary" /><p className="text-sm text-muted-foreground">New lead submissions</p><p className="text-3xl font-semibold">{data.activity.length}</p></div></div>
        <div className="my-6 flex flex-wrap items-center gap-3"><Button variant={showAll ? 'secondary' : 'outline'} onClick={() => { setShowAll(v => !v); if (!showAll) window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Eye /> {showAll ? 'Hide all leads' : 'Show all leads'}</Button>{showAll && <Button variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['admin-all-leads'] })}><RotateCcw /> Refresh</Button>}</div>
        {showAll && <AllLeads accounts={data.accounts} />}
        <CreateAccount onDone={() => qc.invalidateQueries({ queryKey: ['admin-dashboard'] })} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Accounts</h2><Input aria-label="Search accounts" className="max-w-sm" placeholder="Search email…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Account</th><th>Added leads</th><th>Last submission</th><th /></tr></thead><tbody>{data.accounts.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => { const submissions = data.activity.filter(a => a.user_id === u.id); return <tr key={u.id} className="border-b"><td className="py-4 pr-4"><Button variant="link" className="h-auto p-0" title="Open this account's workspace" onClick={() => openWorkspace(u.id)}>{u.email}</Button></td><td>{submissions.length}</td><td className="whitespace-nowrap pr-4">{submissions[0] ? new Date(submissions[0].added_at).toLocaleString() : '—'}</td><td className="flex justify-end gap-1"><Button title="Filter submission history" aria-label={`Filter history for ${u.email}`} variant="ghost" size="icon" onClick={() => setAccount(account === u.id ? '' : u.id)}><Filter className="size-4" /></Button><Button title="Open this account's workspace" aria-label={`Open ${u.email} workspace`} variant="ghost" size="icon" onClick={() => openWorkspace(u.id)}><Eye className="size-4" /></Button><Button title="Remove account" aria-label={`Remove ${u.email}`} variant="ghost" size="icon" disabled={u.id === data.selfId || deletion.isPending} onClick={() => { if (window.confirm(`Remove ${u.email}? Their leads and history will be preserved.`)) deletion.mutate(u.id); }}><Trash2 className="size-4 text-destructive" /></Button></td></tr>; })}</tbody></table></div>
        <div className="mb-4 mt-10 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-semibold"><Clock className="size-5" /> Submission history</h2>{account && <Button variant="ghost" onClick={() => setAccount('')}>All accounts</Button>}</div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Account</th><th>Date & time</th><th>Leads</th></tr></thead><tbody>{data.activity.filter(a => !account || a.user_id === account).map(a => <tr key={a.id} className="border-b"><td className="py-3 pr-4">{data.accounts.find(u => u.id === a.user_id)?.email ?? 'Removed account'}</td><td className="whitespace-nowrap">{new Date(a.added_at).toLocaleString()}</td><td>1</td></tr>)}</tbody></table>{data.activity.length === 0 && <p className="py-8 text-muted-foreground">No new submissions yet.</p>}</div>
      </>}
    </div>
  </main>;
}
function CreateAccount({ onDone }: { onDone: () => void }) {
  const create = createAccount;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const m = useMutation({ mutationFn: () => create({ data: { email, password } }), onSuccess: () => { toast.success('Account created'); setEmail(''); setPassword(''); onDone(); }, onError: (e: Error) => toast.error(e.message) });
  return <form className="mb-10 rounded-lg border p-5" onSubmit={e => { e.preventDefault(); m.mutate(); }}>
    <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><UserPlus className="size-5" /> Create account</h2>
    <div className="flex flex-wrap gap-3"><Input aria-label="New account email" type="email" required placeholder="email@example.com" className="max-w-xs" value={email} onChange={e => setEmail(e.target.value)} /><Input aria-label="New account password" required minLength={6} placeholder="Password (min 6)" className="max-w-xs" value={password} onChange={e => setPassword(e.target.value)} /><Button type="submit" disabled={m.isPending}>{m.isPending ? 'Creating…' : 'Create'}</Button></div>
  </form>;
}

function AllLeads({ accounts }: { accounts: { id: string; email: string }[] }) {
  const update = updateAccountLead;
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useQuery({ ...recoveryQueryOptions, queryKey: ['admin-all-leads'], queryFn: ({ signal }) => boundedRequest(s => allLeads({ signal: s }), undefined, signal) });
  const m = useMutation({ mutationFn: (v: { id: string; action: 'verify' | 'unverify' | 'archive' | 'unarchive' | 'trash' | 'restore' | 'delete' }) => update({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-all-leads'] }), onError: (e: Error) => toast.error(e.message) });
  useEffect(() => {
    const channel = supabase.channel('admin-all-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => {
        qc.invalidateQueries({ queryKey: ['admin-all-leads'] });
        qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  const rows = q.data ?? [];
  const s = search.trim().toLowerCase();
  const filtered = s ? rows.filter(l => [String(l.serial), l.facebook_link, l.phone ?? '', accounts.find(a => a.id === l.user_id)?.email ?? ''].some(v => v.toLowerCase().includes(s))) : rows;
  return <section className="mb-10 rounded-lg border p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><h2 className="flex items-center gap-2 text-xl font-semibold"><Eye className="size-5" /> All leads {q.isPending ? '' : `(${rows.length})`}<span className="text-xs font-normal text-muted-foreground">new leads appear here automatically</span></h2><Input aria-label="Search all leads" className="max-w-sm" placeholder="Search link, phone, email…" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {q.isPending ? <p>Loading…</p> : q.isError ? <div><p>{q.error instanceof Error ? q.error.message : 'Load hoyni — abar try korun.'}</p><Button variant="outline" onClick={() => q.refetch()}>Retry</Button></div> : rows.length === 0 ? <p className="text-muted-foreground">No leads yet.</p> :
    <div className="max-h-[40rem] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 border-b bg-background text-muted-foreground"><tr><th className="py-2">#</th><th>Account</th><th>Facebook</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(l => <tr key={l.id} className="border-b">
      <td className="py-2 pr-3">{l.serial}</td>
      <td className="max-w-[12rem] truncate pr-3 text-muted-foreground">{accounts.find(a => a.id === l.user_id)?.email ?? 'Removed account'}</td>
      <td className="max-w-xs truncate pr-3"><a className="inline-flex items-center gap-1 text-primary underline" href={l.facebook_link} target="_blank" rel="noreferrer">{l.facebook_link}<ExternalLink className="size-3" /></a></td>
      <td className="whitespace-nowrap pr-3">{l.phone ?? '—'}</td>
      <td className="whitespace-nowrap pr-3 text-xs">{l.deleted_at ? 'Trash' : l.archived ? 'Archived' : l.verified ? 'Verified' : 'New'}</td>
      <td className="whitespace-nowrap">
        <Button variant="ghost" size="icon" title={l.verified ? 'Unverify' : 'Verify'} onClick={() => m.mutate({ id: l.id, action: l.verified ? 'unverify' : 'verify' })}><Check className={l.verified ? 'text-primary' : ''} /></Button>
        <Button variant="ghost" size="icon" title={l.archived ? 'Unarchive' : 'Archive'} onClick={() => m.mutate({ id: l.id, action: l.archived ? 'unarchive' : 'archive' })}>{l.archived ? <ArchiveRestore /> : <Archive />}</Button>
        {l.deleted_at && <Button variant="ghost" size="icon" title="Restore" onClick={() => m.mutate({ id: l.id, action: 'restore' })}><RotateCcw /></Button>}
        <Button variant="ghost" size="icon" title="Delete permanently" onClick={() => { if (window.confirm('Delete this lead permanently?')) m.mutate({ id: l.id, action: 'delete' }); }}><Trash2 className="text-destructive" /></Button>
      </td></tr>)}</tbody></table></div>}
    {rows.length > 0 && filtered.length !== rows.length && <p className="mt-3 text-xs text-muted-foreground">Showing {filtered.length} of {rows.length} leads.</p>}
  </section>;
}
