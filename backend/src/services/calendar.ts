import axios from "axios";
import ical from "node-ical";
import { RRule, Frequency } from "rrule";

export interface BusySlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

/**
 * Returns true if the given Date object is valid (not NaN).
 */
function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Converts node-ical's rrule format to an RRule instance
 */
function parseRRule(rrule: any, dtstart: Date): RRule {
  // If it's already a string (most common case with node-ical)
  if (typeof rrule === "string") {
    // Remove RRULE: prefix if present
    const cleanStr = rrule.startsWith("RRULE:")
      ? rrule.substring(6)
      : rrule;
    return RRule.fromString(cleanStr);
  }

  // If it's an object, try to construct RRule options
  const options: any = {
    dtstart,
    freq: RRule.WEEKLY, // default
    interval: 1
  };

  // Map frequency
  if (rrule.freq !== undefined) {
    if (typeof rrule.freq === "number") {
      options.freq = rrule.freq;
    } else if (typeof rrule.freq === "string") {
      const freqMap: Record<string, Frequency> = {
        "YEARLY": RRule.YEARLY,
        "MONTHLY": RRule.MONTHLY,
        "WEEKLY": RRule.WEEKLY,
        "DAILY": RRule.DAILY,
        "HOURLY": RRule.HOURLY,
        "MINUTELY": RRule.MINUTELY,
        "SECONDLY": RRule.SECONDLY
      };
      options.freq = freqMap[rrule.freq.toUpperCase()] || RRule.WEEKLY;
    }
  }

  if (rrule.interval !== undefined) options.interval = rrule.interval;
  if (rrule.count !== undefined) options.count = rrule.count;
  if (rrule.until) {
    const untilDate = new Date(rrule.until);
    if (isValidDate(untilDate)) {
      options.until = untilDate;
    }
  }
  if (rrule.byweekday !== undefined) options.byweekday = rrule.byweekday;
  if (rrule.bymonthday !== undefined) options.bymonthday = rrule.bymonthday;
  if (rrule.bymonth !== undefined) options.bymonth = rrule.bymonth;
  if (rrule.byday !== undefined) {
    // Convert byday to byweekday if needed
    options.byweekday = rrule.byday;
  }

  return new RRule(options);
}

/**
 * Fetches and parses an iCalendar feed, expanding recurring events
 * to generate a list of busy time slots within the specified date range.
 */
