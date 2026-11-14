import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { phoneCountry, zoneTime } from '@/lib/phone-local-time';

// One clock per lead list, rather than one interval for every row.
export function useLocalTimeClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}

export function PhoneLocalTime({ phone, now }: { phone: string; now: Date | null }) {
  const country = useMemo(() => phoneCountry(phone), [phone]);
  if (!country) return <span className="text-xs text-muted-foreground" title="An international country code is needed to identify local time.">Country unknown</span>;
  if (!now) return <span className="text-xs text-muted-foreground">{country.name} · —</span>;
  const times = country.timezones.map(zone => ({ zone, ...zoneTime(zone, now) }));
  const first = times[0];
  if (!first) return <span className="text-xs text-muted-foreground">{country.name} · Time unavailable</span>;
  const multiple = times.some(time => time.time !== first.time || time.period !== first.period);
  if (multiple) return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer whitespace-nowrap">{country.name} · Multiple time zones</summary>
      <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-auto">
        {times.map(time => <span key={time.zone} className="whitespace-nowrap">{time.zone.replace(/_/g, ' ')} · {time.time} · {time.period}</span>)}
      </div>
    </details>
  );
  const Icon = first.period === 'Day' ? Sun : Moon;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground" title={`${first.zone} · Day: 6 AM–6 PM; Night: 6 PM–6 AM. Phone country, not live location.`}>
    <Icon className="size-3 shrink-0" aria-hidden="true" /> {country.name} · {first.time} · {first.period}
  </span>;
}