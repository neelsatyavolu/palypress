import assert from "node:assert/strict";

import {
  filterPalyCalendarEvents,
  getPalyCalendarEventDetailsUrl,
  getPalyCalendarMonthUrl,
  parsePalyCalendarHtml,
  parsePalyCalendarEventDetailsHtml,
} from "./palyCalendar";

const html = `
<div class="fsCalendarDate" data-day="7" data-year="2026" data-month="7">
  <span class="fsCalendarDay">Friday,</span>
  <span class="fsCalendarMonth">August</span>
  7
</div>
<div class="fsCalendarInfo fsCalendarDayViewEvent noBottomMargin fsCalendarEvent">
  <span class="fsElementEventColorIcon" style="background:#1FF575" title="Paly Performing &amp; Visual Arts"></span>
  <div class="fsCalendarTitle fsCalendarEventLink fsCalendarTruncate" data-occur-id="103069390_2026-08-07T17:00:00Z_2026-08-07T23:00:00Z">
    Band Camp
  </div>
  <div class="fsTimeRange">
    <time datetime="2026-08-07T10:00:00-07:00" class="fsStartTime">10:00 AM</time>
    <time datetime="2026-08-07T16:00:00-07:00" class="fsEndTime">4:00 PM</time>
  </div>
</div>
<div class="fsCalendarDate" data-day="10" data-year="2026" data-month="7">
  <span class="fsCalendarDay">Monday,</span>
  <span class="fsCalendarMonth">August</span>
  10
</div>
<div class="fsCalendarInfo fsCalendarDayViewEvent noBottomMargin fsCalendarEvent">
  <span class="fsElementEventColorIcon" style="background: rgb(0, 105, 49);" title="Paly Universal"></span>
  <div class="fsCalendarTitle fsCalendarEventLink fsCalendarTruncate">
    District Day
  </div>
  <div class="fsAllDay">All Day</div>
</div>
`;

const events = parsePalyCalendarHtml(html);

assert.equal(events.length, 2, "parser should find both Finalsite events");

assert.deepEqual(
  events[0],
  {
    id: "paly-2026-08-07-paly-performing-visual-arts-band-camp-1000",
    title: "Band Camp",
    description: null,
    startTime: "2026-08-07T10:00:00-07:00",
    endTime: "2026-08-07T16:00:00-07:00",
    allDay: false,
    location: null,
    source: "paly",
    calendarId: "paly-performing-visual-arts",
    calendarName: "Paly Performing & Visual Arts",
    calendarColor: "#1FF575",
    date: "2026-08-07",
    occurId: "103069390_2026-08-07T17:00:00Z_2026-08-07T23:00:00Z",
  },
  "timed event should preserve title, category, color, and ISO times",
);

assert.deepEqual(
  events[1],
  {
    id: "paly-2026-08-10-paly-universal-district-day-0000",
    title: "District Day",
    description: null,
    startTime: "2026-08-10T00:00:00",
    endTime: null,
    allDay: true,
    location: null,
    source: "paly",
    calendarId: "paly-universal",
    calendarName: "Paly Universal",
    calendarColor: "rgb(0, 105, 49)",
    date: "2026-08-10",
    occurId: null,
  },
  "all-day event should fall back to the active day cell",
);

const repeatedTitleHtml = `
<div class="fsCalendarDate" data-day="28" data-year="2026" data-month="7">
  <span class="fsCalendarDay">Friday,</span>
  <span class="fsCalendarMonth">August</span>
  28
</div>
<div class="fsCalendarInfo fsCalendarDayViewEvent noBottomMargin fsCalendarEvent">
  <span class="fsElementEventColorIcon" style="background:#006931" title="Paly Universal"></span>
  <div class="fsCalendarTitle fsCalendarEventLink fsCalendarTruncate">
    Last Day to Add a Class
  </div>
  <div class="fsAllDay">All Day</div>
</div>
<div class="fsCalendarInfo fsCalendarDayViewEvent noBottomMargin fsCalendarEvent">
  <span class="fsElementEventColorIcon" style="background:#168BBD" title="Paly – Advisory"></span>
  <div class="fsCalendarTitle fsCalendarEventLink fsCalendarTruncate">
    Last Day to Add a Class
  </div>
  <div class="fsAllDay">All Day</div>
</div>
`;

const repeatedTitleEvents = parsePalyCalendarHtml(repeatedTitleHtml);
assert.equal(
  repeatedTitleEvents.length,
  2,
  "parser should keep same-day events that share a title",
);

