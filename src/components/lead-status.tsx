import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DEFAULT_LEAD_VIEW = 'active' as const;

export function LeadStatus({ verified, pending, onChange }: {
  verified: boolean;
  pending: boolean;
  onChange: (verified: boolean) => void;
}) {
  return <div className="flex items-center justify-center gap-1">
    <Button type="button" variant={verified ? 'default' : 'outline'} size="icon" className="size-8"
      aria-label="Mark as verified" title="Mark as verified" aria-pressed={verified}
      disabled={pending} onClick={() => onChange(true)}><Check className="size-4" /></Button>
    <Button type="button" variant={!verified ? 'destructive' : 'outline'} size="icon" className="size-8"
      aria-label="Mark as not verified" title="Mark as not verified" aria-pressed={!verified}
      disabled={pending} onClick={() => onChange(false)}><X className="size-4" /></Button>
  </div>;
}