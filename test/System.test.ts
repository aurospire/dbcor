import * as m from '@/ColumnFunctions';
import { Database, makeDatabaseConnector } from '@/Database';
import { DynamicRow, makeDynamicTable } from '@/DynamicTable';
import { InsertRow } from '@/Row';
import { Service } from '@/Service';
import { makeStaticTable, StaticRow, StaticRowDate } from '@/StaticTable';
import { InferSystemObject, makeSystemConnector, System } from '@/System';
import { TableCallback } from '@/TableUtil';
import { expectType } from 'jestype';
import { DbHandle, makeDbHandle } from './DbHandle';

const StaticEnumName = 'Enum';
const DynamicAName = 'A';
const DynamicBName = 'B';

const StaticEnumRow = StaticRow('standard');

const DynamicARow = DynamicRow({
    enum_id: m.integer(true),
    name: m.string(true),
});

const DynamicBRow = DynamicRow({
    a_id: m.integer(true),
    value: m.number(true)
});

const StaticEnumDate: StaticRowDate = '2024-01-01';

const StaticEnumData = {
    rowX: { id: 1, created: StaticEnumDate, name: 'Static Row X', description: 'Description X' },
    rowY: { id: 2, created: StaticEnumDate, name: 'Static Row Y', description: 'Description Y' },
    rowZ: { id: 3, created: StaticEnumDate, name: 'Static Row Z', description: 'Description Z' }
};

const DynamicACreator: TableCallback = t => {
    t.fk('Enum').notNullable();
    t.string('name').notNullable();
};

const DynamicBCreator: TableCallback = t => {
    t.fk('A').notNullable();
    t.integer('value').notNullable();
};

const DynamicAData: InsertRow<typeof DynamicARow, 'User'>[] = [
    { enum_id: 1, name: 's' },
    { enum_id: 2, name: 't' }
];

const DynamicBData: InsertRow<typeof DynamicBRow, 'User'>[] = [
    { a_id: 1, value: 100 },
    { a_id: 2, value: 200 }
];

const makeTestDatabase = makeDatabaseConnector({
    Enum: makeStaticTable({ name: StaticEnumName, row: StaticEnumRow, create: 'standard', data: StaticEnumData }),
    A: makeDynamicTable({ name: DynamicAName, row: DynamicARow, create: DynamicACreator }),
    B: makeDynamicTable({ name: DynamicBName, row: DynamicBRow, create: DynamicBCreator })
});

class ServiceA extends Service<Database<ReturnType<typeof makeTestDatabase>>> {
    async getAWithStatic() {
        const query = this.db.A.query()
            .select('A.name', 'E.description')
            .from('A')
            .join('Enum AS E', 'A.enum_id', 'E.id');

        return query;
    }

    protected __clone(): ServiceA {
        return new ServiceA();
    }
}

class ServiceB extends Service<Database<ReturnType<typeof makeTestDatabase>>> {
    async getAWithB() {
        const query = this.db.knex
            .select('B.value', 'A.name')
            .from('B')
            .join('A', 'B.a_id', 'A.id');

        return query;
    }

    protected __clone(): ServiceB {
        return new ServiceB();
    }
}

const makeTestSystem = makeSystemConnector<Database<ReturnType<typeof makeTestDatabase>>>()({
    A: new ServiceA(),
    B: new ServiceB(),
});

describe('System', () => {
    let handle: DbHandle;
    let db: Database<ReturnType<typeof makeTestDatabase>>;
    let system: System<Database<ReturnType<typeof makeTestDatabase>>, InferSystemObject<typeof makeTestSystem>>;

    beforeAll(async () => {
        handle = makeDbHandle({ source: 'memory' });
        db = makeTestDatabase(handle.db);
        system = makeTestSystem(db);

        await db.Enum.initialize();
        await db.A.create();
        await db.B.create();
    });

    afterAll(async () => {
        await handle.destroy();
    });

    describe('System Properties and Types', () => {
        it('should verify system properties and types', () => {
            expectType(system.A).toBe<ServiceA>();
            expectType(system.B).toBe<ServiceB>();

            expect(system.level).toBe(0);
            expect(system.closed).toBe(false);
        });
    });

    describe('Service Operations', () => {
        beforeAll(async () => {
            await db.A.insertMany(DynamicAData);
            await db.B.insertMany(DynamicBData);
        });

        it('should join A with StaticTable', async () => {
            const result = await system.A.getAWithStatic();
            expect(result).toEqual([
                { name: DynamicAData[0].name, description: system.db.Enum.getRow(DynamicAData[0].enum_id).description },
                { name: DynamicAData[1].name, description: system.db.Enum.getRow(DynamicAData[1].enum_id).description }
            ]);
        });

        it('should join B with A', async () => {
            const result = await system.B.getAWithB();
            expect(result).toEqual([
                { value: DynamicBData[0].value, name: DynamicAData[DynamicBData[0].a_id - 1].name },
                { value: DynamicBData[1].value, name: DynamicAData[DynamicBData[1].a_id - 1].name },
            ]);
        });
    });

    describe('System Transaction Methods', () => {
        it('should handle transactions in services', async () => {
            const trxSystem = await system.transaction();
            expect(trxSystem.level).toBe(1);

            const rowA = await trxSystem.A.db.A.insert({ enum_id: 3, name: 'Transaction Row' });
            const rowB = await trxSystem.B.db.B.insert({ a_id: rowA.id, value: 300.5 });

            await trxSystem.commit();

            const resultA = await system.A.db.A.select(rowA.id);
            const resultB = await system.B.db.B.select(rowB.id);

            expect(resultA).toMatchObject(rowA);
            expect(resultB).toMatchObject(rowB);
        });

        it('should rollback transactions in services', async () => {
            const trxSystem = await system.transaction();
            expect(trxSystem.level).toBe(1);

            const rowA = await trxSystem.A.db.A.insert({ enum_id: 3, name: 'Rollback Row' });
            await trxSystem.rollback();

            const result = await system.A.db.A.select(rowA.id);
            expect(result).toBeUndefined();
        });

        it('should handle nested transactions commit in services', async () => {
            const trxSystem = await system.transaction();
            const nestedTrxSystem = await trxSystem.transaction();
            expect(nestedTrxSystem.level).toBe(2);

            const rowA = await nestedTrxSystem.A.db.A.insert({ enum_id: 3, name: 'Nested Transaction Row' });

            await nestedTrxSystem.commit();
            const result1 = await trxSystem.A.db.A.select(rowA.id);
            expect(result1).toEqual(rowA);

            await trxSystem.commit();
            const result2 = await system.A.db.A.select(rowA.id);
            expect(result2).toEqual(rowA);
        });

        it('should handle nested transactions rollback in services', async () => {
            const trxSystem = await system.transaction();
            const nestedTrxSystem = await trxSystem.transaction();
            expect(nestedTrxSystem.level).toBe(2);

            const rowA = await nestedTrxSystem.A.db.A.insert({ enum_id: 3, name: 'Nested Transaction Row' });

            await nestedTrxSystem.commit();
            const result1 = await trxSystem.A.db.A.select(rowA.id);
            expect(result1).toEqual(rowA);

            await trxSystem.rollback();
            const result2 = await system.A.db.A.select(rowA.id);
            expect(result2).toBeUndefined();
        });
    });
});
