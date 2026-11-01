export interface PalyCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  source: "paly";
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  date: string;
  occurId: string | null;
}

export interface PalyCalendarEventDetails {
  title: string;
  date: string | null;
  time: string | null;
  calendarName: string;
  calendarColor: string;
  location: string | null;
  description: string[];
}

export const PALY_CALENDAR_PRINT_URL =
  "https://www.paly.net/fs/elements/23682/print";
export const PALY_CALENDAR_ELEMENT_URL =
  "https://www.paly.net/fs/elements/23682";

const DEFAULT_CATEGORY = "Paly School Calendar";
const DEFAULT_COLOR = "#006931";

export function getPalyCalendarPrintUrl(monthDate: string): string {
  const url = new URL(PALY_CALENDAR_PRINT_URL);
  url.searchParams.set("cal_date", monthDate);
  return url.toString();
}

export function getPalyCalendarMonthUrl(
  monthDate: string,
  cacheBust = Date.now(),
): string {
  const url = new URL(PALY_CALENDAR_ELEMENT_URL);
  url.searchParams.set("cal_date", getMiddleOfMonthDate(monthDate));
  url.searchParams.set("is_draft", "false");
  url.searchParams.set("is_load_more", "true");
  url.searchParams.set("page_id", "3044");
  url.searchParams.set("parent_id", "23682");
  url.searchParams.set("_", String(cacheBust));
  return url.toString();
}

export function getPalyCalendarEventDetailsUrl(
  occurId: string,
  cacheBust = Date.now(),
): string {
  const url = new URL(PALY_CALENDAR_ELEMENT_URL);
  url.searchParams.set("occur_id", occurId);
  url.searchParams.set("show_ath_event", "false");
  url.searchParams.set("show_event", "true");
  url.searchParams.set("is_draft", "false");
  url.searchParams.set("_", String(cacheBust));
  return url.toString();
}

export function getPalyCalendarMonthStarts(
  timeMin: string,
  timeMax: string,
): string[] {
  const minDate = new Date(timeMin);
  const maxDate = new Date(timeMax);

  if (Number.isNaN(minDate.getTime()) || Number.isNaN(maxDate.getTime())) {
    return [];
  }

  const months: string[] = [];
  const cursor = new Date(
    Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1),
  );

  while (cursor <= end) {
    months.push(formatDateKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

export function filterPalyCalendarEvents(
  events: PalyCalendarEvent[],
  timeMin: string,
  timeMax: string,
): PalyCalendarEvent[] {
  const min = new Date(timeMin).getTime();
  const max = new Date(timeMax).getTime();
  const minDateKey = formatPalyDateKey(new Date(timeMin));
  const maxDateKey = formatPalyDateKey(new Date(timeMax));

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return events;
  }

  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (event.allDay) {
        return event.date >= minDateKey && event.date <= maxDateKey;
      }

      const start = new Date(event.startTime).getTime();
      const end = event.endTime ? new Date(event.endTime).getTime() : start;
      return !Number.isNaN(start) && start <= max && end >= min;
    })
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

export function parsePalyCalendarHtml(html: string): PalyCalendarEvent[] {
  const tokens = Array.from(
    html.matchAll(
      /<div\s+class=["'][^"']*(?:\bfsCalendarDate\b|\bfsCalendarInfo\b)[^"']*["'][^>]*>/gi,
    ),
  );

  const events: PalyCalendarEvent[] = [];
  let activeDate: string | null = null;

  tokens.forEach((token, index) => {
    const tag = token[0];
    if (tag.includes("fsCalendarDate")) {
      activeDate = parseDateTag(tag);
      return;
    }

    if (!tag.includes("fsCalendarInfo")) return;
    if (tag.includes("fsStateSoftHidden")) return;

    const startIndex = token.index ?? 0;
    const endIndex = tokens[index + 1]?.index ?? html.length;
    const eventHtml = html.slice(startIndex, endIndex);
    const event = parseEventHtml(eventHtml, activeDate);
    if (event) events.push(event);
  });

  return events;
}

export function parsePalyCalendarEventDetailsHtml(
  html: string,
): PalyCalendarEventDetails {
  return {
    title: getDetailsTitle(html),
    date: getElementTextByClass(html, "fsDate") || null,
    time:
      getElementTextByClass(html, "fsAllDay") ||
      getElementTextByClass(html, "fsTimeRange") ||
      null,
    calendarName: getCategory(html),
    calendarColor: getColor(html),
    location: getElementTextByClass(html, "fsLocation") || null,
    description: getDescriptionLines(html),
  };
}

function parseEventHtml(
  eventHtml: string,
  activeDate: string | null,
): PalyCalendarEvent | null {
  const title = getTitle(eventHtml);
  if (!title || !activeDate) return null;

  const category = getCategory(eventHtml);
  const color = getColor(eventHtml);
  const times = getTimes(eventHtml, activeDate);
  const startTime = times.startTime || `${activeDate}T00:00:00`;
  const date = times.startTime?.slice(0, 10) || activeDate;
  const allDay = !times.startTime;

  return {
    id: buildEventId({ date, title, category, startTime }),
    title,
    description: null,
    startTime,
    endTime: times.endTime,
    allDay,
    location: null,
    source: "paly",
    calendarId: slugify(category),
    calendarName: category,
    calendarColor: color,
    date,
    occurId: getAttribute(eventHtml, "data-occur-id"),
  };
}

function buildEventId({
  date,
  title,
  category,
  startTime,
}: {
  date: string;
  title: string;
  category: string;
  startTime: string;
}): string {
  const timeKey = startTime.includes("T")
    ? startTime.slice(11, 16).replace(":", "")
    : "all-day";
  return `paly-${date}-${slugify(category)}-${slugify(title)}-${timeKey}`;
}

function parseDateTag(tag: string): string | null {
  const year = getAttribute(tag, "data-year");
  const month = getAttribute(tag, "data-month");
  const day = getAttribute(tag, "data-day");

  if (!year || !month || !day) return null;

  const monthNumber = Number(month) + 1;
  const dayNumber = Number(day);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(dayNumber)) {
    return null;
  }

  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
}

