import assert from "node:assert/strict";

import {
  parseSchoolYearEnd,
  graduationFloorEndYear,
  selectStaffYearTerm,
  StaffYearTerm,
} from "./staffYearSelection";

// parseSchoolYearEnd
assert.equal(parseSchoolYearEnd("2025-2026"), 2026);
assert.equal(parseSchoolYearEnd("2022-2023"), 2023);
assert.equal(parseSchoolYearEnd("Spring 2026"), 2026);
assert.equal(parseSchoolYearEnd("Winter 2023"), 2023);
assert.equal(parseSchoolYearEnd("Management"), null);
assert.equal(parseSchoolYearEnd("Authors"), null);

// graduationFloorEndYear (July = month index 6)
assert.equal(graduationFloorEndYear(new Date("2026-07-04")), 2026);
assert.equal(graduationFloorEndYear(new Date("2026-01-15")), 2025);
assert.equal(graduationFloorEndYear(new Date("2026-09-01")), 2026);

const now = new Date("2026-07-04");

// Paly Voice: newest populated valid year wins (2026-2027).
assert.equal(
  selectStaffYearTerm(
    [
      { id: 114154, name: "2026-2027", count: 15 },
      { id: 113558, name: "2025-2026", count: 40 },
      { id: 112983, name: "2024-2025", count: 19 },
    ],
    now,
  ),
  114154,
);

// Campanile: empty future roster is skipped, falls back to 2025-2026.
assert.equal(
  selectStaffYearTerm(
    [
      { id: 4293, name: "2026-2027", count: 0 },
      { id: 3937, name: "2025-2026", count: 32 },
      { id: 3576, name: "2024-2025", count: 30 },
    ],
    now,
  ),
  3937,
);

// Anthro: chronological pick, NOT alphabetical (regression for the old
// localeCompare bug that surfaced a graduated "Winter 2023" roster).
assert.equal(
  selectStaffYearTerm(
    [
      { id: 1, name: "Winter 2023", count: 13 },
      { id: 2, name: "Spring 2026", count: 18 },
      { id: 3, name: "Spring 2024", count: 16 },
    ],
    now,
  ),
  2,
);

// Ink: only non-year labels and an empty year -> no current roster.
assert.equal(
  selectStaffYearTerm(
    [
      { id: 1, name: "Management", count: 1 },
      { id: 2, name: "Authors", count: 10 },
      { id: 3, name: "2026-2027", count: 0 },
    ],
    now,
  ),
  null,
);

// Fully stale publication: newest roster already graduated -> omitted.
assert.equal(
  selectStaffYearTerm(
    [
      { id: 1, name: "2023-2024", count: 30 },
      { id: 2, name: "2022-2023", count: 28 },
    ],
    now,
  ),
  null,
);

// No terms at all.
assert.equal(selectStaffYearTerm([] as StaffYearTerm[], now), null);

console.log("staffYearSelection tests passed");
