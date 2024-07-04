import { Column } from './Column';
import * as m from './ColumnFunctions';
import { DatabaseDate } from './DatabaseDate';
import { Knexable } from './Knexable';
import { InsertRow, Row, SelectRow, UpdateRow, WhereRow } from './Row';
import { Table, TableProps } from './Table';
import { TableCallback } from './TableUtil';

/**
 * Dynamic base row definition.
 */
export const DynamicBaseRow = {
    id: m.id(),
    created: m.created()
} satisfies Row;

/**
 * Type for the dynamic row.
 */
export type DynamicRow = typeof DynamicBaseRow;

/**
 * Combines the dynamic base row with additional row definitions.
 *
 * @template R - The row type.
 * @param {R} row - The additional row definition.
 * @returns {DynamicRow & R} The combined row definition.
 */
export function DynamicRow<R extends Row>(row: R): DynamicRow & R;

/**
 * Combines a dynamic base row and additional row definitions.
 *
 * @template B - The dynamic base row type.
 * @template R - The row type.
 * @param {B} base - The dynamic base row definition.
 * @param {R} row - The additional row definition.
 * @returns {B & R} The combined row definition.
 */
export function DynamicRow<B extends DynamicRow & Row, R extends Row>(base: B, row: R): B & R;

/**
 * Combines a dynamic base row or additional row definitions.
 *
 * @template B - The dynamic base row type or the additional row definition.
 * @template R - The row type.
 * @param {B} baseOrRow - The dynamic base row or additional row definition.
 * @param {R} [row] - The additional row definition.
 * @returns {B & R} The combined row definition.
 */
export function DynamicRow<B extends DynamicRow & Row | R, R extends Row>(baseOrRow: B, row?: R): B & R {
    const base = row ? baseOrRow : DynamicBaseRow;
    const then = row ?? baseOrRow;

    return { ...base, ...then } as B & R;
}

/**
 * Type for dynamic table creator.
 */
export type DynamicCreator = TableCallback | TableCallback[];

const baseCreator: TableCallback = builder => {
    builder.id('auto');
    builder.created();
};

/**
 * Resolves the table callback based on the dynamic table creator.
 *
 * @param {DynamicCreator} creator - The dynamic table creator.
 * @returns {TableCallback} The resolved table callback.
 */
const resolveCreator = (creator: DynamicCreator): TableCallback => {
    const callbacks: TableCallback[] = [baseCreator];

    Array.isArray(creator) ? callbacks.push(...creator) : callbacks.push(creator);

    return builder => {
        for (const callback of callbacks)
            callback(builder);
    };
};

/**
 * Class representing a dynamic table with generic row type.
 *
 * @template R - The dynamic row type.
 */
export class DynamicTable<R extends DynamicRow & Row> extends Table<R> {
    #updates: Readonly<string[]>; // only 'updated' kind column uses this    

    /**
     * Constructs a DynamicTable instance.
     *
     * @param {DynamicTable<R> | Omit<TableProps<R>, 'create'> & { create: DynamicCreator; }} from - Another dynamic table instance or dynamic table properties.
     */
    constructor(from: DynamicTable<R> | Omit<TableProps<R>, 'create'> & { create: DynamicCreator; }) {
        super(from instanceof DynamicTable ? from : {
            ...from,
            create: resolveCreator(from.create)
        });

        this.#updates = from instanceof DynamicTable ?
            from.#updates :
            Object.freeze(this.columns.filter(column => (from.row as Record<string, Column<any, any, boolean>>)[column].kind === 'updated'));
    }

    /**
     * Clones the current dynamic table instance.
     *
     * @returns {DynamicTable<R>} A clone of the current dynamic table instance.
     */
    protected __clone(): DynamicTable<R> {
        return new DynamicTable(this);
    }

    /**
     * Connects the dynamic table to a Knex instance.
     *
     * @param {Knexable} knex - The Knex instance.
     * @returns {DynamicTable<R>} A new dynamic table instance connected to the Knex instance.
     */
    override connect(knex: Knexable): DynamicTable<R> {
        return super.connect(knex) as DynamicTable<R>;
    }

    /**
     * Inserts a row into the table.
     *
     * @param {InsertRow<R>} row - The row to insert.
     * @returns {Promise<SelectRow<R>>} A promise that resolves to the inserted row in user format.
     * @throws {Error} If the row cannot be inserted.
     */
    async insert(row: InsertRow<R>): Promise<SelectRow<R>> {
        const dbRow = Row.insert.toDatabase(this.row, row);

        const results = await this.query().insert(dbRow, this.columns);

        const result = results[0];

        if (!result)
            throw new Error('Unable to insert row');

        return Row.select.toUser(this.row, result);
    }

