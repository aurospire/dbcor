import { Knex } from "knex";
import { Knexable } from "./Knexable";
import { Row, SelectRow, WhereRow } from "./Row";
import { TableCallback, superchargeTable } from "./TableUtil";

/**
 * Properties required to define a table.
 *
 * @template R - The row type.
 */
export type TableProps<R> = {
    name: string;
    row: R;
    create: TableCallback;
};

/**
 * Abstract class representing a table with generic row type.
 *
 * @template R - The row type.
 */
export abstract class Table<R extends Row> {
    #knex?: Knexable;
    #props: TableProps<R> & { columns: Readonly<string[]>; };

    /**
     * Constructs a Table instance.
     *
     * @param {Table<R> | TableProps<R>} from - Another table instance or table properties.
     */
    constructor(from: Table<R> | TableProps<R>) {
        if (from instanceof Table) {
            this.#props = from.#props;
        }
        else {
            this.#props = Object.freeze({
                name: from.name,
                row: Object.freeze({ ...from.row }),
                columns: Object.freeze(Object.keys(from.row)),
                create: from.create,
            });
        }
    }

    /**
     * Clones the current table instance.
     *
     * @returns {Table<R>} A clone of the current table instance.
     */
    protected abstract __clone(): Table<R>;

    /**
     * Connects the table to a Knex instance.
     *
     * @param {Knexable} knex - The Knex instance.
     * @returns {Table<R>} A new table instance connected to the Knex instance.
     */
    connect(knex: Knexable) {
        const model = this.__clone();
        model.#knex = knex;
        return model;
    }

    /**
     * Gets the Knex instance.
     *
     * @throws {Error} If the model is not connected.
     * @returns {Knexable} The Knex instance.
     */
    get knex() {
        if (!this.#knex) throw new Error('Model is not connected.');
        return this.#knex;
    }

    /**
     * Gets the table name.
     *
     * @returns {string} The table name.
     */
    get name() {
        return this.#props.name;
    }

    /**
     * Gets the row definition.
     *
     * @returns {R} The row definition.
     */
    get row() {
        return this.#props.row;
    }

    /**
     * Gets the columns of the table.
     *
     * @returns {Readonly<string[]>} The table columns.
     */
    get columns() {
        return this.#props.columns;
    }

    /**
     * Gets a table alias.
     *
     * @param {string} alias - The table alias.
     * @returns {string} The alias string.
     */
    as(alias: string) {
        return `${this.name} AS ${alias}`;
    }


    #columnName(name: string, column: string) {
        return column.match(/\./) ? column : `${name}.${column}`;
    }

    /**
     * Creates a tuple representing the join condition.
     *
     * @param {string | undefined} alias - The table alias.
     * @param {string} a - The column name in the current table.
     * @param {string} b - The table or alias name or column name in the joined table.
     * @param {string} [c] - The column name in the joined table.
     * @returns {[name: string, from: string, to: string]} A tuple representing the join condition.
     */
    #on(alias: string | undefined, a: string, b: string, c?: string): [name: string, from: string, to: string] {
        const from = this.#columnName(alias ?? this.name, a);
        const to = c ? `${b}.${c}` : b;
        return [alias ? this.as(alias) : this.name, from, to];
    }

    /**
     * Creates a tuple representing the join condition for a given column pair.
     *
     * @param {string} fromColumn - The column name in the current table.
     * @param {string} toColumn - The column name in the joined table.
     * @returns {[name: string, from: string, to: string]} A tuple representing the join condition.
     */
    on(fromColumn: string, toColumn: string): [name: string, from: string, to: string];

    /**
     * Creates a tuple representing the join condition for a given column pair.
     *
     * @param {string} fromColumn - The column name in the current table.
     * @param {string} toTable - The table or alias name of the joined table.
     * @param {string} toColumn - The column name in the joined table.
     * @returns {[name: string, from: string, to: string]} A tuple representing the join condition.
     */
    on(fromColumn: string, toTable: string, toColumn: string): [name: string, from: string, to: string];
    on(a: string, b: string, c?: string, d?: string) {
        return this.#on(undefined, a, b, c);
    }

    /**
     * Creates a tuple representing the join condition for a given column pair with an alias.
     *
     * @param {string} alias - The table alias.
     * @param {string} fromColumn - The column name in the current table.
     * @param {string} toColumn - The column name in the joined table.
     * @returns {[name: string, from: string, to: string]} A tuple representing the join condition.
     */
    asOn(alias: string, fromColumn: string, toColumn: string): [name: string, from: string, to: string];

    /**
     * Creates a tuple representing the join condition for a given column pair with an alias.
     *
     * @param {string} alias - The table alias.
     * @param {string} fromColumn - The column name in the current table.
     * @param {string} toTable - The table or alias name of the joined table.
     * @param {string} toColumn - The column name in the joined table.
     * @returns {[name: string, from: string, to: string]} A tuple representing the join condition.
     */
    asOn(alias: string, fromColumn: string, toTable: string, toColumn: string): [name: string, from: string, to: string];
    asOn(alias: string, a: string, b: string, c?: string, d?: string): [name: string, from: string, to: string] {
        return this.#on(alias, a, b, c);
    }


    /**
     * Creates a query builder for the table.
     *
     * @returns {Knex.QueryBuilder} The query builder.
     */
    query() {
        return this.knex(this.name);
    }

    /**
     * Creates a query builder for the table with an alias.
     *
     * @param {string} alias - The alias for the table.
     * @throws {Error} If the model is not connected.
     * @returns {Knex.QueryBuilder} The query builder.
     */
    queryAs(alias: string) {
        if (!this.#knex) throw new Error('Model is not connected.');
        return this.#knex(this.as(alias));
    }

    /**
     * Selects a row by its ID.
     *
     * @param {number} id - The ID of the row.
     * @returns {Promise<SelectRow<R, 'User'> | undefined>} A promise that resolves to the selected row in user format, or undefined if not found.
     */
    async select(id: number): Promise<SelectRow<R, 'User'> | undefined> {
        const raw = await this.query().where({ id }).first();
        return raw ? Row.select.toUser(this.row, raw) : raw;
    }

    /**
     * Selects rows by a condition.
     *
     * @param {WhereRow<R, 'User'>} condition - The condition to select rows.
     * @returns {Promise<SelectRow<R, 'User'>[]>} A promise that resolves to the selected rows in user format.
     */
    async selectBy(condition: WhereRow<R, 'User'>): Promise<SelectRow<R, 'User'>[]> {
        const raw = await this.query().where(Row.where.toDatabase(this.row, condition));
        return raw.map(row => Row.select.toUser(this.row, row));
    }

    /**
     * Selects all rows.
     *
     * @returns {Promise<SelectRow<R, 'User'>[]>} A promise that resolves to all rows in user format.
     */
    async selectAll(): Promise<SelectRow<R, 'User'>[]> {
        const raw = await this.query().select('*');
        return raw.map(row => Row.select.toUser(this.row, row));
    }

    #count = async (query: Knex.QueryBuilder): Promise<number> => {
        const result = await query.count();
        return result[0]['count(*)'];
    };

    /**
     * Counts the number of rows.
     *
     * @returns {Promise<number>} A promise that resolves to the number of rows.
     */
    async count(): Promise<number> {
        return await this.#count(this.query());
    }

    /**
     * Counts the number of rows matching a condition.
     *
     * @param {WhereRow<R, 'User'>} condition - The condition to count rows.
     * @returns {Promise<number>} A promise that resolves to the number of matching rows.
     */
    async countOf(condition: WhereRow<R, 'User'>): Promise<number> {
        return await this.#count(this.query().where(Row.where.toDatabase(this.row, condition)));
    }

    /**
     * Creates the table in the database.
     */
    async create() {
        await Table.create(this.knex, this.name, this.#props.create);
    }

    /**
     * Drops the table from the database.
     */
    async drop() {
        await Table.drop(this.knex, this.name);
    }

    /**
     * Creates a table in the database.
     *
     * @param {Knex} knex - The Knex instance.
     * @param {string} name - The name of the table.
     * @param {TableCallback} callback - The callback to define the table schema.
     */
    static async create(knex: Knex, name: string, callback: TableCallback) {
        await knex.schema.createTable(name, table => {
            const builder = superchargeTable(knex, table, name);
            callback(builder);
        });
    }

    /**
     * Alters a table in the database.
     *
     * @param {Knex} knex - The Knex instance.
     * @param {string} name - The name of the table.
     * @param {TableCallback} callback - The callback to define the table schema.
     */
    static async alter(knex: Knex, name: string, callback: TableCallback) {
        await knex.schema.alterTable(name, table => {
            const builder = superchargeTable(knex, table, name);
            callback(builder);
        });
    }

    /**
     * Drops a table from the database.
     *
     * @param {Knex} knex - The Knex instance.
     * @param {string} name - The name of the table.
     */
    static async drop(knex: Knex, name: string) {
        await knex.schema.dropTableIfExists(name);
    }

    /**
     * Type helper for SelectRow.
     *
     * @throws {Error} This property is just used as a type helper.
     * @returns {SelectRow<R>} This method always throws an error.
     */
    get Select(): SelectRow<R> { throw new Error('This property is just used as a type helper'); }

    /**
     * Type helper for WhereRow.
     *
     * @throws {Error} This property is just used as a type helper.
     * @returns {WhereRow<R>} This method always throws an error.
     */
    get Where(): WhereRow<R> { throw new Error('This property is just used as a type helper'); }
}
