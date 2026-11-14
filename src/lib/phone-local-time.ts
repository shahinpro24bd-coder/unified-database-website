import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { getAllCountries } from 'countries-and-timezones';

const countries = getAllCountries();

export function singleCountryTime(country: { timezones: string[] }, now: Date) {
  const firstZone = country.timezones[0];
  if (!firstZone) return null;
  const first = zoneTime(firstZone, now);
  if (country.timezones.some(zone => {
    const time = zoneTime(zone, now);
    return time.time !== first.time || time.period !== first.period;
  })) return null;
  return { zone: firstZone, ...first };
}

export function phoneCountry(phone: string) {
  const input = phone.trim().replace(/^00/, '+');
  // Bare international numbers are accepted; national numbers beginning with
  // zero have no reliable country and must not inherit the viewer's location.
  if (!/^\+?\d/.test(input) || /^0/.test(input)) return null;
  try {
    const parsed = parsePhoneNumberFromString(input.startsWith('+') ? input : `+${input}`);
    if (!parsed?.country || !parsed.isPossible()) return null;
    return Object.values(countries).find(country => country.id === parsed.country) ?? null;
  } catch {
    return null;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();
export function zoneTime(timeZone: string, now: Date) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
    });
    formatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0) % 24;
  const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
  return {
    time: `${String(hour % 12 || 12).padStart(2, '0')}:${minute} ${hour < 12 ? 'AM' : 'PM'}`,
    // Clock-based day/night, not a claim about local sunrise/sunset.
    period: hour >= 6 && hour < 18 ? 'Day' as const : 'Night' as const,
  };
}