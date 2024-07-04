import { DateTime } from 'luxon';
import * as m from './ColumnFunctions';
import { DatabaseDate } from './DatabaseDate';
import { Knexable } from './Knexable';
import { Row, UserRow } from './Row';
import { Table, TableProps } from './Table';
import { TableCallback } from './TableUtil';

/**
 * Type for static row types.
 */
export type StaticRowType = 'base' | 'standard';

/**
 * Type for static row dates.
 */
export type StaticRowDate = `${string}-${string}-${string}`;

/**
 * Definition of the static base row.
 */
export const StaticBaseRow = {
    id: m.integer(true),
    created: m.column<'datetime', StaticRowDate, true>({
        kind: 'datetime',
        default: DateTime.fromMillis(0).toFormat('yyyy-MM-dd') as StaticRowDate,
        modifiable: true,
        required: true,
        toUser: value => DatabaseDate.toDateTime(value).toFormat('yyyy-MM-dd') as StaticRowDate,
        toDatabase: value => value
    })
} satisfies Row;

/**
 * Type for the static base row.
 */
export type StaticBaseRow = typeof StaticBaseRow;

/**
 * Definition of the static standard row.
 */
export const StaticStandardRow = {
    ...StaticBaseRow,
    name: m.string(true),
    description: m.string(true),
} satisfies Row;

/**
 * Type for the static standard row.
 */
export type StaticStandardRow = typeof StaticStandardRow;

/**
 * Combines the StaticBaseRow with additional row definitions.
 *
 * @template R - The row type.
 * @param {R} row - The additional row definition.
 * @returns {StaticBaseRow & R} The combined row definition.
 */
export function StaticRow<R extends Row>(row: R): StaticBaseRow & R;

/**
 * Combines a base and additional row definitions.
 *
 * @template B - The base row type.
 * @template R - The row type.
 * @param {B} base - The base row definition.
 * @param {R} row - The additional row definition.
 * @returns {B & R} The combined row definition.
 */
export function StaticRow<B extends StaticBaseRow & Row, R extends Row>(base: B, row: R): B & R;

/**
 * Combines the StaticBaseRow and additional row definitions.
 *
 * @template F - The static row type 'base'.
 * @template R - The row type.
 * @param {F} from - The static row type 'base'.
 * @param {R} row - The additional row definition.
 * @returns {StaticBaseRow & R} The combined row definition.
 */
export function StaticRow<F extends 'base', R extends Row>(from: F, row: R): StaticBaseRow & R;

/**
 * Combines the StaticStandardRow and additional row definitions.
 *
 * @template F - The static row type 'standard'.
 * @template R - The row type.
 * @param {F} from - The static row type 'standard'
 * @param {R} row - The additional row definition.
 * @returns {StaticStandardRow & R} The combined row definition.
 */
export function StaticRow<F extends 'standard', R extends Row>(from: F, row: R): StaticStandardRow & R;

/**
 * Provides the StaticBaseRow
 *
 * @template F - The static row type.
 * @param {F} from - The static row type 'base'
 * @returns {StaticBaseRow} The StaticBaseRow
 */
export function StaticRow<F extends 'base'>(from: F): StaticBaseRow;

/**
 * Provides the StaticStandardRow
 *
 * @template F - The static row type.
 * @param {F} from - The static row type 'standard'
 * @returns {StaticStandardRow} The StaticStandardRow
 */
export function StaticRow<F extends 'standard'>(from: F): StaticStandardRow;

/**
 * Combines base row with additional row definitions based on the provided parameters.
 *
 * @template B - The base row type or static row type.
 * @template R - The row type.
 * @param {B | StaticRowType | Row} baseOrFrom - The base row definition, static row type, or additional row definition.
 * @param {R} [row] - The additional row definition.
 * @returns {B & R | StaticBaseRow & R | StaticStandardRow & R} The combined row definition.
 */