function getTitle(eventHtml: string): string {
  return (
    getElementTextByClass(eventHtml, "fsCalendarTitle") ||
    getElementTextByClass(eventHtml, "fsCalendarLongEventTitle") ||
    getElementTextByClass(eventHtml, "title")
  );
}

function getCategory(eventHtml: string): string {
  const iconTag = eventHtml.match(
    /<span\s+class=["'][^"']*\bfsElementEventColorIcon\b[^"']*["'][^>]*>/i,
  )?.[0];
  return normalizeText(
    getAttribute(iconTag || "", "title") || DEFAULT_CATEGORY,
  );
}

function getColor(eventHtml: string): string {
  const iconTag = eventHtml.match(
    /<span\s+class=["'][^"']*\bfsElementEventColorIcon\b[^"']*["'][^>]*>/i,
  )?.[0];
  const style = getAttribute(iconTag || "", "style") || "";
  const match =
    style.match(/background\s*:\s*([^;]+)/i) ||
    eventHtml.match(/border-color\s*:\s*([^;"']+)/i);
  return match?.[1]?.trim() || DEFAULT_COLOR;
}

function getElementTextByClass(html: string, className: string): string {
  return normalizeText(getElementInnerHtmlByClass(html, className));
}

function getElementInnerHtmlByClass(html: string, className: string): string {
  const match = html.match(
    new RegExp(
      `<([a-z][\\w:-]*)\\b(?=[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'])[^>]*>([\\s\\S]*?)<\\/\\1>`,
      "i",
    ),
  );
  return match?.[2] || "";
}

function getTimes(
  eventHtml: string,
  activeDate: string,
): {
  startTime: string | null;
  endTime: string | null;
} {
  let startTime: string | null = null;
  let endTime: string | null = null;
  const timeTags = eventHtml.match(/<time\b[^>]*>/gi) || [];

  timeTags.forEach((tag) => {
    const className = getAttribute(tag, "class") || "";
    const dateTime = getAttribute(tag, "datetime");
    if (!dateTime) return;

    if (/\bfsStartTime\b/i.test(className)) startTime = dateTime;
    if (/\bfsEndTime\b/i.test(className)) endTime = dateTime;
  });

  if (!startTime) {
    return getTextTimeRange(eventHtml, activeDate);
  }

  return { startTime, endTime };
}

function getTextTimeRange(
  eventHtml: string,
  activeDate: string,
): {
  startTime: string | null;
  endTime: string | null;
} {
  const timeMatch = eventHtml.match(
    /<span\s+class=["'][^"']*\btime\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  const timeText = normalizeText(timeMatch?.[1] || "");
  const rangeMatch = timeText.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );

  if (!rangeMatch) {
    return { startTime: null, endTime: null };
  }

  return {
    startTime: buildLocalDateTime(
      activeDate,
      rangeMatch[1],
      rangeMatch[2],
      rangeMatch[3],
    ),
    endTime: buildLocalDateTime(
      activeDate,
      rangeMatch[4],
      rangeMatch[5],
      rangeMatch[6],
    ),
  };
}

function buildLocalDateTime(
  date: string,
  hourValue: string,
  minuteValue: string,
  meridian: string,
): string {
  let hour = Number(hourValue);
  const minute = Number(minuteValue);
  const isPm = meridian.toUpperCase() === "PM";

  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;

  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function getAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

function normalizeText(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDetailsTitle(html: string): string {
  const titleHtml = getElementInnerHtmlByClass(html, "fsTitle")
    .replace(
      /<span\s+class=["'][^"']*\bfsElementEventColorIcon\b[^"']*["'][^>]*><\/span>/gi,
      " ",
    )
    .replace(
      /<span\s+class=["'][^"']*\bfsStyleSROnly\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      " ",
    );
  return normalizeText(titleHtml);
}

function getDescriptionLines(html: string): string[] {
  const descriptionHtml = getElementInnerHtmlByClass(html, "fsDescription");
  if (!descriptionHtml) return [];

  return decodeEntities(descriptionHtml)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMiddleOfMonthDate(monthDate: string): string {
  const parsed = new Date(`${monthDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return monthDate;

  parsed.setUTCDate(15);
  return formatDateKey(parsed);
}

function formatDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatPalyDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
