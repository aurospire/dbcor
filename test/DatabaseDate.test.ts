// DatabaseDate.test.ts
import { DatabaseDate } from "@/DatabaseDate";
import { DateTime } from "luxon";

const datestring = '2020-01-01T12:00:00.000Z';
const datetime = DateTime.utc(2020, 1, 1, 12);
const ticks = datetime.toMillis();


describe("DatabaseDate", () => {
    describe("to function", () => {
        it("should correctly convert a string date to DateTime", () => {
            const result = DatabaseDate.toDateTime(datestring);
            expect(result.toISO()).toBe(datestring);
        });

        it("should correctly convert a number (timestamp) to DateTime", () => {
            const result = DatabaseDate.toDateTime(ticks);
            expect(result.toMillis()).toBe(ticks);
        });

        it("should correctly convert a Date object to DateTime", () => {
            const date = new Date(datestring);
            const result = DatabaseDate.toDateTime(date);
            expect(result.toJSDate()).toEqual(date);
        });
    });

    describe("from function", () => {

        it("should return a string ISO date from DateTime", () => {
            const result = DatabaseDate.fromDateTime(datetime, 'string');
            expect(result).toBe(datestring);
        });

        it("should return a timestamp from DateTime", () => {
            const result = DatabaseDate.fromDateTime(datetime, 'number');
            expect(result).toBe(ticks);
        });

        it("should return a JavaScript Date object from DateTime", () => {
            const result = DatabaseDate.fromDateTime(datetime, 'date');
            expect(result).toEqual(new Date(datestring));
        });
    });

    describe("now function", () => {
        it("should return the current UTC date as string by default", () => {
            const result = DatabaseDate.now();
            expect(typeof result).toBe('string');
        });

        it("should return the current UTC date as number when specified", () => {
            const result = DatabaseDate.now('number');
            expect(typeof result).toBe('number');
        });

        it("should return the current UTC date as Date object when specified", () => {
            const result = DatabaseDate.now('date');
            expect(result).toBeInstanceOf(Date);
        });
    });

    // Additional tests for dateRegex
    describe("dateRegex", () => {
        it("should match valid date strings", () => {
            const validDates = ["2020-01-01", "1999-12-31", "2024-02-29"];

            validDates.forEach(date => {
                expect(DatabaseDate.regex.date.test(date)).toBe(true);
            });
        });

        it("should not match invalid date strings", () => {
            const invalidDates = ["20200101", "01-01-2020", "2020/01/01", "2020-1-1"];

            invalidDates.forEach(date => {
                expect(DatabaseDate.regex.date.test(date)).toBe(false);
            });
        });

        it("should not match non-date strings", () => {
            const nonDates = ["abc", "123-456-789", "year-month-day", "2020-01-01T00:00:00Z"];

            nonDates.forEach(nonDate => {
                expect(DatabaseDate.regex.date.test(nonDate)).toBe(false);
            });
        });

        it("should not match partial date strings", () => {
            // Strings that contain dates but also have additional characters
            const partialDates = ["2020-01-01 extra", "start 2020-01-01"];
            partialDates.forEach(partialDate => {
                expect(DatabaseDate.regex.date.test(partialDate)).toBe(false);
            });
        });
    });

    describe("validateDate function", () => {
        it("should validate a correctly formatted date string", () => {
            const date = "2020-01-01";

            const result = DatabaseDate.validate.date(date);

            expect(result).toBeInstanceOf(DateTime);

            expect(result?.toISODate()).toBe(date);
        });

        it("should return undefined for an incorrectly formatted date string", () => {
            const date = "20200101";
            const result = DatabaseDate.validate.date(date);
            expect(result).toBeUndefined();
        });
    });
});
