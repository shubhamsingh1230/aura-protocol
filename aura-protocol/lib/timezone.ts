/**
 * The Aura Protocol resets at 3:00 AM in the USER's local time, not at
 * server UTC midnight. This keeps night owls and students who are awake
 * past midnight from getting bumped into "tomorrow" and losing a streak
 * for a day they were still actively grinding through.
 *
 * All offsets are strings like "+05:30" or "-04:00", captured client-side
 * from `new Date().getTimezoneOffset()` and stored per-log so historical
 * rows stay correct even if a user travels across timezones later.
 */

const RESET_HOUR_LOCAL = 3; // 3:00 AM

export function getDeviceTimezoneOffset(): string {
  const minutes = -new Date().getTimezoneOffset(); // JS gives inverted sign
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function parseOffsetMinutes(offset: string): number {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, sign, hh, mm] = match;
  const total = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  return sign === "-" ? -total : total;
}

/**
 * Returns the YYYY-MM-DD "log date" that `atUtc` belongs to, for a user at
 * `offset`, given the 3:00 AM local reset boundary.
 *
 * Example: offset +05:30, RESET_HOUR_LOCAL 3 — a check-in at 1:45 AM local
 * still counts as the previous calendar day; a check-in at 3:01 AM local
 * rolls over into the new day.
 */
export function getLogDateForOffset(atUtc: Date, offset: string): string {
  const offsetMinutes = parseOffsetMinutes(offset);
  const localMs = atUtc.getTime() + offsetMinutes * 60_000;
  const local = new Date(localMs);

  // Shift back by the reset hour before reading the calendar date, so
  // anything before 3:00 AM local still belongs to "yesterday".
  const shifted = new Date(local.getTime() - RESET_HOUR_LOCAL * 60 * 60_000);

  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayLogDate(offset: string): string {
  return getLogDateForOffset(new Date(), offset);
}

/** Milliseconds until this user's next 3:00 AM local reset, for a countdown UI. */
export function msUntilNextReset(offset: string): number {
  const offsetMinutes = parseOffsetMinutes(offset);
  const nowUtc = new Date();
  const nowLocalMs = nowUtc.getTime() + offsetMinutes * 60_000;
  const nowLocal = new Date(nowLocalMs);

  const nextResetLocal = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      RESET_HOUR_LOCAL,
      0,
      0,
      0
    )
  );

  if (nextResetLocal.getTime() <= nowLocalMs) {
    nextResetLocal.setUTCDate(nextResetLocal.getUTCDate() + 1);
  }

  return nextResetLocal.getTime() - nowLocalMs;
}
