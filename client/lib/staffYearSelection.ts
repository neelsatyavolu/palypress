export interface StaffYearTerm {
  id: number;
  name: string;
  count: number;
}

/**
 * Extracts the ending calendar year from a staff-year term label.
 * Handles "2025-2026" -> 2026, "Spring 2026" -> 2026, "Winter 2023" -> 2023.
 * Returns null for labels with no year (e.g. "Management", "Authors").
 */
export function parseSchoolYearEnd(name: string): number | null {
  const matches = name.match(/\d{4}/g);
  if (!matches) return null;
  return Math.max(...matches.map(Number));
}

/**
 * The minimum roster end-year still considered "current" as of `now`.
 * School years end in June, so a roster whose end-year is below this floor
 * belongs to students who graduated more than a year ago and must be hidden.
 */
export function graduationFloorEndYear(now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan ... 6 = Jul
  return month >= 6 ? year : year - 1;
}

/**
 * Picks the newest populated school-year roster for a publication.
 * Ignores empty rosters (count 0), non-year labels, and any roster whose
 * students have already graduated. Returns the term id, or null when a
 * publication has no current roster (it is then omitted from the directory).
 */
export function selectStaffYearTerm(
  terms: StaffYearTerm[],
  now: Date,
): number | null {
  const floor = graduationFloorEndYear(now);
  let best: { id: number; end: number } | null = null;

  for (const term of terms) {
    if (!term.count || term.count <= 0) continue;

    const end = parseSchoolYearEnd(term.name);
    if (end === null || end < floor) continue;

    if (!best || end > best.end || (end === best.end && term.id > best.id)) {
      best = { id: term.id, end };
    }
  }

  return best ? best.id : null;
}
