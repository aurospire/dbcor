import { ColumnDatabaseType, ColumnModifiable } from '@/ColumnKind';
import { DatabaseDate } from '@/DatabaseDate';
import { expectType } from 'jestype';

describe("ColumnKind Type Tests", () => {
  it("should correctly derive database types for all column kinds", () => {
    expectType<ColumnDatabaseType<'boolean'>>().toBe<boolean | number>();
    expectType<ColumnDatabaseType<'integer'>>().toBe<number>();
    expectType<ColumnDatabaseType<'number'>>().toBe<number>();
    expectType<ColumnDatabaseType<'string'>>().toBe<string>();
    expectType<ColumnDatabaseType<'datetime'>>().toBe<DatabaseDate>();
    expectType<ColumnDatabaseType<'uuid'>>().toBe<string>();
    expectType<ColumnDatabaseType<'id'>>().toBe<number>();
    expectType<ColumnDatabaseType<'external'>>().toBe<string>();
    expectType<ColumnDatabaseType<'created'>>().toBe<DatabaseDate>();
    expectType<ColumnDatabaseType<'updated'>>().toBe<DatabaseDate>();
  });

  it("should correctly determine modifiability for all column kinds", () => {
    expectType<ColumnModifiable<'boolean'>>().toBe<true>();
    expectType<ColumnModifiable<'integer'>>().toBe<true>();
    expectType<ColumnModifiable<'number'>>().toBe<true>();
    expectType<ColumnModifiable<'string'>>().toBe<true>();
    expectType<ColumnModifiable<'datetime'>>().toBe<true>();
    expectType<ColumnModifiable<'uuid'>>().toBe<true>();
    expectType<ColumnModifiable<'id'>>().toBe<false>();
    expectType<ColumnModifiable<'external'>>().toBe<false>();
    expectType<ColumnModifiable<'created'>>().toBe<false>();
    expectType<ColumnModifiable<'updated'>>().toBe<false>();
  });
});