assert.equal(
  filterPalyCalendarEvents(
    repeatedTitleEvents,
    "2026-08-28T00:00:00-07:00",
    "2026-08-28T23:59:59-07:00",
  ).length,
  2,
  "range filtering should not dedupe distinct same-day same-title events",
);

const augustThirteenthHtml = `
<div class="fsCalendarDate" data-day="13" data-year="2026" data-month="7">
  <span class="fsCalendarDay">Thursday,</span>
  <span class="fsCalendarMonth">August</span>
  13
</div>
<div class="fsCalendarInfo noBottomMargin">
  <div class="fsCalendarLongEvent fsCalendarLongEventSingleDay" style="border-color: #006931">
    <div class="fsCalendarLongEventBackground" style="border-color: #006931">
      <div class="fsCalendarEventLink fsCalendarLongEventTitle fsCalendarTruncate">
        First Day of School 2026-27 School Year
      </div>
      <div class="fsTimeRange">
        <span class="fsAllDayEvent">All Day</span>
      </div>
    </div>
  </div>
</div>
<div class="fsCalendarInfo fsCalendarDayViewEvent noBottomMargin fsStateSoftHidden">
  <div class="fsCalendarLongEvent fsCalendarLongEventSingleDay" style="border-color: #006931">
    <div class="fsCalendarLongEventBackground" style="border-color: #006931">
      <div class="fsCalendarEventLink fsCalendarLongEventTitle fsCalendarTruncate">
        First Day of School 2026-27 School Year
      </div>
    </div>
  </div>
</div>
<div class="fsCalendarInfo noBottomMargin">
  <div class="fsCalendarLongEvent fsCalendarLongEventSingleDay" style="border-color: #C4FF00">
    <div class="fsCalendarLongEventBackground" style="border-color: #C4FF00">
      <a class="fsCalendarEventLink fsCalendarLongEventTitle fsCalendarTruncate" title="(0-4, Advisory) Periods" data-occur-id="144883392_2026-08-13T00:00:00Z_2026-08-14T00:00:00Z" href="#">
        (0-4, Advisory) Periods
      </a>
      <div class="fsTimeRange">
        <span class="fsAllDayEvent">All Day</span>
      </div>
    </div>
  </div>
</div>
<div class="fsCalendarInfo noBottomMargin">
  <div class="fsCalendarLongEvent fsCalendarLongEventSingleDay" style="border-color: #FA00F2">
    <div class="fsCalendarLongEventBackground" style="border-color: #FA00F2">
      <div class="fsCalendarEventLink fsCalendarLongEventTitle fsCalendarTruncate">
        First Day of School
      </div>
      <div class="fsTimeRange">
        <span class="fsAllDayEvent">All Day</span>
      </div>
    </div>
  </div>
</div>
<div class="fsCalendarInfo fsCalendarEvent">
  <span class="title">Advisory 9th &amp; 11th /Class Meetings 10th &amp; 12th</span>
  <span class="time">11:55 AM - 12:35 PM</span>
</div>
<div class="fsCalendarInfo fsCalendarEvent">
  <span class="title">Advisory 10th &amp; 12th/Class Meetings 9th &amp; 11th</span>
  <span class="time">12:42 PM - 1:22 PM</span>
</div>
`;

const augustThirteenthEvents = parsePalyCalendarHtml(augustThirteenthHtml);
assert.deepEqual(
  augustThirteenthEvents.map((event) => event.title),
  [
    "First Day of School 2026-27 School Year",
    "(0-4, Advisory) Periods",
    "First Day of School",
    "Advisory 9th & 11th /Class Meetings 10th & 12th",
    "Advisory 10th & 12th/Class Meetings 9th & 11th",
  ],
  "parser should include all Aug 13 long and timed events",
);
assert.equal(
  augustThirteenthEvents[3].startTime,
  "2026-08-13T11:55:00",
  "span.time start time should be parsed",
);
assert.equal(
  augustThirteenthEvents[3].endTime,
  "2026-08-13T12:35:00",
  "span.time end time should be parsed",
);
assert.equal(
  augustThirteenthEvents[1].occurId,
  "144883392_2026-08-13T00:00:00Z_2026-08-14T00:00:00Z",
  "parser should preserve Finalsite occurrence ids for detail requests",
);

