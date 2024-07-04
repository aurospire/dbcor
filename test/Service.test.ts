import * as m from '@/ColumnFunctions';
import { Database, makeDatabaseConnector } from '@/Database';
import { DynamicRow, makeDynamicTable } from '@/DynamicTable';
import { Service } from '@/Service';
import { TableCallback } from '@/TableUtil';
import { DbHandle, makeDbHandle } from './DbHandle';

const TableAName = 'A';
const TableBName = 'B';

const TableARow = DynamicRow({
    name: m.string(true),
    value: m.integer(true),
});

const TableBRow = DynamicRow({
    a_id: m.integer(true),
    description: m.string(true),
});

const TableACreator: TableCallback = t => {
    t.string('name').notNullable();
    t.integer('value').notNullable();
};

const TableBCreator: TableCallback = t => {
    t.fk('A').notNullable(),
        t.string('description').notNullable();
};

const makeTestDatabase = makeDatabaseConnector({
    A: makeDynamicTable({ name: TableAName, row: TableARow, create: TableACreator }),
    B: makeDynamicTable({ name: TableBName, row: TableBRow, create: TableBCreator })
});

class TestService extends Service<Database<ReturnType<typeof makeTestDatabase>>> {
    async joinTables() {
        const query = this.db.knex
            .select('A.name', 'A.value', 'B.description')
            .from('A')
            .join('B', 'A.id', 'B.a_id');

        return await query;
    }

    protected override   __clone() {
        return new TestService();
    }
}

describe('Service', () => {
    let handle: DbHandle;
    let db: Database<ReturnType<typeof makeTestDatabase>>;
    let service: TestService;

    beforeAll(async () => {
        handle = makeDbHandle({ source: 'memory' });
        db = makeTestDatabase(handle.db);
        service = new TestService().connect(db) as any;

        await db.A.create();

        await db.B.create();

        await db.A.insertMany([
            { name: 'A1', value: 10 },
            { name: 'A2', value: 20 },
        ]);

        await db.B.insertMany([
            { a_id: 1, description: 'Desc1' },
            { a_id: 2, description: 'Desc2' },
        ]);
    });

    afterAll(async () => {
        await db.B.drop();
        await db.A.drop();
        await handle.destroy();
    });

    it('should connect service to database', () => {
        expect(() => service.db).not.toThrow();
        expect(service.db).toBe(db);
    });

    it('should throw error if service is not connected', () => {
        const disconnectedService = new TestService();
        expect(() => disconnectedService.db).toThrow('Service is not connected.');
    });

    it('should perform join operation between tables', async () => {
        const result = await service.joinTables();

        expect(result).toMatchObject([
            { name: 'A1', value: 10, description: 'Desc1' },
            { name: 'A2', value: 20, description: 'Desc2' },
        ]);
    });
});