export function StaticRow<B extends StaticBaseRow & Row | StaticRowType | Row, R extends Row>(
    baseOrFrom: B,
    row?: R
): B & R | StaticBaseRow & R | StaticStandardRow & R {
    let base: StaticBaseRow | undefined;
    let then: Row | undefined = row;

    if (typeof baseOrFrom === 'string') {
        if (baseOrFrom === 'base')
            base = StaticBaseRow;
        else if (baseOrFrom === 'standard')
            base = StaticStandardRow;
        else
            throw new Error("Invalid base type string");
    }
    else if (!then) {
        then = baseOrFrom;
    }

    const result = {
        ...(base ?? StaticBaseRow),
        ...(then ?? {})
    } as B & R | StaticBaseRow & R | StaticStandardRow & R;

    const autos = Object.entries(result).filter(([_, column]) => !column.modifiable);

    if (autos.length)
        throw new Error(`Static Rows cannot contain auto fields: [${autos.map(([key]) => key).join(', ')}]`);

    return result;
}


/**
 * Type for static row based on the given type.
 *
 * @template R - The static row type.
 */
export type StaticRow<R extends (StaticBaseRow | StaticRowType) = StaticBaseRow> =
    R extends 'base' ? StaticBaseRow :
    R extends 'standard' ? StaticStandardRow :
    R;

/**
 * Type for static table creator.
 */
export type StaticTableCreator = StaticRowType | TableCallback | [from: StaticRowType | TableCallback, ...then: TableCallback[]];

const baseCreator: TableCallback = (builder) => {
    builder.id('manual').notNullable();
    builder.date('created').notNullable().index(builder.name.index('created'));
};

const standardCreator: TableCallback = (builder) => {
    builder.string('name').notNullable();
    builder.string('description').notNullable();
};

/**
 * Resolves the table callback based on the static table creator.
 *
 * @param {StaticTableCreator} creator - The static table creator.
 * @returns {TableCallback} The resolved table callback.
 */
const resolveCreator = (creator: StaticTableCreator): TableCallback => {
    const callbacks: TableCallback[] = [baseCreator];

    let first: StaticRowType | TableCallback;
    let rest: TableCallback[] | undefined;

    if (Array.isArray(creator)) {
        [first, ...rest] = creator;
    }
    else {
        first = creator;
    }

    if (typeof first === 'string') {
        if (first === 'standard')
            callbacks.push(standardCreator);
    }
    else if (typeof first === 'function') {
        callbacks.push(first);
    }

    if (rest)
        callbacks.push(...rest);

    return (builder) => {
        for (const callback of callbacks)
            callback(builder);
    };
};

/**
 * Type for static data.
 *
 * @template R - The static row type.
 */
export type StaticData<R extends StaticBaseRow & Row> = { [key: string]: UserRow<R>; };

/**
 * Type for static table keys.
 *
 * @template T - The static table type.
 */
export type StaticTableKeys<T extends StaticTable<any, any>> = T extends StaticTable<any, infer D> ? keyof D : never;

/**
 * Properties for static table.
 *
 * @template R - The static row type.
 * @template D - The static data type.
 */
type StaticTableProps<R extends StaticBaseRow & Row, D extends Readonly<StaticData<R>>> = {
    data: Readonly<D>;
    index: Readonly<Record<number, UserRow<R>>>;
};

/**
 * Class representing a static table with generic row and data types.
 *
 * @template R - The static row type.
 * @template D - The static data type.
 */
export class StaticTable<R extends StaticBaseRow & Row, D extends Readonly<StaticData<R>>> extends Table<R> {
    #props: Readonly<StaticTableProps<R, D>>;

    /**
     * Constructs a StaticTable instance.
     *
     * @param {StaticTable<R, D> | Omit<TableProps<R>, 'create'> & { data: D; create: StaticTableCreator; }} from - Another static table instance or static table properties.
     */
    constructor(from: StaticTable<R, D> | Omit<TableProps<R>, 'create'> & { data: D; create: StaticTableCreator; }) {
        super(from instanceof StaticTable ? from : {
            ...from,
            create: resolveCreator(from.create)
        });

        if (from instanceof StaticTable) {
            this.#props = from.#props;
        }
        else {
            this.#props = this.#validateData(from.data);
        }

        Object.assign(this, this.#props.data);
    }

    /**
     * Validates the static data.
     *
     * @param {D} data - The static data.
     * @returns {StaticTableProps<R, D>} The validated static data.
     */
    #validateData(data: D): StaticTableProps<R, D> {
        const rows: Record<string, UserRow<R>> = {};
        const index: Record<number, UserRow<R>> = {};

        for (let [key, row] of Object.entries(data)) {
            row = this.#validateRow(row);

            rows[key] = row;
            index[row.id] = row;
        }

        return Object.freeze({ data: Object.freeze(rows) as D, index: Object.freeze(index) });
    }

