import { Eye, Filter, Pause, Play, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BestHunterTag } from '@/components/best-hunter-tag';
import { TopHunterTag, useTopHunterId } from '@/components/top-hunter';
import type { DirectoryAccount } from '@/lib/account-directory';

export function AdminAccountList({ accounts, activity, selfId, pending, onOpen, onHistory, onPause, onRemove, onTag }: {
  accounts: DirectoryAccount[];
  activity: { user_id: string; added_at: string }[];
  selfId: string;
  pending: boolean;
  onOpen: (id: string) => void;
  onHistory: (id: string) => void;
  onPause: (id: string, paused: boolean) => void;
  onRemove: (id: string) => void;
  onTag: (id: string, bestHunter: boolean) => void;
}) {
  const { data: topHunterId } = useTopHunterId();
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="py-3">Account</th><th>Access</th><th className="whitespace-nowrap px-3">Added leads</th><th className="whitespace-nowrap">Last submission</th><th /></tr></thead><tbody>{accounts.map(a => {
    const submissions = activity.filter(s => s.user_id === a.id);
    return <tr key={a.id} className="border-b">
      <td className="py-4 pr-4"><div className="flex items-center gap-2"><Button variant="link" className="h-auto whitespace-nowrap p-0 font-semibold" onClick={() => onOpen(a.id)}>{a.email.split('@')[0]}</Button>{topHunterId === a.id && <TopHunterTag />}{a.bestHunter && <BestHunterTag />}</div></td>
      <td className={a.removedAt || a.paused ? 'text-destructive' : 'text-primary'}>{a.removedAt ? 'Removed' : a.paused ? 'Paused' : 'Active'}</td>
      <td className="px-3 tabular-nums">{submissions.length}</td><td className="whitespace-nowrap pr-4">{submissions[0] ? new Date(submissions[0].added_at).toLocaleString() : '—'}</td>
      <td><div className="flex justify-end gap-1">
        {!a.removedAt && <><Button variant={a.bestHunter ? 'secondary' : 'ghost'} size="icon" title={a.bestHunter ? 'Remove Best Hunter tag' : 'Give Best Hunter tag'} aria-label={`${a.bestHunter ? 'Remove' : 'Give'} Best Hunter tag ${a.email}`} disabled={pending} onClick={() => onTag(a.id, !a.bestHunter)}><Trophy className="size-4" /></Button>
        <Button variant="ghost" size="icon" title={a.paused ? 'Resume account' : 'Pause account'} aria-label={`${a.paused ? 'Resume' : 'Pause'} ${a.email}`} disabled={a.id === selfId || pending} onClick={() => { if (a.paused || window.confirm(`Pause ${a.email}? Their devices will be signed out and login will be blocked until resumed.`)) onPause(a.id, !a.paused); }}>{a.paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button></>}
        <Button variant="ghost" size="icon" title="Filter submission history" aria-label={`Filter history for ${a.email}`} onClick={() => onHistory(a.id)}><Filter className="size-4" /></Button>
        <Button variant="ghost" size="icon" title="Open account workspace" aria-label={`Open ${a.email} workspace`} onClick={() => onOpen(a.id)}><Eye className="size-4" /></Button>
        {!a.removedAt && <Button variant="ghost" size="icon" title="Move to Removed accounts" aria-label={`Remove ${a.email}`} disabled={a.id === selfId || pending} onClick={() => { if (window.confirm(`Move ${a.email} to Removed accounts? Their profile and leads will be kept, and their access will be blocked.`)) onRemove(a.id); }}><Trash2 className="size-4 text-destructive" /></Button>}
      </div></td>
    </tr>;
  })}</tbody></table>{accounts.length === 0 && <p className="py-8 text-muted-foreground">No accounts found.</p>}</div>;
}