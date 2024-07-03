import { DateTime } from "luxon";

export type DatabaseDate = Date | string | number;
export type DatabaseDateType = 'string' | 'number' | 'date';

/**
 * Converts a given date to a DateTime object in UTC.
 *
 * @param {DatabaseDate} date - The date to convert. Can be a Date, string, or number.
 * @returns {DateTime} The converted DateTime object in UTC.
 */
const toDateTime = (date: DatabaseDate): DateTime => {
    if (typeof date === 'string')
        return DateTime.fromMillis(Date.parse(date), { zone: 'UTC' }).toUTC();
    else if (typeof date === 'number')
        return DateTime.fromMillis(date).toUTC();
    else
        return DateTime.fromJSDate(date).toUTC();
};

/**
 * Converts a DateTime object to a specified DatabaseDate type.
 *
 * @param {DateTime} date - The DateTime object to convert.
 * @param {DatabaseDateType} [type='string'] - The type to convert the DateTime object to. Can be 'string', 'number', or 'date'.
 * @returns {DatabaseDate} The converted date.
 * @throws {Error} If the DateTime object is invalid.
 */
const fromDateTime = (date: DateTime, type: DatabaseDateType = 'string'): DatabaseDate => {
    if (type === 'string') {
        const result = date.toUTC().toISO({ includePrefix: false, extendedZone: false });

        if (!result)
            throw new Error('Invalid DateTime');

        return result;
    }
    else if (type === 'number') {
        return date.toUTC().toMillis();
    }
    else {
        return date.toUTC().toJSDate();
    }
};

/**
 * Returns the current date and time in a specified DatabaseDate type.
 *
 * @param {DatabaseDateType} [type='string'] - The type to convert the current DateTime object to. Can be 'string', 'number', or 'date'.
 * @returns {DatabaseDate} The current date and time.
 */
const now = (type: DatabaseDateType = 'string'): DatabaseDate => {
    return fromDateTime(DateTime.utc(), type);
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a date string against the ISO format (YYYY-MM-DD).
 *
 * @param {string} date - The date string to validate.
 * @returns {DateTime | undefined} The parsed DateTime object if valid, otherwise undefined.
 */
const validateDate = (date: string): DateTime | undefined => {
    if (dateRegex.test(date)) {
        const parsedDate = DateTime.fromISO(date);
        if (parsedDate.isValid) {
            return parsedDate;
        }
    }
};

/**
 * Utility object for handling DatabaseDate operations.
 */
export const DatabaseDate = Object.freeze({
    toDateTime,
    fromDateTime,
    now,
    regex: Object.freeze({
        date: dateRegex
    }),
    validate: Object.freeze({
        date: validateDate
    })
});