    /**
     * Inserts multiple rows into the table.
     *
     * @param {InsertRow<R>[]} rows - The rows to insert.
     * @param {number} [batch=500] - The batch size for inserting rows.
     * @param {(rows: InsertRow<R>[], index: number) => void} [onBatch] - Callback function for each batch.
     * @returns {Promise<SelectRow<R>[]>} A promise that resolves to the inserted rows in user format.
     */
    async insertMany(rows: InsertRow<R>[], batch: number = 500, onBatch?: (rows: InsertRow<R>[], index: number) => void): Promise<SelectRow<R>[]> {
        const result: SelectRow<R, 'Database'>[] = [];

        if (batch <= rows.length) {
            const trx = await this.knex.transaction();

            for (let i = 0; i < rows.length; i += batch) {
                const slice = rows.slice(i, i + batch);

                onBatch?.(slice, i);

                result.push(...await trx(this.name).insert(slice, this.columns));
            }

            await trx.commit();
        }
        else {
            onBatch?.(rows, 0);

            result.push(...await this.query().insert(rows, this.columns));
        }

        return Row.select.toUser(this.row, result);
    }

    /**
     * Processes updates for the row, updating 'updated' kind columns.
     *
     * @param {UpdateRow<R>} row - The row to update.
     * @returns {UpdateRow<R, 'Database'>} The processed row with updates.
     */
    #processUpdates(row: UpdateRow<R>): UpdateRow<R, 'Database'> {
        if (this.#updates) {
            for (const update of this.#updates) {
                (row as any)[update] = DatabaseDate.now('string');
            }
        }

        return Row.update.toDatabase(this.row, row);
    }

    /**
     * Updates a row by its ID.
     *
     * @param {number} id - The ID of the row.
     * @param {UpdateRow<R>} row - The row data to update.
     * @returns {Promise<SelectRow<R> | undefined>} A promise that resolves to the updated row in user format or undefined if not found.
     */
    async update(id: number, row: UpdateRow<R>): Promise<SelectRow<R> | undefined> {
        const results = await this.query().where({ id }).update(this.#processUpdates(row), this.columns);

        const result = results[0];

        return result ? Row.select.toUser(this.row, result) : result;
    }

    /**
     * Updates rows by a condition.
     *
     * @param {WhereRow<R>} conditions - The condition to match rows.
     * @param {UpdateRow<R>} row - The row data to update.
     * @returns {Promise<SelectRow<R>[]>} A promise that resolves to the updated rows in user format.
     */
    async updateBy(conditions: WhereRow<R>, row: UpdateRow<R>): Promise<SelectRow<R>[]> {
        const results = await this.query().where(Row.where.toDatabase(this.row, conditions)).update(this.#processUpdates(row), this.columns);

        return Row.select.toUser(this.row, results);
    }

    /**
     * Deletes a row by its ID.
     *
     * @param {number} id - The ID of the row.
     * @returns {Promise<void>} A promise that resolves when the row is deleted.
     */
    async delete(id: number): Promise<void> {
        await this.query().where({ id }).delete();
    }

    /**
     * Deletes rows by a condition.
     *
     * @param {WhereRow<R>} conditions - The condition to match rows.
     * @returns {Promise<void>} A promise that resolves when the rows are deleted.
     */
    async deleteBy(conditions: WhereRow<R>): Promise<void> {
        await this.query().where(Row.where.toDatabase(this.row, conditions)).delete();
    }

    /**
     * Type helper for UpdateRow.
     *
     * @throws {Error} This property is just used as a type helper.
     * @returns {UpdateRow<R>} This method always throws an error.
     */
    get Update(): UpdateRow<R> { throw new Error('This property is just used as a type helper'); }
    
    /**
     * Type helper for InsertRow.
     *
     * @throws {Error} This property is just used as a type helper.
     * @returns {InsertRow<R>} This method always throws an error.
     */
    get Insert(): InsertRow<R> { throw new Error('This property is just used as a type helper'); }
}

/**
 * Creates a dynamic table instance.
 *
 * @template R - The dynamic row type.
 * @param {Object} props - The dynamic table properties.
 * @param {string} props.name - The table name.
 * @param {R} props.row - The dynamic row definition.
 * @param {DynamicCreator} props.create - The dynamic table creator.
 * @returns {DynamicTable<R>} The dynamic table instance.
 */
export function makeDynamicTable<R extends DynamicRow & Row>(
    props: { name: string; row: R; create: DynamicCreator; }
): DynamicTable<R> {
    return new DynamicTable(props) as DynamicTable<R>;
}
