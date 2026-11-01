import NodeCache from "node-cache";

// Cache TTL values in seconds
const TTL = {
  WORDPRESS_API: 5 * 60, // 5 minutes
  UPVOTE_COUNTS: 60, // 1 minute
  STAFF_DATA: 30 * 60, // 30 minutes
  SCHEDULE: 60 * 60, // 1 hour
  EXTERNAL_FEED: 10 * 60, // 10 minutes
  ARCHIVE: 10 * 60, // 10 minutes
} as const;

// Create cache instances with different TTLs
const wordpressCache = new NodeCache({
  stdTTL: TTL.WORDPRESS_API,
  checkperiod: 60,
});
const upvoteCache = new NodeCache({
  stdTTL: TTL.UPVOTE_COUNTS,
  checkperiod: 30,
});
const staffCache = new NodeCache({ stdTTL: TTL.STAFF_DATA, checkperiod: 120 });
const scheduleCache = new NodeCache({
  stdTTL: TTL.SCHEDULE,
  checkperiod: 300,
});
const palyCalendarCache = new NodeCache({
  stdTTL: TTL.SCHEDULE,
  checkperiod: 300,
});
const externalFeedCache = new NodeCache({
  stdTTL: TTL.EXTERNAL_FEED,
  checkperiod: 120,
});
const archiveCache = new NodeCache({
  stdTTL: TTL.ARCHIVE,
  checkperiod: 120,
});

export class CacheService {
  // WordPress API caching
  static getWordPressData(key: string): any | undefined {
    return wordpressCache.get(key);
  }

  static setWordPressData(key: string, value: any): boolean {
    return wordpressCache.set(key, value);
  }

  static invalidateWordPress(pattern?: string): void {
    if (pattern) {
      const keys = wordpressCache.keys().filter((k) => k.includes(pattern));
      wordpressCache.del(keys);
    } else {
      wordpressCache.flushAll();
    }
  }

  // Upvote counts caching
  static getUpvoteCounts(key: string): Map<string, number> | undefined {
    const cached = upvoteCache.get<Map<string, number>>(key);
    return cached;
  }

  static setUpvoteCounts(key: string, value: Map<string, number>): boolean {
    return upvoteCache.set(key, value);
  }

  static invalidateUpvotes(articleKey?: string): void {
    if (articleKey) {
      const keys = upvoteCache.keys().filter((k) => k.includes(articleKey));
      upvoteCache.del(keys);
    } else {
      upvoteCache.flushAll();
    }
  }

  // Staff data caching
  static getStaffData(publicationId: string, yearId: string): any | undefined {
    const key = `staff:${publicationId}:${yearId}`;
    return staffCache.get(key);
  }

  static setStaffData(
    publicationId: string,
    yearId: string,
    value: any,
  ): boolean {
    const key = `staff:${publicationId}:${yearId}`;
    return staffCache.set(key, value);
  }

  static invalidateStaff(publicationId?: string): void {
    if (publicationId) {
      const keys = staffCache.keys().filter((k) => k.includes(publicationId));
      staffCache.del(keys);
    } else {
      staffCache.flushAll();
    }
  }

  // Schedule caching
  static getScheduleData(dateStr: string): any | undefined {
    const key = `schedule:${dateStr}`;
    return scheduleCache.get(key);
  }

  static setScheduleData(dateStr: string, value: any): boolean {
    const key = `schedule:${dateStr}`;
    return scheduleCache.set(key, value);
  }

  static invalidateSchedule(dateStr?: string): void {
    if (dateStr) {
      const key = `schedule:${dateStr}`;
      scheduleCache.del(key);
    } else {
      scheduleCache.flushAll();
    }
  }

  // PALY school calendar caching
  static getPalyCalendarData(monthKey: string): any | undefined {
    return palyCalendarCache.get(`paly-calendar:${monthKey}`);
  }

  static setPalyCalendarData(monthKey: string, value: any): boolean {
    return palyCalendarCache.set(`paly-calendar:${monthKey}`, value);
  }

  static invalidatePalyCalendar(monthKey?: string): void {
    if (monthKey) {
      palyCalendarCache.del(`paly-calendar:${monthKey}`);
    } else {
      palyCalendarCache.flushAll();
    }
  }

  // External publication feed caching
  static getExternalFeedData(publicationId: string): any | undefined {
    return externalFeedCache.get(`external-feed:${publicationId}`);
  }

  static setExternalFeedData(publicationId: string, value: any): boolean {
    return externalFeedCache.set(`external-feed:${publicationId}`, value);
  }

  static invalidateExternalFeed(publicationId?: string): void {
    if (publicationId) {
      externalFeedCache.del(`external-feed:${publicationId}`);
    } else {
      externalFeedCache.flushAll();
    }
  }

  // Paly Journalism Archive caching
  static getArchiveData(key: string): any | undefined {
    return archiveCache.get(`archive:${key}`);
  }

  static setArchiveData(key: string, value: any): boolean {
    return archiveCache.set(`archive:${key}`, value);
  }

  static invalidateArchive(key?: string): void {
    if (key) {
      archiveCache.del(`archive:${key}`);
    } else {
      archiveCache.flushAll();
    }
  }

  // Cache statistics
  static getStats() {
    return {
      wordpress: wordpressCache.getStats(),
      upvotes: upvoteCache.getStats(),
      staff: staffCache.getStats(),
      schedule: scheduleCache.getStats(),
      palyCalendar: palyCalendarCache.getStats(),
      externalFeed: externalFeedCache.getStats(),
      archive: archiveCache.getStats(),
    };
  }

  // Clear all caches
  static clearAll(): void {
    wordpressCache.flushAll();
    upvoteCache.flushAll();
    staffCache.flushAll();
    scheduleCache.flushAll();
    palyCalendarCache.flushAll();
    externalFeedCache.flushAll();
    archiveCache.flushAll();
  }
}
