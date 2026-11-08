export type DirectoryAccount = { id: string; email: string; paused: boolean; removedAt: string | null; bestHunter: boolean };

export function directoryAccounts<T extends DirectoryAccount>(accounts: T[], removed: boolean, search = ''): T[] {
  return accounts.filter(a => Boolean(a.removedAt) === removed && a.email.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.bestHunter) - Number(a.bestHunter) || a.email.localeCompare(b.email));
}