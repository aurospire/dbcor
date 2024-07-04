import { DatabaseDate } from "./DatabaseDate";

/**
 * Represents the different kinds of columns that can exist in the database.
 */
export type ColumnKind =
    | 'boolean'
    | 'integer'
    | 'number'
    | 'string'
    | 'datetime'
    | 'uuid'
    | 'id'
    | 'external'
    | 'created'
    | 'updated';

/**
 * Maps each ColumnKind to its corresponding database type.
 *
 * @template Kind - The kind of the column.
 */
export type ColumnDatabaseType<Kind extends ColumnKind> =
    Kind extends 'boolean' ? boolean | number :
    Kind extends 'integer' ? number :
    Kind extends 'number' ? number :
    Kind extends 'string' ? string :
    Kind extends 'datetime' ? DatabaseDate :
    Kind extends 'uuid' ? string :
    Kind extends 'id' ? number :
    Kind extends 'external' ? string :
    Kind extends 'created' ? DatabaseDate :
    Kind extends 'updated' ? DatabaseDate :
    never;

/**
 * Indicates whether a column of a specific kind is modifiable.
 *
 * @template Kind - The kind of the column.
 */
export type ColumnModifiable<Kind extends ColumnKind> =
    Kind extends 'boolean' ? true :
    Kind extends 'integer' ? true :
    Kind extends 'number' ? true :
    Kind extends 'string' ? true :
    Kind extends 'datetime' ? true :
    Kind extends 'uuid' ? true :
    Kind extends 'id' ? false :
    Kind extends 'external' ? false :
    Kind extends 'created' ? false :
    Kind extends 'updated' ? false :
    false;
