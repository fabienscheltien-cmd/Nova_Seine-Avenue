import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";

export const MAX_OCCURRENCES = 200;

/**
 * Dates (aaaa-mm-jj) des séances d'une récurrence hebdomadaire :
 * chaque jour de semaine choisi (0 = dimanche … 6 = samedi), du début à la fin incluses.
 */
export function weeklyOccurrences(start: string, until: string, weekdays: number[], max = MAX_OCCURRENCES): string[] {
  if (!start || !until || !weekdays.length) return [];
  const out: string[] = [];
  const end = parseISO(until);
  for (let d = startOfDay(parseISO(start)); !isBefore(end, d) && out.length < max; d = addDays(d, 1)) {
    if (weekdays.includes(d.getDay())) out.push(format(d, "yyyy-MM-dd"));
  }
  return out;
}

/** Combine une date (aaaa-mm-jj) et une heure (hh:mm) en ISO, dans le fuseau du navigateur. */
export function localDateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}
