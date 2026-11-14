import { expect, it } from 'vitest';
import { phoneCountry, singleCountryTime, zoneTime } from '@/lib/phone-local-time';

it('detects Bangladesh from international phone numbers, including spaces and 00 prefixes', () => {
  for (const phone of ['+880 1710-131161', '008801712345678', '8801712345678']) {
    expect(phoneCountry(phone)?.id).toBe('BD');
  }
});

it('does not invent a country for a national, invalid, or shared ambiguous number', () => {
  for (const phone of ['01733140166', '', 'not a number', '+999123456789', '+123']) {
    expect(phoneCountry(phone)).toBeNull();
  }
});

it('shows the current country time rather than the viewer time', () => {
  expect(zoneTime('Asia/Dhaka', new Date('2026-11-14T11:00:00Z'))).toEqual({ time: '05:00 PM', period: 'Day' });
  expect(zoneTime('Asia/Dhaka', new Date('2026-11-14T18:15:00Z'))).toEqual({ time: '12:15 AM', period: 'Night' });
});

it('uses daylight-saving-aware time zone offsets', () => {
  expect(zoneTime('Europe/London', new Date('2026-07-14T11:00:00Z')).time).toBe('12:00 PM');
  expect(zoneTime('Europe/London', new Date('2026-11-14T11:00:00Z')).time).toBe('11:00 AM');
});

it('returns unknown instead of selecting an arbitrary US time', () => {
  const country = phoneCountry('+14155552671');
  expect(country?.id).toBe('US');
  expect(country && singleCountryTime(country, new Date('2026-11-14T11:00:00Z'))).toBeNull();
});

it('returns one time when all country zones agree', () => {
  expect(singleCountryTime({ timezones: ['Asia/Dhaka'] }, new Date('2026-11-14T11:00:00Z'))).toEqual({ zone: 'Asia/Dhaka', time: '05:00 PM', period: 'Day' });
  expect(singleCountryTime({ timezones: [] }, new Date('2026-11-14T11:00:00Z'))).toBeNull();
});