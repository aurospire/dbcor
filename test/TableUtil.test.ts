import { Constraint, makeForeignKeyName, superchargeTable } from "@/TableUtil";
import { DbHandle, makeDbHandle } from "./DbHandle";

describe('TableUtil', () => {

    describe("Constraint", () => {
        describe("constraintCode object", () => {
          it("should have the correct mapping of constraint types to codes", () => {
            expect(Constraint.Code.Primary).toBe("PK");
            expect(Constraint.Code.Foreign).toBe("FK");
            expect(Constraint.Code.Unique).toBe("UQ");
            expect(Constraint.Code.Index).toBe("IX");
          });
        });
      
        describe("Constraint function", () => {
          const testCases: Array<{type: 'Primary' | 'Foreign' | 'Unique' | 'Index', table: string, column: string, expected: string}> = [
            {type: 'Primary', table: 'user', column: 'id', expected: 'PK_USER_ID'},
            {type: 'Foreign', table: 'user', column: 'role_id', expected: 'FK_USER_ROLE_ID'},
            {type: 'Unique', table: 'user', column: 'username', expected: 'UQ_USER_USERNAME'},
            {type: 'Index', table: 'user', column: 'email', expected: 'IX_USER_EMAIL'}
          ];
      
          testCases.forEach(({ type, table, column, expected }) => {
            it(`should return the correct string for ${type} constraints`, () => {
              expect(Constraint(type, table, column)).toBe(expected);
            });
          });
        });
      });

      
    describe('makeForeignKeyName', () => {
        it('should create foreign key name with defaults', () => {
            expect(makeForeignKeyName('Main', 'Other')).toBe('other_id');
        });

        it('should create foreign key name with custom name and default suffix', () => {
            expect(makeForeignKeyName('Main', 'Other', 'link')).toBe('link_id');
        });

        it('should create foreign key name with custom name and custom suffix', () => {
            expect(makeForeignKeyName('Main', 'Other', 'link', 'fk')).toBe('link_fk');
        });

        it('should create foreign key name with custom name and empty suffix', () => {
            expect(makeForeignKeyName('Main', 'Other', 'link', '')).toBe('link');
        });

        it('should create foreign key name with custom name and null suffix', () => {
            expect(makeForeignKeyName('Main', 'Other', 'link', null)).toBe('link');
        });

        it('should create foreign key name with omitting same prefix', () => {
            expect(makeForeignKeyName('Main', 'MainOther')).toBe('other_id');
        });

        it('should create foreign key name to self', () => {
            expect(makeForeignKeyName('Main')).toBe('main_id');
        });

        it('should create foreign key name to self with the same name', () => {
            expect(makeForeignKeyName('Main', 'Main')).toBe('main_id');
        });

        it('should create foreign key name with fromTable lead underscore', () => {
            expect(makeForeignKeyName('_Main')).toBe('main_id');
        });

        it('should create foreign key name with toTable lead underscore', () => {
            expect(makeForeignKeyName('Main', '_Other')).toBe('other_id');
        });

        it('should create foreign key name with name lead underscore', () => {
            expect(makeForeignKeyName('Main', 'Other', '_Link')).toBe('link_id');
        });

        it('should create foreign key name with underscore toTable', () => {
            expect(makeForeignKeyName('Main', '_')).toBe('main_id');
        });

        it('should create foreign key name with underscore name', () => {
            expect(makeForeignKeyName('Main', 'Other', '_')).toBe('other_id');
        });
    });

    describe('SuperchargedTableBuilder', () => {
        const MainTable = 'MainTable';

        let handle: DbHandle;

        beforeAll(() => {
            handle = makeDbHandle({ source: 'memory' });
        });

        afterAll(async () => {
            await handle.destroy();
        });

        beforeEach(async () => {
            await handle.db.schema.dropTableIfExists(MainTable);
        });

        it('should create an id column', async () => {
            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.id('auto');
            });

            const columnInfo = await handle.db(MainTable).columnInfo('id');
            expect(columnInfo.type).toBe('integer');
            expect(columnInfo.nullable).toBe(false);
        });

        it('should create a foreign key column', async () => {
            const OtherTable = 'OtherTable';

            await handle.db.schema.createTable(OtherTable, (table) => {
                table.increments('id');
            });

            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.fk(OtherTable);
            });

            const columnInfo = await handle.db(MainTable).columnInfo('othertable_id');
            expect(columnInfo.type).toBe('integer');
            expect(columnInfo.nullable).toBe(true);
        });

        it('should create a datestamp column with initialization', async () => {
            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.datestamp('created_at', true);
            });

            const columnInfo = await handle.db(MainTable).columnInfo('created_at');
            expect(columnInfo.type).toBe('datetime');
            expect(columnInfo.defaultValue).toBe("CURRENT_TIMESTAMP");
        });

        it('should create a named created column', async () => {
            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.created();
            });

            const columnInfo = await handle.db(MainTable).columnInfo('created');
            expect(columnInfo.type).toBe('datetime');
            expect(columnInfo.defaultValue).toBe("CURRENT_TIMESTAMP");
        });

        it('should create a named updated column', async () => {
            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.updated();
            });

            const columnInfo = await handle.db(MainTable).columnInfo('updated');
            expect(columnInfo.type).toBe('datetime');
            expect(columnInfo.defaultValue).toBe("CURRENT_TIMESTAMP");
        });

        it('should create an external column', async () => {
            await handle.db.schema.createTable(MainTable, (table) => {
                const builder = superchargeTable(handle.db, table, MainTable);
                builder.external();
            });

            const columnInfo = await handle.db(MainTable).columnInfo('external');
            expect(['uuid', 'char', 'binary', 'varchar', 'varbinary']).toContain(columnInfo.type);
            expect(columnInfo.defaultValue).not.toBeFalsy();
        });
    });
});
