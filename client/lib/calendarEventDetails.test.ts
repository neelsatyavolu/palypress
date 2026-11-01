import assert from "node:assert/strict";

import {
  canFetchCalendarEventDetails,
  getCalendarEventDetailsPath,
} from "./calendarEventDetails";

const event = {
  id: "paly-2026-08-13-paly-bell-schedule-0-4-advisory-periods-0000",
  occurId: "144883392_2026-08-13T00:00:00Z_2026-08-14T00:00:00Z",
};

assert.equal(
  canFetchCalendarEventDetails(event),
  true,
  "events with a Finalsite occurrence id should fetch details",
);

assert.equal(
  canFetchCalendarEventDetails({ ...event, occurId: null }),
  false,
  "events without a Finalsite occurrence id should fall back to basic details",
);

assert.equal(
  getCalendarEventDetailsPath(event),
  "api/paly-calendar/events/paly-2026-08-13-paly-bell-schedule-0-4-advisory-periods-0000/details?occurId=144883392_2026-08-13T00%3A00%3A00Z_2026-08-14T00%3A00%3A00Z",
  "detail path should encode the occurrence id but keep the event id readable",
);

assert.equal(
  getCalendarEventDetailsPath({ ...event, occurId: null }),
  null,
  "detail path should be null when the event cannot fetch details",
);
