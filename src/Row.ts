import { ColumnKind, ColumnDatabaseType, ColumnModifiable } from "./ColumnKind";
import { Column } from "./Column";
import { ColumnValue } from "./ColumnValue";

/**
 * Represents a row in the database, with column definitions.
 */
export type Row = Record<string, Column<ColumnKind, any, boolean>>;

/**
 * Represents the source of the row data, either from the user or the database.
 */
export type RowSource = 'User' | 'Database';

/**
 * Infers the column type based on the source.
 *
 * @template C - The column type.
 * @template S - The row source type.
 */
export type ColumnType<C extends Column<ColumnKind, any, boolean>, S extends RowSource = 'User'> = S extends 'User'
    ? ColumnValue<C['default'], C['required']>
    : ColumnValue<ColumnDatabaseType<C['kind']>, C['required']>;

/**
 * Represents a row where all columns are required.
 *a
 * @template R - The row type.
 * @template S - The row source type.
 */
export type SelectRow<R extends Row, S extends RowSource = 'User'> = R extends Row ? {
    -readonly [K in keyof R]: S extends 'User'
    ? ColumnValue<R[K]['default'], R[K]['required']>
    : ColumnValue<ColumnDatabaseType<R[K]['kind']>, R[K]['required']>
} : never;

/**
 * Represents a row where all columns are optional.
 *
 * @template R - The row type.
 * @template S - The row source type.
 */
export type WhereRow<R extends Row, S extends RowSource = 'User'> = R extends Row ? {
    -readonly [K in keyof R]?: S extends 'User'
    ? ColumnValue<R[K]['default'], R[K]['required']>
    : ColumnValue<ColumnDatabaseType<R[K]['kind']>, R[K]['required']>
} : never;

/**
 * Represents a row for insertion, omitting auto columns and making nullable columns optional.
 *
 * @template R - The row type.
 * @template S - The row source type.
 */
export type InsertRow<R extends Row, S extends RowSource = 'User'> =
    {
        -readonly [K in keyof R as ColumnModifiable<R[K]['kind']> extends true
        ? (R[K]['required'] extends true ? K : never)
        : never]: S extends 'User'
        ? ColumnValue<R[K]['default'], R[K]['required']>
        : ColumnValue<ColumnDatabaseType<R[K]['kind']>, R[K]['required']>
    } &
    {
        -readonly [K in keyof R as ColumnModifiable<R[K]['kind']> extends true
        ? (R[K]['required'] extends false ? K : never)
        : never]?: S extends 'User'
        ? ColumnValue<R[K]['default'], R[K]['required']>
        : ColumnValue<ColumnDatabaseType<R[K]['kind']>, R[K]['required']>
    };

/**
 * Represents a row for updating, omitting auto columns and making all columns optional.
 *
 * @template R - The row type.
 * @template S - The row source type.
 */
export type UpdateRow<R extends Row, S extends RowSource = 'User'> = R extends Row ? {
    -readonly [K in keyof R as ColumnModifiable<R[K]['kind']> extends true ? K : never]?: S extends 'User'
    ? ColumnValue<R[K]['default'], R[K]['required']>
    : ColumnValue<ColumnDatabaseType<R[K]['kind']>, R[K]['required']>
} : never;

/**
 * Represents a user row with all columns required.
 *
 * @template R - The row type.
 */
export type UserRow<R extends Row> = SelectRow<R, 'User'>;

/**
 * Represents a database row with all columns required.
 *
 * @template R - The row type.
 */
export type DatabaseRow<R extends Row> = SelectRow<R, 'Database'>;

/**
 * Represents the different actions that can be performed on a row.
 */
export type RowAction = 'Select' | 'Where' | 'Insert' | 'Update';

/**
 * Maps a row action to the corresponding row type.
 *
 * @template R - The row type.
 * @template S - The row source type.
 * @template A - The row action type.
 */
