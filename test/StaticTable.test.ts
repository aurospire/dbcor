import * as m from '@/ColumnFunctions';
import { makeStaticTable, StaticBaseRow, StaticData, StaticRow, StaticStandardRow } from '@/StaticTable';
import { expectType } from 'jestype';
import { DbHandle, makeDbHandle } from './DbHandle';

const BaseName = 'base';
const StandardName = 'standard';
const CustomName = 'Custom';

const BaseRow = StaticBaseRow;
const StandardRow = StaticStandardRow;
const CustomRow = StaticRow({ active: m.boolean(true) });

const DateOne = '2024-01-01';
const DateTwo = '2024-01-02';

const BaseData = {
    row1: { id: 1, created: DateOne },
    row2: { id: 2, created: DateOne },
    row3: { id: 3, created: DateTwo }
} satisfies StaticData<typeof BaseRow>;

const StandardData = {
    row1: { id: 1, created: DateOne, name: 'Row 1', description: 'Description 1' },
    row2: { id: 2, created: DateOne, name: 'Row 2', description: 'Description 2' },
    row3: { id: 3, created: DateTwo, name: 'Row 3', description: 'Description 3' }
} satisfies StaticData<typeof StandardRow>;

const CustomData = {
    row1: { id: 1, created: DateOne, active: true },
    row2: { id: 2, created: DateOne, active: true },
    row3: { id: 3, created: DateTwo, active: false }
} satisfies StaticData<typeof CustomRow>;


let base = makeStaticTable({ name: BaseName, row: 'base', create: 'base', data: BaseData });
let standard = makeStaticTable({ name: StandardName, row: 'standard', create: 'standard', data: StandardData });
let custom = makeStaticTable({
    name: CustomName,
    row: CustomRow,
    data: CustomData,
    create: b => { b.boolean('active').notNullable(); }
});

describe('StaticRow', () => {
    it('tests types', () => {
        type a = StaticRow<'base'>
        type b = StaticRow<'standard'>
        expectType<StaticRow<'base'>>().toBe(BaseRow);
        expectType<StaticRow<'standard'>>().toBe(StandardRow);
        expectType<StaticRow<typeof CustomRow>>().toBe(CustomRow);
    });
});

describe('StaticTable', () => {
    it('test types', () => {
        expectType(base.data).toBe(BaseData);
        expectType(base.row).toBe(BaseRow);

        expectType(standard.data).toBe(StandardData);
        expectType(standard.row).toBe(StandardRow);

        expectType(custom.data).toBe(CustomData);
        expectType(custom.row).toBe(CustomRow);
    });

    it('should test properties', () => {
        expect(base.name).toBe(BaseName);
        expect(base.row).toStrictEqual(BaseRow);
        expect(base.data).toStrictEqual(BaseData);
        expect(base.columns).toEqual(['id', 'created']);

        expect(standard.name).toBe(StandardName);
        expect(standard.row).toStrictEqual(StandardRow);
        expect(standard.data).toStrictEqual(StandardData);
        expect(standard.columns).toEqual(['id', 'created', 'name', 'description']);

        expect(custom.name).toBe(CustomName);
        expect(custom.row).toStrictEqual(CustomRow);
        expect(custom.data).toStrictEqual(CustomData);
        expect(custom.columns).toEqual(['id', 'created', 'active']);
    });

    for (let table of [base, standard, custom])
        describe(table.name, () => {
            let handle: DbHandle;

            beforeAll(async () => {
                handle = makeDbHandle({ source: 'memory' });

                table = table.connect(handle.db);

                await table.create();
            });

            afterAll(async () => {

                await handle.destroy();

            });

            it('should test creation of table', async () => {
                const db = handle.db;

                expect(await db.schema.hasTable(table.name)).toBe(true);

                for (const column of table.columns)
                    expect(await db.schema.hasColumn(table.name, column)).toBe(true);
            });

            describe('.getDates', () => {
                it('should get the distinct dates in the proper order', () => {
                    expect(table.getDates()).toEqual([DateOne, DateTwo]);
                });
            });

            describe('.getRow()', () => {
                it('should get row by key', () => {
                    const key = 'row1';

                    const row = table.data[key];

                    const found = table.getRow(key);

                    expect(found).toEqual(row);
                });

                it('should get row by id', () => {
                    const row = table.row2;

                    const found = table.getRow(row.id);

                    expect(found).toEqual(row);
                });

                it('should throw error for non-existing key', () => {
                    expect(() => table.getRow('non_existing')).toThrow();
                });
            });

            describe('.getId()', () => {
                it('should get ID by key', () => {
                    const key = 'row3';

                    const row = table.data[key];

                    const found = table.getId(key);

                    expect(found).toEqual(row.id);
                });

                it('should get ID by id', () => {
                    const row = table.data.row1;

                    const found = table.getId(row.id);

                    expect(found).toEqual(row.id);
                });
            });

            describe('select methods', () => {
                const datesets = [[DateOne], [DateTwo], [DateOne, DateTwo]];

                for (const dates of datesets) {
                    it('.selectAll', async () => {
                        const groups = Object.fromEntries(dates.map(date => [date, Object.values(table.data).filter(row => date === row.created)]));

                        const rows = Object.values(groups).flat().sort((a, b) => a.id - b.id);

                        let total = 0;

                        // testing the additions
                        for (const date of dates) {
                            const group = groups[date];

                            await table.add(date);

                            const count = await table.count();

                            total += group.length;

                            expect(total).toBe(count);
                        }

                        const selected = (await table.selectAll()).sort((a, b) => a.id - b.id);

                        expect(selected).toEqual(rows);

                        // testing the removals
                        for (const date of dates) {
                            const group = groups[date];

                            await table.remove(date);

                            const count = await table.count();

                            total -= group.length;

                            expect(total).toBe(count);
                        }

                    });
                }

                it('.select', async () => {
                    await table.add(DateOne);
                    await table.add(DateTwo);

                    const row = table.data.row1;

                    const selected = await table.select(row.id);

                    expect(selected).toEqual(row);

                    await table.remove(DateTwo);
                    await table.remove(DateOne);
                });

                it('.selectBy', async () => {
                    await table.add(DateOne);
                    await table.add(DateTwo);

                    const date = '2024-01-01';

                    const selected = await table.selectBy({ created: date });

                    expect(selected).toEqual(Object.values(table.data).filter(row => row.created === date));

                    await table.remove(DateTwo);
                    await table.remove(DateOne);
                });
            });
        });

});