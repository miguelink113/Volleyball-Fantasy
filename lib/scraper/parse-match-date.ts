const MADRID_TIME_ZONE = "Europe/Madrid";

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const value = (type: string): number =>
        Number(parts.find((part) => part.type === type)?.value ?? NaN);
    const hour = value("hour") === 24 ? 0 : value("hour");
    const asUtc = Date.UTC(
        value("year"),
        value("month") - 1,
        value("day"),
        hour,
        value("minute"),
        value("second")
    );

    return asUtc - date.getTime();
}

function wallClockToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
): Date {
    const naive = Date.UTC(year, month - 1, day, hour, minute);
    const firstOffset = getTimeZoneOffsetMs(new Date(naive), MADRID_TIME_ZONE);
    const candidate = naive - firstOffset;
    const finalOffset = getTimeZoneOffsetMs(new Date(candidate), MADRID_TIME_ZONE);
    return new Date(naive - finalOffset);
}

function isValidDateParts(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
): boolean {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        date.getUTCHours() === hour &&
        date.getUTCMinutes() === minute
    );
}

/**
 * Parses esvoley's Madrid wall-clock date into an absolute UTC instant.
 */
export function parseEsvoleyDatetime(value: string): Date | null {
    const match = value
        .trim()
        .match(
            /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?:\s+\((\d{2}):(\d{2})\s+en la Península\))?$/i
        );
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hour = Number(match[6] ?? match[4]);
    const minute = Number(match[7] ?? match[5]);

    if (
        !isValidDateParts(year, month, day, hour, minute) ||
        year < 2000 ||
        year > 2200
    ) {
        return null;
    }

    return wallClockToUtc(year, month, day, hour, minute);
}

/**
 * Parses the legacy DataProject date format.
 */
export function parseRfevbDatetime(value: string): Date | null {
    const match = value
        .trim()
        .match(/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})$/);
    if (!match) return null;

    return parseEsvoleyDatetime(
        `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`
    );
}
