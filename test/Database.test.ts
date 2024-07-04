import * as m from '@/ColumnFunctions';
import { Database, InferDatabaseObject, makeDatabaseConnector } from '@/Database';
import { DynamicRow, makeDynamicTable } from '@/DynamicTable';
import { makeStaticTable, StaticStandardRow } from '@/StaticTable';
import { TableCallback } from '@/TableUtil';
import { expectType } from 'jestype';
import { DbHandle, makeDbHandle } from './DbHandle';

const StaticMainName = 'Static';
const DynamicMainName = 'Dynamic';
const DynamicRelatedName = 'Related';

const StaticMainRow = StaticStandardRow;


const DynamicMainRow = DynamicRow({
    static_id: m.integer(true),
    name: m.string(true),
});

const DynamicRelatedRow = DynamicRow({
    dynamic_id: m.integer(true),
    active: m.boolean(true)
});


const StaticDataDate = '2024-01-01';

const StaticMainData = {
    row1: { id: 1, created: StaticDataDate, name: 'Static Row 1', description: 'Description 1' },
    row2: { id: 2, created: StaticDataDate, name: 'Static Row 2', description: 'Description 2' },
    row3: { id: 3, created: StaticDataDate, name: 'Static Row 3', description: 'Description 3' }
} as const;

const DynamicMainCreator: TableCallback = t => {
    t.fk(StaticMainName).notNullable();
    t.string('name');
};

const DynamicRelatedCreator: TableCallback = t => {
    t.fk(DynamicMainName).notNullable();
    t.boolean('active').notNullable;
};


const makeTestDatabase = makeDatabaseConnector({
    Static: makeStaticTable({ name: StaticMainName, row: StaticMainRow, data: StaticMainData, create: 'standard' }),
    Dynamic: makeDynamicTable({ name: DynamicMainName, row: DynamicMainRow, create: DynamicMainCreator }),
    Related: makeDynamicTable({ name: DynamicRelatedName, row: DynamicRelatedRow, create: DynamicRelatedCreator })
});