    /**
     * Validates a static row.
     *
     * @param {UserRow<R>} row - The static row.
     * @returns {UserRow<R>} The validated static row.
     * @throws {Error} If the row ID is invalid or the created date is invalid.
     */
    #validateRow(row: UserRow<R>): UserRow<R> {
        if (!Number.isInteger(row.id) || row.id < 1)
            throw new Error('StaticRow.id must be an integer >= 1');

        if (!DatabaseDate.validate.date(row.created))
            throw new Error('StaticRow.created must be in form YYYY-MM-DD');

        return { ...row };
    }

    /**
     * Clones the current static table instance.
     *
     * @returns {StaticTable<R, D>} A clone of the current static table instance.
     */
    protected override __clone() {
        return new StaticTable<R, D>(this);
    }

    /**
     * Connects the static table to a Knex instance.
     *
     * @param {Knexable} knex - The Knex instance.
     * @returns {StaticTable<R, D> & D} A new static table instance connected to the Knex instance.
     */
    override connect(knex: Knexable): StaticTable<R, D> & D {
        return super.connect(knex) as StaticTable<R, D> & D;
    }

    /**
     * Gets the static data.
     *
     * @returns {Readonly<D>} The static data.
     */
    get data() {
        return this.#props.data;
    }

    /**
     * Gets a row by ID or key.
     *
     * @param {number | string | keyof D} by - The ID or key of the row.
     * @returns {UserRow<R>} The row.
     * @throws {Error} If the row is not found.
     */
    getRow(by: number | string | keyof D): UserRow<R> {
        let row: UserRow<R> | undefined;

        if (typeof by === 'number') {
            row = this.#props.index[by];

            if (!row)
                throw new Error(`${this.name} does not contain row key ${by}`);
        }
        else {
            row = this.#props.data[by];

            if (!row)
                throw new Error(`${this.name} does not contain row id ${String(by)}`);
        }

        return row;
    }

    /**
     * Gets the ID of a row by ID or key.
     *
     * @param {number | string | keyof D} by - The ID or key of the row.
     * @returns {number} The row ID.
     */
    getId(by: number | string | keyof D): number {
        return this.getRow(by).id;
    }

    /**
     * Gets all unique sorted created dates.
     *
     * @returns {string[]} The unique created dates.
     */
    getDates(): string[] {
        return [...new Set(Object.values(this.data).map(row => row.created))].sort();
    }

    /**
     * Created the Table in the Database and adds the first date of data
     */
    async initialize() {
        await this.create();
        await this.add(0);
    }

    /**
     * Adds rows to the static table based on the created date.
     *
     * @param {string | number} by - The created date or index of the created date.
     */
    async add(by: string | number) {
        if (typeof by === 'number')
            by = this.getDates()[by];

        const rows = Object.values(this.#props.data).filter(row => row.created === by);

        await this.query().insert(Row.select.toDatabase(this.row, rows));
    }

    /**
     * Removes rows from the static table based on the created date.
     *
     * @param {string | number} by - The created date or index of the created date.
     */
    async remove(by: string | number) {
        if (typeof by === 'number')
            by = this.getDates()[by];

        await this.query().delete().where({ created: by });
    }
}

/**
 * Creates a static table instance.
 *
 * @template R - The static row type.
 * @template D - The static data type.
 * @param {Object} props - The static table properties.
 * @param {string} props.name - The table name.
 * @param {R} props.row - The static row type or row definition.
 * @param {D} props.data - The static data.
 * @param {StaticTableCreator} props.create - The static table creator.
 * @returns {StaticTable<StaticRow<R>, D> & D} The static table instance.
 */
export function makeStaticTable<R extends StaticBaseRow & Row | StaticRowType, D extends StaticData<StaticRow<R>>>(
    props: { name: string; row: R; data: D; create: StaticTableCreator; }
): StaticTable<StaticRow<R>, D> & D {
    const row: any = props.row === 'base' ? StaticBaseRow : props.row === 'standard' ? StaticStandardRow : props.row;

    return new StaticTable<StaticRow<R>, D>({ ...props, row }) as StaticTable<StaticRow<R>, D> & D;
}
