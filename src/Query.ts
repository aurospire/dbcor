import { Knex } from "knex";
import { Row, SelectRow } from "./Row";

/**
 * Queries all rows from the database and converts them to user format.
 *
 * @template R - The row type.
 * @param {R} row - The row definition.
 * @param {Knex.QueryBuilder} from - The query builder instance.
 * @returns {Promise<SelectRow<R>[]>} A promise that resolves to an array of rows in user format.
 */
const queryAll = async <R extends Row>(row: R, from: Knex.QueryBuilder): Promise<SelectRow<R>[]> => {
    const results: SelectRow<R, 'Database'>[] = await from;

    return results.map(result => Row.select.toUser(row, result));
};

/**
 * Queries a single row from the database and converts it to user format.
 *
 * @template R - The row type.
 * @param {R} row - The row definition.
 * @param {Knex.QueryBuilder} from - The query builder instance.
 * @returns {Promise<SelectRow<R> | undefined>} A promise that resolves to a row in user format or undefined if no row was found.
 */
const queryOne = async <R extends Row>(row: R, from: Knex.QueryBuilder): Promise<SelectRow<R> | undefined> => {
    const results: SelectRow<R, 'Database'>[] = await from;

    return results.length ? Row.select.toUser(row, results[0]) : undefined;
};

/**
 * Provides query functions to interact with the database.
 */
export const Query = Object.freeze({
    all: queryAll,
    one: queryOne
});
