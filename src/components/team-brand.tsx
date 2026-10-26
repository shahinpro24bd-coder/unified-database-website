
export function TeamBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/team-shahin-logo-v2.png" alt="TEAM SHAHIN logo" width={48} height={48} className="size-12 shrink-0 rounded-sm object-contain" />
      <div>
        <div className="font-display text-lg font-bold">TEAM SHAHIN</div>
        {!compact && <div className="text-xs text-muted-foreground">Private workspace</div>}
      </div>
    </div>
  );
}