const augustThirteenthFilteredEvents = filterPalyCalendarEvents(
  [
    ...augustThirteenthEvents,
    {
      ...augustThirteenthEvents[0],
      id: "paly-2026-08-14-paly-school-calendar-assembly-periods-0000",
      title: "(5-7, Assembly/Rally) Periods",
      startTime: "2026-08-14T00:00:00",
      date: "2026-08-14",
    },
  ],
  "2026-08-13T00:00:00-07:00",
  "2026-08-13T23:59:59-07:00",
);
assert.deepEqual(
  augustThirteenthFilteredEvents.map((event) => event.title),
  [
    "First Day of School 2026-27 School Year",
    "(0-4, Advisory) Periods",
    "First Day of School",
    "Advisory 9th & 11th /Class Meetings 10th & 12th",
    "Advisory 10th & 12th/Class Meetings 9th & 11th",
  ],
  "all-day filtering should use PALY dates instead of server timezone",
);

const augustMonthUrl = new URL(getPalyCalendarMonthUrl("2026-08-01", 12345));
assert.equal(
  augustMonthUrl.pathname,
  "/fs/elements/23682",
  "month URL should use the Finalsite XHR element endpoint",
);
assert.equal(
  augustMonthUrl.searchParams.get("cal_date"),
  "2026-08-15",
  "month URL should request a middle-of-month date so Finalsite returns the intended month",
);
assert.equal(
  augustMonthUrl.searchParams.get("is_load_more"),
  "true",
  "month URL should request the XHR month payload with occurrence ids",
);
assert.equal(
  augustMonthUrl.searchParams.get("_"),
  "12345",
  "month URL should include a cache-busting timestamp",
);

const occurId =
  "144883392_2026-08-13T00:00:00Z_2026-08-14T00:00:00Z";
const detailUrl = new URL(getPalyCalendarEventDetailsUrl(occurId, 6789));
assert.equal(
  detailUrl.searchParams.get("occur_id"),
  occurId,
  "detail URL should preserve the full occurrence id",
);
assert.equal(
  detailUrl.searchParams.get("show_event"),
  "true",
  "detail URL should request the event popover payload",
);
assert.equal(
  detailUrl.searchParams.get("_"),
  "6789",
  "detail URL should include a cache-busting timestamp",
);

const detailsHtml = `
<article role="presentation">
  <time datetime="2026-08-13T00:00:00-07:00" class="fsDate"><span class="fsMonth">Aug</span> <span class="fsDay">13</span> <span class="fsYear">2026</span></time>
  <div class="fsTitle " id="fsArticle_23682_144883392_2026-08-13T00:00:00Z_2026-08-14T00:00:00Z">
    <span class="fsElementEventColorIcon" style="background:#C4FF00" aria-hidden="true" title="Paly – Bell Schedule"></span><span class="fsStyleSROnly">Paly – Bell Schedule</span>
    (0-4, Advisory) Periods
  </div>
  <div class="fsEventDetails">
    <div class="fsAllDay">all day</div>
    <div class="fsDescription">
      <div><p>0 Period (7:50-8:50)<br>1st Period (9:00-10:00)<br>Brunch (10:00-10:15)<br>2nd Period (10:15-11:15)<br>Lunch (11:15-11:48)<br>Advisory (9/11)/Class Meetings (10/12) (11:55-12:35)<br>Advisory (10/12)/Class Meetings (9/11) (12:42-1:22)<br>3rd Period (1:29-2:29)<br>4th Period (2:36-3:36)</p><p>&nbsp;</p></div>
    </div>
  </div>
</article>
`;

assert.deepEqual(
  parsePalyCalendarEventDetailsHtml(detailsHtml),
  {
    title: "(0-4, Advisory) Periods",
    date: "Aug 13 2026",
    time: "all day",
    calendarName: "Paly – Bell Schedule",
    calendarColor: "#C4FF00",
    location: null,
    description: [
      "0 Period (7:50-8:50)",
      "1st Period (9:00-10:00)",
      "Brunch (10:00-10:15)",
      "2nd Period (10:15-11:15)",
      "Lunch (11:15-11:48)",
      "Advisory (9/11)/Class Meetings (10/12) (11:55-12:35)",
      "Advisory (10/12)/Class Meetings (9/11) (12:42-1:22)",
      "3rd Period (1:29-2:29)",
      "4th Period (2:36-3:36)",
    ],
  },
  "detail parser should expose the same event details shown in the website modal",
);
