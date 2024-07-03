import { DatabaseDate, DatabaseDateType } from "./DatabaseDate";
import { Column } from "./Column";
import { DateTime } from "luxon";
import { Uuid } from "./Uuid";
import { ColumnKind } from "./ColumnKind";

/**
 * Utility function to define a column.
 *
 * @template Kind - The kind of the column.
 * @template UserType - The type of the value as seen by the user.
 * @template Required - A boolean indicating whether the column is required.
 * @param {Column<Kind, UserType, Required>} from - The column definition.
 * @returns {Column<Kind, UserType, Required>} The column definition.
 */
export const column = <Kind extends ColumnKind, UserType, Required extends boolean>(from: Column<Kind, UserType, Required>) => from;

/**
 * Creates a boolean column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @returns {Column<'boolean', boolean, Required>} The column definition.
 */
export const booleanColumn = <Required extends boolean>(required: Required): Column<'boolean', boolean, Required> => {
    return {
        kind: 'boolean',
        default: false,
        required,
        modifiable: true,
        toUser: Boolean,
        toDatabase: Boolean
    };
};

/**
 * Creates an integer column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @returns {Column<'integer', number, Required>} The column definition.
 */
export const integerColumn = <Required extends boolean>(required: Required): Column<'integer', number, Required> => {
    return {
        kind: 'integer',
        default: 0,
        required,
        modifiable: true,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates a number column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @returns {Column<'number', number, Required>} The column definition.
 */
export const numberColumn = <Required extends boolean>(required: Required): Column<'number', number, Required> => {
    return {
        kind: 'number',
        default: 0,
        required,
        modifiable: true,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates a string column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @returns {Column<'string', string, Required>} The column definition.
 */
export const stringColumn = <Required extends boolean>(required: Required): Column<'string', string, Required> => {
    return {
        kind: 'string',
        default: '',
        required,
        modifiable: true,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates a datetime column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @param {DatabaseDateType} [type] - The type of the date in the database.
 * @returns {Column<'datetime', DateTime, Required>} The column definition.
 */
export const datetimeColumn = <Required extends boolean>(required: Required, type?: DatabaseDateType): Column<'datetime', DateTime, Required> => {
    return {
        kind: 'datetime',
        default: DateTime.fromMillis(0),
        required,
        modifiable: true,
        toUser: value => DatabaseDate.toDateTime(value),
        toDatabase: value => DatabaseDate.fromDateTime(value, type)
    };
};

/**
 * Creates a UUID column definition.
 *
 * @template Required - A boolean indicating whether the column is required.
 * @param {Required} required - Indicates if the column is required.
 * @returns {Column<'uuid', string, Required>} The column definition.
 */
export const uuidColumn = <Required extends boolean>(required: Required): Column<'uuid', string, Required> => {
    return {
        kind: 'uuid',
        default: Uuid.empty,
        required,
        modifiable: true,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates an ID column definition.
 *
 * @returns {Column<'id', number, true>} The column definition.
 */
export const idColumn = (): Column<'id', number, true> => {
    return {
        kind: 'id',
        default: 1,
        required: true,
        modifiable: false,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates an external UUID column definition.
 *
 * @returns {Column<'external', string, true>} The column definition.
 */
export const externalColumn = (): Column<'external', string, true> => {
    return {
        kind: 'external',
        default: Uuid.empty,
        required: true,
        modifiable: false,
        toUser: value => value,
        toDatabase: value => value
    };
};

/**
 * Creates a created timestamp column definition.
 *
 * @param {DatabaseDateType} [type] - The type of the date in the database.
 * @returns {Column<'created', DateTime, true>} The column definition.
 */
export const createdColumn = (type?: DatabaseDateType): Column<'created', DateTime, true> => {
    return {
        kind: 'created',
        default: DateTime.fromMillis(0),
        required: true,
        modifiable: false,
        toUser: value => DatabaseDate.toDateTime(value),
        toDatabase: value => DatabaseDate.fromDateTime(value, type)
    };
};

/**
 * Creates an updated timestamp column definition.
 *
 * @param {DatabaseDateType} [type] - The type of the date in the database.
 * @returns {Column<'updated', DateTime, true>} The column definition.
 */
export const updatedColumn = (type?: DatabaseDateType): Column<'updated', DateTime, true> => {
    return {
        kind: 'updated',
        default: DateTime.fromMillis(0),
        required: true,
        modifiable: false,
        toUser: value => DatabaseDate.toDateTime(value),
        toDatabase: value => DatabaseDate.fromDateTime(value, type)
    };
};

export {
    booleanColumn as boolean,
    integerColumn as integer,
    numberColumn as number,
    stringColumn as string,
    datetimeColumn as datetime,
    uuidColumn as uuid,
    idColumn as id,
    externalColumn as external,
    createdColumn as created,
    updatedColumn as updated,
};