export type ActionRow<R extends Row, S extends RowSource = 'User', A extends RowAction = 'Select'> =
    A extends 'Select' ? SelectRow<R, S> :
    A extends 'Where' ? WhereRow<R, S> :
    A extends 'Insert' ? InsertRow<R, S> :
    A extends 'Update' ? UpdateRow<R, S> :
    never;

/**
 * Converts a row of data using the specified transformation function.
 *
 * @param {string[]} keys - The keys of the row.
 * @param {Row} row - The row definition.
 * @param {Record<string, any>} data - The data to convert.
 * @param {'toUser' | 'toDatabase'} fn - The transformation function to use.
 * @param {boolean} optionals - Whether to include optional columns.
 * @returns {Record<string, any>} The converted row data.
 */
const convertRow = (
    keys: string[],
    row: Row,
    data: Record<string, any>,
    fn: 'toUser' | 'toDatabase',
    optionals: boolean,
): Record<string, any> => {
    return keys.reduce((result, key) => {
        const column = row[key];
        const value = data[key];

        if (value === undefined) {
            if (column.required && !optionals)
                throw new Error(`${key} must have a value`);
        }
        else if (value === null) {
            if (column.required)
                throw new Error(`${key} cannot be null`);
            else
                result[key] = null;
        }
        else {
            result[key] = column[fn](value);
        }

        return result;
    }, {} as Record<string, any>);
};

/**
 * Converts multiple rows of data using the specified transformation function.
 *
 * @param {'toUser' | 'toDatabase'} fn - The transformation function to use.
 * @param {boolean} filter - Whether to filter modifiable columns.
 * @param {boolean} optionals - Whether to include optional columns.
 * @returns {Function} The function to convert rows of data.
 */
const convertRows = (fn: 'toUser' | 'toDatabase', filter: boolean, optionals: boolean) => (
    row: Row,
    data: Record<string, any> | Record<string, any>[]
): Record<string, any> | Record<string, any>[] => {
    // Get allowed keys
    let keys: string[] = !filter
        ? Object.keys(row)
        : Object.keys(row)
            .map(key => row[key].modifiable ? key : undefined)
            .filter((key): key is string => Boolean(key));

    if (Array.isArray(data)) {
        const results: Record<string, any>[] = [];
        for (const item of data) {
            results.push(convertRow(keys, row, item, fn, optionals));
        }
        return results;
    }
    else return convertRow(keys, row, data, fn, optionals);
};

/**
 * Creates a row converter for the specified action.
 *
 * @template A - The row action type.
 * @param {boolean} filter - Whether to filter modifiable columns.
 * @param {boolean} optionals - Whether to include optional columns.
 * @returns {Object} The row converter with `toUser` and `toDatabase` methods.
 */
const rowConverter = <A extends RowAction>(filter: boolean, optionals: boolean) => {
    return Object.freeze({
        toUser: (<R extends Row>(row: R, data: ActionRow<R, 'Database', A>[]): ActionRow<R, 'User', A>[] => convertRows('toUser', filter, optionals)(row, data) as ActionRow<R, 'User', A>[]) as {
            <R extends Row>(row: R, data: ActionRow<R, 'Database', A>): ActionRow<R, 'User', A>;
            <R extends Row>(row: R, data: ActionRow<R, 'Database', A>[]): ActionRow<R, 'User', A>[];
        },
        toDatabase: (<R extends Row>(row: R, data: ActionRow<R, 'User', A>[]): ActionRow<R, 'Database', A>[] => convertRows('toDatabase', filter, optionals)(row, data) as ActionRow<R, 'Database', A>[]) as {
            <R extends Row>(row: R, data: ActionRow<R, 'User', A>): ActionRow<R, 'Database', A>;
            <R extends Row>(row: R, data: ActionRow<R, 'User', A>[]): ActionRow<R, 'Database', A>[];
        },
    });
};

export const Row = Object.freeze({
    select: rowConverter<'Select'>(false, false),
    where: rowConverter<'Where'>(false, true),
    insert: rowConverter<'Insert'>(true, false),
    update: rowConverter<'Update'>(true, true),
});
