import * as m from '@/ColumnFunctions';
import { DynamicRow, makeDynamicTable } from '@/DynamicTable';
import { InsertRow, UpdateRow } from '@/Row';
import { TableCallback } from '@/TableUtil';
import { expectType } from 'jestype';
import { DbHandle, makeDbHandle } from './DbHandle';

const MainName = 'Dynamic';

const MainRow = DynamicRow({
    name: m.string(true),
    active: m.boolean(true),
    age: m.integer(false),
});

const rows = [
    { name: 'Alice', active: true, age: 37 },
    { name: 'Bob', active: false, age: 35 },
    { name: 'Charles', active: false }
] satisfies InsertRow<typeof MainRow, 'User'>[];

const insertRow = { name: 'Donald', active: false } satisfies InsertRow<typeof MainRow, 'User'>;

const updateRow = { age: 99 } satisfies UpdateRow<typeof MainRow, 'User'>;

const MainCreator: TableCallback = t => {
    t.string('name').notNullable().unique();
    t.integer('age').nullable();
    t.boolean('active').notNullable();
};

let table = makeDynamicTable({ name: MainName, row: MainRow, create: MainCreator });

describe('DynamicTable', () => {
    let handle: DbHandle;

    beforeAll(async () => {
        handle = makeDbHandle({ source: 'memory' });

        table = table.connect(handle.db);

        await table.create();
    });

    afterAll(async () => {
        await table.drop();
        await handle.destroy();
    });

    it('test types', () => {
        expectType(table.row).toBe(MainRow);
    });

    it('should test properties', () => {
        expect(table.name).toBe(MainName);
        expect(table.row).toStrictEqual(MainRow);
        expect(table.columns).toStrictEqual(Object.keys(MainRow));
        expect(table.columns).toStrictEqual(['id', 'created', 'name', 'active', 'age'])
    });

    describe('.insert() and .insertMany()', () => {
        beforeEach(async () => {
            await table.query().truncate();
        });

        it('should insert a row', async () => {
            const row = rows[0];
            const inserted = await table.insert(row);
            expect(inserted).toMatchObject(row);
            expect(inserted.id).toBeDefined();
            expect(inserted.created).toBeDefined();
        });

        it('should insert multiple rows', async () => {
            const inserted = await table.insertMany(rows);

            expect(inserted.length).toBe(rows.length);

            inserted.forEach((row, index) => {
                expect(row).toMatchObject(rows[index]);
                expect(row.id).toBeDefined();
                expect(row.created).toBeDefined();
            });
        });
    });

    describe('.update() and .updateBy()', () => {
        beforeEach(async () => {
            await table.query().truncate();
            await table.insertMany(rows);
        });

        it('should update a row by id', async () => {
            const inserted = await table.insert(insertRow);
            const updated = await table.update(inserted.id, updateRow);
            expect(updated).toMatchObject({ ...inserted, ...updateRow });
        });

        it('should update rows by condition', async () => {
            const updated = await table.updateBy({ active: false }, updateRow);
            updated.forEach(row => {
                expect(row).toMatchObject(updateRow);
            });
        });
    });

    describe('.delete() and .deleteBy()', () => {
        beforeEach(async () => {
            await table.query().truncate();
            await table.insertMany(rows);
        });

        it('should delete a row by id', async () => {
            const row = await table.insert(insertRow);
            await table.delete(row.id);
            const selected = await table.select(row.id);
            expect(selected).toBeUndefined();
        });

        it('should delete rows by condition', async () => {
            const selected = await table.countOf({ active: true });
            await table.deleteBy({ active: true });
            const remaining = await table.countOf({ active: true });
            expect(selected).not.toBe(remaining);
        });
    });

    describe('select methods', () => {
        beforeEach(async () => {
            await table.query().truncate();
            await table.insertMany(rows);
        });

        it('.selectAll', async () => {
            const selected = await table.selectAll();
            expect(selected.length).toBe(rows.length);
            expect(selected.map(row => row.name)).toEqual(rows.map(row => row.name));
        });

        it('.select', async () => {
            const inserted = await table.insert({ name: 'Donald', active: false });
            const selected = await table.select(inserted.id);
            expect(selected).toMatchObject(inserted);
        });

        it('.selectBy', async () => {
            const row = rows[0];
            const selected = await table.selectBy({ name: row.name });
            expect(selected.length).toBe(1);
            expect(selected[0].name).toBe(row.name);
        });
    });
});