export async function fetchAndParseCalendar(
  calendarUrl: string,
  startDate: Date,
  endDate: Date
): Promise<BusySlot[]> {
  const response = await axios.get(calendarUrl, {
    timeout: 5000,
    headers: {
      "User-Agent": "ProtonScheduler/1.0"
    }
  });

  const parsed = ical.sync.parseICS(response.data);
  const busySlots: BusySlot[] = [];

  // Extract timezone definitions
  const timezones = new Map<string, any>();
  for (const item of Object.values(parsed)) {
    if ((item as any).type === "VTIMEZONE") {
      const tz = item as any;
      timezones.set(tz.tzid, tz);
    }
  }

  for (const item of Object.values(parsed)) {
    const event: any = item;
    if (event.type !== "VEVENT") continue;

    // Skip events without start/end
    if (!event.start || !event.end) continue;

    // Skip events marked as "free" (TRANSP:TRANSPARENT)
    // Default is OPAQUE (busy) if not specified
    const transp = event.transp || event.transparency || "OPAQUE";
    if (transp === "TRANSPARENT") continue;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Skip events with invalid dates
    if (!isValidDate(eventStart) || !isValidDate(eventEnd)) continue;

    // Handle recurring events
    if (event.rrule) {
      try {
        // node-ical may return an already-parsed RRule object with a between() method
        // or it may return a string/object that needs parsing
        let occurrences: Date[];
        if (typeof event.rrule.between === "function") {
          // Already parsed by node-ical, use directly
          try {
            occurrences = event.rrule.between(startDate, endDate, true);
          } catch {
            // If node-ical's pre-parsed RRule throws, fall back to manual parsing
            const rrule = parseRRule(event.rrule, eventStart);
            occurrences = rrule.between(startDate, endDate, true);
          }
        } else {
          // Need to parse manually
          const rrule = parseRRule(event.rrule, eventStart);
          occurrences = rrule.between(startDate, endDate, true);
        }

        // Handle exclusions (EXDATE)
        // node-ical returns exdate as an object with date strings as keys and Date objects as values
        const exdates = new Set<string>();
        if (event.exdate) {
          // exdate can be an object with date keys, or sometimes an array
          const exdateValues = typeof event.exdate === "object" && !Array.isArray(event.exdate)
            ? Object.values(event.exdate)
            : Array.isArray(event.exdate) ? event.exdate : [event.exdate];

          for (const exdate of exdateValues) {
            try {
              // Handle both Date objects and date strings
              const exdateDate = exdate instanceof Date ? exdate : new Date(exdate);
              if (isValidDate(exdateDate)) {
                exdates.add(exdateDate.toISOString().split("T")[0]); // YYYY-MM-DD
              }
            } catch {
              // Skip invalid exdate values
            }
          }
        }

        for (const occurrence of occurrences) {
          try {
            // Skip invalid occurrence dates
            if (!isValidDate(occurrence)) continue;

            // Check if this occurrence is excluded
            const occurrenceDateStr = occurrence.toISOString().split("T")[0];
            if (exdates.has(occurrenceDateStr)) continue;

            // Calculate duration from original event
            const duration = eventEnd.getTime() - eventStart.getTime();
            const occurrenceEnd = new Date(occurrence.getTime() + duration);

            if (!isValidDate(occurrenceEnd)) continue;

            // Only include if it overlaps with our range
            if (occurrenceEnd >= startDate && occurrence <= endDate) {
              busySlots.push({
                start: occurrence.toISOString(),
                end: occurrenceEnd.toISOString()
              });
            }
          } catch {
            // Skip individual bad occurrences without failing the whole series
            continue;
          }
        }
      } catch (err: any) {
        // Log the error for debugging but don't add the event
        // Recurring events often have start dates in the past, so adding
        // the original event would pollute results with incorrect data
        // eslint-disable-next-line no-console
        console.error("RRULE parsing error:", err.message);
      }
    } else {
      // Single event (non-recurring)
      if (eventStart <= endDate && eventEnd >= startDate) {
        busySlots.push({
          start: eventStart.toISOString(),
          end: eventEnd.toISOString()
        });
      }
    }
  }

  // Sort by start time
  busySlots.sort((a, b) => a.start.localeCompare(b.start));

  return busySlots;
}

/**
 * Fetches and parses multiple iCalendar feeds, merging and sorting results.
 */
export async function fetchAndParseMultipleCalendars(
  urls: string[],
  startDate: Date,
  endDate: Date
): Promise<BusySlot[]> {
  const results = await Promise.all(
    urls.map((url) => fetchAndParseCalendar(url, startDate, endDate))
  );
  const merged = results.flat();
  merged.sort((a, b) => a.start.localeCompare(b.start));
  return merged;
}

/**
 * Validates a calendar URL by attempting to fetch and parse it.
 * Returns the number of events found (including expanded recurring events).
 */
export async function validateCalendarUrl(
  calendarUrl: string
): Promise<{ eventCount: number; isValid: boolean; error?: string }> {
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const busySlots = await fetchAndParseCalendar(calendarUrl, now, endDate);

    return {
      eventCount: busySlots.length,
      isValid: true
    };
  } catch (err: any) {
    return {
      eventCount: 0,
      isValid: false,
      error: err.message || "Unknown error"
    };
  }
}

/**
 * Validates multiple calendar URLs. Fails if any URL is invalid.
 * Returns aggregated event count.
 */
export async function validateMultipleCalendarUrls(
  urls: string[]
): Promise<{ eventCount: number; isValid: boolean; error?: string }> {
  const results = await Promise.allSettled(
    urls.map((url) => validateCalendarUrl(url))
  );

  let totalEvents = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      return { eventCount: 0, isValid: false, error: `Calendar ${i + 1}: ${result.reason}` };
    }
    if (!result.value.isValid) {
      return { eventCount: 0, isValid: false, error: `Calendar ${i + 1}: ${result.value.error}` };
    }
    totalEvents += result.value.eventCount;
  }

  return { eventCount: totalEvents, isValid: true };
}
