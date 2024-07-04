import { Knexable } from "@/Knexable";
import * as m from "@/ColumnFunctions";
import { Row } from "@/Row";
import { Table, TableProps } from "@/Table";
import { TableCallback } from "@/TableUtil";
import { expectType } from "jestype";
import { DbHandle, makeDbHandle } from "./DbHandle";

const MainName = 'Main';
const Alias = 'M';
const PkColumn = 'id';
const OtherName = 'Other';
const FkColumn = 'main_id';

const MainRow = {
    id: m.id(),
    created: m.created(),
    name: m.string(true),
    active: m.boolean(true),
    age: m.integer(false)
};

class TestTable<R extends Row> extends Table<R> {
    constructor(from: TestTable<R> | TableProps<R>) {
        super(from);
    }

    override connect(knex: Knexable): TestTable<R> {
        return super.connect(knex) as TestTable<R>;
    }

    protected __clone(): Table<R> {
        return new TestTable<R>(this);
    }
}

const MainCreator: TableCallback = table => {
    table.id('auto');
    table.created().notNullable();
    table.string('name', 255).notNullable().unique();
    table.boolean('active').notNullable();
    table.integer('age').nullable();
};

const makeTable = <R extends Row>(props: { name: string, row: R, create: TableCallback, })
    : TestTable<R> => new TestTable(props) as TestTable<R>;

const MainTable = makeTable({ name: MainName, row: MainRow, create: MainCreator, });

describe('Table', () => {
    let handle: DbHandle;
    let table: typeof MainTable;

    beforeAll(async () => {
        //handle = makeDbHandle({ source: 'file', keep: true, path: '.' });
        handle = makeDbHandle({ source: 'memory' });

        table = MainTable.connect(handle.db);

        await table.create();
    });

    afterAll(async () => {
        //await table.drop();

        await handle.destroy();
    });


    it('should create a new table instance', () => {
        expect(table.name).toBe(MainName);
        expect(table.row).toStrictEqual(MainRow);
    });

    it('should test table creation', async () => {
        expect(await handle.db.schema.hasTable(table.name)).toBe(true);
    });

    it('should test .connect and immutability', () => {
        const unconnected = MainTable;
        const connected = unconnected.connect(handle.db);

        expect(unconnected).not.toBe(connected);

        expect(() => unconnected.knex).toThrow();
        expect(() => unconnected.query()).toThrow();

        expect(connected.knex).toBe(handle.db);
        expect(() => connected.query()).not.toThrow();
    });

    describe('Naming', () => {
        it('should return correct alias format', () => {
            expect(table.as(Alias)).toBe(`${MainName} AS ${Alias}`);
        });

        describe('on method', () => {
            it('should generate correct on clause names with fromColumn, toTable, toColumn', () => {
                const onClause = table.on(PkColumn, OtherName, FkColumn);
                expect(onClause).toEqual([MainName, `${MainName}.${PkColumn}`, `${OtherName}.${FkColumn}`]);
            });

            it('should generate correct on clause with fromColumn, toColumn', () => {
                const onClause = table.on(PkColumn, `${OtherName}.${FkColumn}`);
                expect(onClause).toEqual([MainName, `${MainName}.${PkColumn}`, `${OtherName}.${FkColumn}`]);
            });
        });

        describe('asOn method', () => {
            it('should generate correct on clause names with fromColumn, toTable, toColumn', () => {
                const onClause = table.asOn(Alias, PkColumn, OtherName, FkColumn);
                expect(onClause).toEqual([table.as(Alias), `${Alias}.${PkColumn}`, `${OtherName}.${FkColumn}`]);
            });

            it('should generate correct on clause with fromColumn, toColumn', () => {
                const onClause = table.asOn(Alias, PkColumn, `${OtherName}.${FkColumn}`);
                expect(onClause).toEqual([table.as(Alias), `${Alias}.${PkColumn}`, `${OtherName}.${FkColumn}`]);
            });
        });
    });

    describe('query methods', () => {
        it('should return correct query builder instance from query method', () => {
            const connectedTable = table.connect(handle.db);
            const queryBuilder = connectedTable.query();
            expect(queryBuilder.toString()).toBe(handle.db(MainName).toString());
        });

        it('should return correct query builder instance from queryAs method', () => {
            const connectedTable = table.connect(handle.db);
            const queryBuilder = connectedTable.queryAs(Alias);
            expect(queryBuilder.toString()).toBe(handle.db(table.as(Alias)).toString());
        });
    });

    describe('select methods', () => {
        let connected: typeof table;

        const rows = [
            { name: 'Alice', active: true, age: 37 },
            { name: 'Bob', active: false, age: 35 },
            { name: 'Charles', active: false }
        ];

        beforeAll(async () => {
            connected = table.connect(handle.db) as any;

            await connected.query().insert(rows);
        });

        afterAll(async () => {
            await connected.query().truncate();
        });

        it('.selectAll', async () => {
            const selected = await connected.selectAll();

            expect(selected.length).toBe(rows.length);
            expect(selected.map(row => row.id)).toEqual([1, 2, 3]);
            expect(selected.map(row => row.name)).toEqual(rows.map(row => row.name));
            expect(selected.map(row => row.active)).toEqual(rows.map(row => row.active));
            expect(selected.map(row => row.age)).toEqual(rows.map(row => row.age ?? null));
        });

        it('.select', async () => {
            const id = 0;
            const selected = await connected.select(id + 1);

            expect(selected).toMatchObject({
                id: id + 1,
                name: rows[id].name,
                active: rows[id].active,
                age: rows[id].age,
            });
        });

        [true, false].forEach(active => {
            it('.selectBy', async () => {
                const selected = await connected.selectBy({ active });

                const filtered = rows
                    .filter(row => row.active === active)
                    .sort((a, b) => a.name.localeCompare(b.name));

                expect(selected.sort((a, b) => a.name.localeCompare(b.name)))
                    .toMatchObject(filtered);
            });
        });

        it('count', async () => {
            const count = await connected.count();

            expect(count).toBe(rows.length);
        });

        [true, false].forEach(active => {
            it('.countOf', async () => {
                const count = await connected.countOf({ active });

                const filtered = rows
                    .filter(row => row.active === active);

                expect(count).toBe(filtered.length);
            });
        });
    });
});
