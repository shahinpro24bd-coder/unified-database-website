import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function TopHunterTag() {
  return <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Crown className="size-3.5" /> No.1 Client Hunter</span>;
}

export function useTopHunterId() {
  return useQuery({
    queryKey: ['top-hunter'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_hunter_id');
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

// Shows once per account, the first time it visits while holding the No.1 tag.
export function TopHunterCongrats({ userId, isTop }: { userId: string; isTop: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: acked } = useQuery({
    queryKey: ['top-hunter-ack', userId],
    enabled: isTop,
    queryFn: async () => {
      const { data, error } = await supabase.from('top_hunter_ack').select('user_id').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
  useEffect(() => {
    if (!isTop || acked !== false) return;
    setOpen(true);
    void supabase.from('top_hunter_ack').insert({ user_id: userId }).then(() => qc.setQueryData(['top-hunter-ack', userId], true));
  }, [isTop, acked, userId, qc]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="text-center sm:max-w-md">
      <DialogHeader className="items-center sm:text-center">
        <span className="mb-2 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground"><Crown className="size-8" /></span>
        <DialogTitle className="text-2xl">Congratulations! 🎉</DialogTitle>
        <DialogDescription className="text-base">You are now the <strong className="text-foreground">No.1 Client Hunter</strong> of Team Shahin. Sobcheye beshi leads collect korar jonno ovinondon!</DialogDescription>
      </DialogHeader>
      <DialogFooter className="sm:justify-center"><Button onClick={() => setOpen(false)}>Thank you</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