describe('Database', () => {
    let handle: DbHandle;
    let db: Database<InferDatabaseObject<typeof makeTestDatabase>>;

    beforeAll(async () => {
        handle = makeDbHandle({ source: 'memory' });
        db = makeTestDatabase(handle.db);

        await db.Static.create();
        await db.Static.add(StaticDataDate);
        await db.Dynamic.create();
        await db.Related.create();
    });

    afterAll(async () => {
        await db.Related.drop();
        await db.Dynamic.drop();
        await db.Static.drop();
        await handle.destroy();
    });

    describe('Database Properties and Types', () => {
        it('should verify database properties and types', () => {
            expectType(db.Static.row).toBe(StaticMainRow);
            expectType(db.Static.data).toBe(StaticMainData);
            expectType(db.Dynamic.row).toBe(DynamicMainRow);
            expectType(db.Related.row).toBe(DynamicRelatedRow);

            expect(db.knex).toBe(handle.db);
            expect(db.level).toBe(0);
            expect(db.closed).toBe(false);
        });
    });

    describe('CRUD operations', () => {
        it('should insert and select data from dynamic tables', async () => {
            const dynamicRow = await db.Dynamic.insert({ static_id: 1, name: 'Dynamic Row' });
            const relatedRow = await db.Related.insert({ dynamic_id: dynamicRow.id, active: true });

            const selectedDynamic = await db.Dynamic.select(dynamicRow.id);
            const selectedRelated = await db.Related.select(relatedRow.id);

            expect(selectedDynamic).toEqual(dynamicRow);
            expect(selectedRelated).toEqual(relatedRow);
        });

        it('should update data in dynamic tables', async () => {
            const dynamicRow = await db.Dynamic.insert({ static_id: 1, name: 'Row to update' });
            const updatedRow = await db.Dynamic.update(dynamicRow.id, { name: 'Updated Row' });

            expect(updatedRow).toMatchObject({ ...dynamicRow, name: 'Updated Row' });
        });

        it('should delete data from dynamic tables', async () => {
            const dynamicRow = await db.Dynamic.insert({ static_id: 1, name: 'Row to delete' });
            await db.Dynamic.delete(dynamicRow.id);

            const selectedDynamic = await db.Dynamic.select(dynamicRow.id);
            expect(selectedDynamic).toBeUndefined();
        });
    });

    describe('Transaction methods', () => {
        it('test base level', () => {
            expect(db.level).toBe(0);
            expect(db.closed).toBe(false);
        });

        it('should throw error when commit is called outside of a transaction', async () => {
            await expect(db.commit()).rejects.toThrow();
        });

        it('should throw error when rollback is called outside of a transaction', async () => {
            await expect(db.rollback()).rejects.toThrow();
        });

        it('should handle simple transactions', async () => {
            const trx = await db.transaction();

            expect(trx.closed).toBe(false);
            expect(trx.level).toBe(1);

            await trx.commit();

            expect(trx.closed).toBe(true);

            await expect(trx.commit()).rejects.toThrow();
            await expect(trx.rollback()).rejects.toThrow();
        });

        it('should handle nested transactions with commit', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            expect(trx.closed).toBe(false);
            expect(trx.level).toBe(1);

            expect(nestedTrx.closed).toBe(false);
            expect(nestedTrx.level).toBe(2);

            await nestedTrx.commit();
            expect(trx.closed).toBe(false);
            expect(nestedTrx.closed).toBe(true);

            await trx.commit();
            expect(trx.closed).toBe(true);
            expect(nestedTrx.closed).toBe(true);
        });

        it('should handle nested transactions with rollback', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            expect(trx.closed).toBe(false);
            expect(trx.level).toBe(1);

            expect(nestedTrx.closed).toBe(false);
            expect(nestedTrx.level).toBe(2);

            await nestedTrx.rollback();
            expect(trx.closed).toBe(false);
            expect(nestedTrx.closed).toBe(true);

            await trx.rollback();
            expect(trx.closed).toBe(true);
            expect(nestedTrx.closed).toBe(true);
        });

        it('should handle parent commit close', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            await trx.commit();
            expect(trx.closed).toBe(true);
            expect(nestedTrx.closed).toBe(true);

            await expect(nestedTrx.commit()).rejects.toThrow();
            await expect(nestedTrx.rollback()).rejects.toThrow();
        });

        it('should handle parent rollback close', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            await trx.rollback();
            expect(trx.closed).toBe(true);
            expect(nestedTrx.closed).toBe(true);

            await expect(nestedTrx.commit()).rejects.toThrow();
            await expect(nestedTrx.rollback()).rejects.toThrow();
        });
    });

    describe('Transaction CRUD Operations', () => {
        it('should handle CRUD operations within a single transaction', async () => {
            const trx = await db.transaction();

            const insertedRow = await trx.Dynamic.insert({ static_id: 1, name: 'Transaction Row' });
            expect(insertedRow.name).toBe('Transaction Row');

            const selectedRow = await trx.Dynamic.select(insertedRow.id);
            expect(selectedRow).toEqual(insertedRow);

            await trx.Dynamic.update(insertedRow.id, { name: 'Updated Transaction Row' });
            const updatedRow = await trx.Dynamic.select(insertedRow.id);
            expect(updatedRow?.name).toBe('Updated Transaction Row');

            await trx.Dynamic.delete(insertedRow.id);
            const deletedRow = await trx.Dynamic.select(insertedRow.id);
            expect(deletedRow).toBeUndefined();

            await trx.commit();
        });

        it('should handle CRUD operations within nested transactions with commit', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            const insertedRow = await nestedTrx.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });
            expect(insertedRow.name).toBe('Nested Transaction Row');

            const selectedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(selectedRow).toEqual(insertedRow);

            await nestedTrx.Dynamic.update(insertedRow.id, { name: 'Updated Nested Transaction Row' });
            const updatedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(updatedRow?.name).toBe('Updated Nested Transaction Row');

            await nestedTrx.Dynamic.delete(insertedRow.id);
            const deletedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(deletedRow).toBeUndefined();

            await nestedTrx.commit();
            await trx.commit();
        });

        it('should handle CRUD operations within nested transactions with rollback', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            const insertedRow = await nestedTrx.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });
            expect(insertedRow.name).toBe('Nested Transaction Row');

            const selectedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(selectedRow).toEqual(insertedRow);

            await nestedTrx.Dynamic.update(insertedRow.id, { name: 'Updated Nested Transaction Row' });
            const updatedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(updatedRow?.name).toBe('Updated Nested Transaction Row');

            await nestedTrx.Dynamic.delete(insertedRow.id);
            const deletedRow = await nestedTrx.Dynamic.select(insertedRow.id);
            expect(deletedRow).toBeUndefined();

            await nestedTrx.rollback();
            await trx.commit();

            const rollbackRow = await db.Dynamic.select(insertedRow.id);
            expect(rollbackRow).toBeUndefined();
        });

        it('should handle multiple children transactions with mixed commit and rollback', async () => {
            const trx = await db.transaction();
            const childTrx1 = await trx.transaction();

            const insertedRow1 = await childTrx1.Dynamic.insert({ static_id: 1, name: 'Child 1 Row' });
            await childTrx1.commit();

            const childTrx2 = await trx.transaction();
            const insertedRow2 = await childTrx2.Dynamic.insert({ static_id: 1, name: 'Child 2 Row' });
            await childTrx2.rollback();

            const selectedRow1 = await trx.Dynamic.select(insertedRow1.id);
            expect(selectedRow1).toEqual(insertedRow1);

            const selectedRow2 = await trx.Dynamic.select(insertedRow2.id);
            expect(selectedRow2).toBeUndefined();

            await trx.commit();
        });

        it('should handle nested transactions with rollback within commit', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            const insertedRow = await nestedTrx.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });

            await nestedTrx.rollback();

            const rollbackRow = await trx.Dynamic.select(insertedRow.id);
            expect(rollbackRow).toBeUndefined();

            const reinsertedRow = await trx.Dynamic.insert({ static_id: 1, name: 'Reinserted Transaction Row' });
            expect(reinsertedRow.name).toBe('Reinserted Transaction Row');

            await trx.commit();

            const selectedRow = await db.Dynamic.select(reinsertedRow.id);
            expect(selectedRow).toEqual(reinsertedRow);
        });

        it('should handle nested transactions with commit within rollback', async () => {
            const trx = await db.transaction();
            const nestedTrx = await trx.transaction();

            const insertedRow = await nestedTrx.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });

            await nestedTrx.commit();
            await trx.rollback();

            const selectedRow = await db.Dynamic.select(insertedRow.id);
            expect(selectedRow).toBeUndefined();
        });

        it('should handle rollback within rollback', async () => {
            const trx = await db.transaction();
            const nestedTrx1 = await trx.transaction();
            const nestedTrx2 = await nestedTrx1.transaction();

            const insertedRow = await nestedTrx2.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });

            await nestedTrx2.rollback();
            await nestedTrx1.rollback();
            await trx.rollback();

            const selectedRow = await db.Dynamic.select(insertedRow.id);
            expect(selectedRow).toBeUndefined();
        });

        it('should handle commit within commit', async () => {
            const trx = await db.transaction();
            const nestedTrx1 = await trx.transaction();
            const nestedTrx2 = await nestedTrx1.transaction();

            const insertedRow = await nestedTrx2.Dynamic.insert({ static_id: 1, name: 'Nested Transaction Row' });

            await nestedTrx2.commit();
            await nestedTrx1.commit();
            await trx.commit();

            const selectedRow = await db.Dynamic.select(insertedRow.id);
            expect(selectedRow).toEqual(insertedRow);
        });
    });

});
