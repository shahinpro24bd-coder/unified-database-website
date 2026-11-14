import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { phoneCountry, singleCountryTime } from '@/lib/phone-local-time';

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
  if (!country) return <span className="text-xs text-muted-foreground" title="An international country code is needed to identify local time.">Shomoy jana nei</span>;
  if (!now) return <span className="text-xs text-muted-foreground">{country.name} · —</span>;
  const first = singleCountryTime(country, now);
  if (!first) return <span className="text-xs text-muted-foreground" title="This phone country has different local times; the number does not identify one reliable time.">{country.name} · Shomoy jana nei</span>;
  const Icon = first.period === 'Day' ? Sun : Moon;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground" title={`${first.zone} · Day: 6 AM–6 PM; Night: 6 PM–6 AM. Phone country, not live location.`}>
    <Icon className="size-3 shrink-0" aria-hidden="true" /> {country.name} · {first.time} · {first.period}
  </span>;
}