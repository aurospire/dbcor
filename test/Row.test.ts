// RowTypeTests.test.ts
import * as m from '@/ColumnFunctions';
import { DatabaseDate } from '@/DatabaseDate';
import { InsertRow, Row, SelectRow, UpdateRow, WhereRow } from '@/Row';
import { Uuid } from '@/Uuid';
import { expectType } from 'jestype';
import { DateTime } from 'luxon';

describe('Row', () => {

    describe("Type Tests", () => {
        // Example Row Definition
        const Row = {
            id: m.id(),
            created: m.created(),
            updated: m.updated(),
            external: m.external(),
            name: m.string(true),
            age: m.integer(false),
        } satisfies Row;

        it("should correctly derive types for User SelectRow", () => {
            type UserSelectRow = SelectRow<typeof Row, 'User'>;

            expectType<UserSelectRow>().toBe<{
                id: number,
                created: DateTime;
                updated: DateTime;
                external: string;
                name: string;
                age: number | null;
            }>();
        });

        it("should correctly derive types for User WhereRow", () => {
            type UserWhereRow = WhereRow<typeof Row, 'User'>;

            expectType<UserWhereRow>().toBe<{
                id?: number,
                created?: DateTime;
                updated?: DateTime;
                external?: string;
                name?: string;
                age?: number | null;
            }>();
        });

        it("should correctly derive types for User InsertRow", () => {
            type UserInsertRow = InsertRow<typeof Row, 'User'>;

            expectType<UserInsertRow>().toBe<{
                name: string;
                age?: number | null;
            }>();
        });

        it("should correctly derive types for User UpdateRow", () => {
            type UserUpdateRow = UpdateRow<typeof Row, 'User'>;

            expectType<UserUpdateRow>().toBe<{
                name?: string;
                age?: number | null;
            }>();
        });


        it("should correctly derive types for Database SelectRow", () => {
            type DatabaseSelectRow = SelectRow<typeof Row, 'Database'>;

            expectType<DatabaseSelectRow>().toBe<{
                id: number,
                created: DatabaseDate;
                updated: DatabaseDate;
                external: string;
                name: string;
                age: number | null;
            }>();
        });

        it("should correctly derive types for Database WhereRow", () => {
            type DatabaseWhereRow = WhereRow<typeof Row, 'Database'>;

            expectType<DatabaseWhereRow>().toBe<{
                id?: number,
                created?: DatabaseDate;
                updated?: DatabaseDate;
                external?: string;
                name?: string;
                age?: number | null;
            }>();
        });

        it("should correctly derive types for Database InsertRow", () => {
            type DatabaseInsertRow = InsertRow<typeof Row, 'Database'>;

            expectType<DatabaseInsertRow>().toBe<{
                name: string;
                age?: number | null;
            }>();
        });

        it("should correctly derive types for Database UpdateRow", () => {
            type DatabaseUpdateRow = UpdateRow<typeof Row, 'Database'>;

            expectType<DatabaseUpdateRow>().toBe<{
                name?: string;
                age?: number | null;
            }>();
        });
    });

    describe("Conversion Tests", () => {
        const row = {
            id: m.id(),
            external: m.external(),
            created: m.created(),
            updated: m.updated(),
            active: m.boolean(true),
            age: m.integer(true),
            temperature: m.number(true),
            name: m.string(true),
            eventDate: m.datetime(true),
            userId: m.uuid(true),
            score: m.integer(false),
            description: m.string(false),
        } satisfies Row;

        const nowdt = DateTime.now().toUTC();
        const nowdds = DatabaseDate.fromDateTime(nowdt, 'string');
        const nowddn = DatabaseDate.fromDateTime(nowdt, 'number');
        const nowddd = DatabaseDate.fromDateTime(nowdt, 'date');

        const uuid = Uuid.generate();

        const userData: SelectRow<typeof row, 'User'> = {
            id: 1,
            external: uuid,
            created: nowdt,
            updated: nowdt,
            active: false,
            age: 32,
            temperature: 98,
            name: 'John Smith',
            eventDate: nowdt,
            userId: uuid,
            score: null,
            description: null
        };

        const dbData: SelectRow<typeof row, 'Database'> = {
            id: 1,
            external: uuid,
            created: nowdds,
            updated: nowddn,
            active: 0,
            age: 32,
            temperature: 98,
            name: 'John Smith',
            eventDate: nowddd,
            userId: uuid,
            score: null,
            description: null
        };

        describe('.select', () => {
            it('.toDatabase', () => {
                expect(Row.select.toDatabase(row, userData)).toEqual({
                    id: 1,
                    external: uuid,
                    created: nowdds,
                    updated: nowdds,
                    active: false,
                    age: 32,
                    temperature: 98,
                    name: 'John Smith',
                    eventDate: nowdds,
                    userId: uuid,
                    score: null,
                    description: null
                });
            });

            it('.toUser', () => {
                expect(Row.select.toUser(row, dbData)).toEqual({
                    id: 1,
                    external: uuid,
                    created: nowdt,
                    updated: nowdt,
                    active: false,
                    age: 32,
                    temperature: 98,
                    name: 'John Smith',
                    eventDate: nowdt,
                    userId: uuid,
                    score: null,
                    description: null
                });
            });
        });

        describe('.where', () => {
            it('.toDatabase', () => {
                const userData = {
                    id: 1,
                    created: nowdt,
                    score: null,
                    description: undefined,
                };

                expect(Row.where.toDatabase(row, userData)).toEqual({
                    id: 1,
                    created: nowdds,
                    score: null
                });
            });

            it('.toUser', () => {
                const dbData = {
                    id: 1,
                    created: nowdds,
                    score: null,
                    description: undefined,
                };

                expect(Row.where.toUser(row, dbData)).toEqual({
                    id: 1,
                    created: nowdt,
                    score: null
                });
            });
        });

        describe('.insert', () => {
            it('.toDatabase', () => {
                const newData: any = { ...userData };
                delete newData.score;
                delete newData.description;

                expect(Row.insert.toDatabase(row, newData)).toEqual({
                    active: false,
                    age: 32,
                    temperature: 98,
                    name: 'John Smith',
                    eventDate: nowdds,
                    userId: uuid
                });
            });

            it('.toUser', () => {
                const newData: any = { ...dbData };
                delete newData.score;
                delete newData.description;

                expect(Row.insert.toUser(row, newData)).toEqual({
                    active: false,
                    age: 32,
                    temperature: 98,
                    name: 'John Smith',
                    eventDate: nowdt,
                    userId: uuid,
                });
            });
        });

        describe('.update', () => {
            it('.toDatabase', () => {
                expect(Row.update.toDatabase(row, {})).toEqual({});
            });

            it('.toUser', () => {
                expect(Row.update.toUser(row, {})).toEqual({});
            });
        });
    });

});
