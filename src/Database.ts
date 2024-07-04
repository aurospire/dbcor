import { Knex } from "knex";
import { Table } from "./Table";

/**
 * Represents a database object containing tables.
 *
 * @template D - The record of table names to Table instances.
 */
export type DatabaseObject<D extends Record<string, Table<any>>> = D;

/**
 * Represents a function that connects to a database and returns a Database instance.
 *
 * @template D - The database object type.
 */
export type DatabaseConnector<D extends DatabaseObject<any>> = (knex: Knex, debug?: boolean) => Database<D>;

/**
 * Infers the database object type from a DatabaseConnector.
 *
 * @template C - The DatabaseConnector type.
 */
export type InferDatabaseObject<C extends DatabaseConnector<any>> = C extends DatabaseConnector<infer D> ? D : never;

/**
 * Represents a database instance with transaction management.
 *
 * @template D - The database object type.
 */
export type Database<D extends DatabaseObject<any>> = D & {
    readonly knex: Knex;
    readonly level: number;
    readonly closed: boolean;
    transaction: () => Promise<Database<D>>;
    rollback: () => Promise<void>;
    commit: () => Promise<void>;
};

const keys = new Set(['knex', 'transaction', 'commit', 'rollback', 'level', 'closed']);

const handler = {
    get: (target: any, key: string) => {
        if (keys.has(key))
            return target[key];

        const model = target.connected[key] ?? (target.connected[key] = target.models[key]?.connect(target.knex));
        return model ?? undefined;
    },
    getOwnPropertyDescriptor: (target: any, key: string): PropertyDescriptor | undefined => {
        return Object.getOwnPropertyDescriptor(target.models, key);
    },
    has: (target: any, key: string) => {
        return key in target.models;
    },
    ownKeys: (target: any) => {
        return Reflect.ownKeys(target.models);
    }
};

/**
 * Creates a database connector function.
 *
 * @template D - The database object type.
 * @param {D} database - The database object.
 * @returns {DatabaseConnector<D>} The database connector function.
 */
export const makeDatabaseConnector = <D>(database: D): DatabaseConnector<D> => (knex: Knex): Database<D> => {
    const db = { ...database };

    /**
     * Creates a proxy for the database to manage transactions.
     *
     * @param {{ isBase: true; knex: Knex; } | { isBase: false; knex: Knex.Transaction; }} from - The initial Knex instance or transaction.
     * @param {{ get closed(): boolean; level: number; }} [parent] - The parent transaction status.
     * @returns {Database<D>} The database proxy.
     */
    const createDatabaseProxy = (from: { isBase: true; knex: Knex; } | { isBase: false; knex: Knex.Transaction; }, parent?: { get closed(): boolean; level: number; }): Database<D> => {
        let closed: boolean = false;

        const status = {
            get closed() {
                return parent?.closed || closed;
            },
            get level() {
                return (parent?.level ?? -1) + 1;
            }
        };

        return new Proxy({
            get knex() {
                return from.knex;
            },
            get closed() {
                return status.closed;
            },
            get level() {
                return status.level;
            },
            isBase: from.isBase,
            models: db,
            connected: {},
            /**
             * Starts a new transaction.
             *
             * @returns {Promise<Database<D>>} A promise that resolves to a new database proxy for the transaction.
             * @throws {Error} If the transaction has already been completed.
             */
            async transaction() {
                if (status.closed)
                    throw new Error('Transaction has already been completed');

                const transaction = await this.knex.transaction();

                return createDatabaseProxy({ isBase: false, knex: transaction }, status);
            },
            /**
             * Commits the current transaction.
             *
             * @returns {Promise<void>} A promise that resolves when the transaction is committed.
             * @throws {Error} If not currently in a transaction or if the transaction has already been completed.
             */
            async commit() {
                if (this.isBase)
                    throw new Error('Not currently in a transaction');
                else if (status.closed || this.knex.isCompleted())
                    throw new Error('Transaction has already been completed');
                else {
                    await this.knex.commit();
                    closed = true;
                }
            },
            /**
             * Rolls back the current transaction.
             *
             * @returns {Promise<void>} A promise that resolves when the transaction is rolled back.
             * @throws {Error} If not currently in a transaction or if the transaction has already been completed.
             */
            async rollback() {
                if (this.isBase)
                    throw new Error('Not currently in a transaction');
                else if (status.closed || this.knex.isCompleted())
                    throw new Error('Transaction has already been completed');
                else {
                    await this.knex.rollback();
                    closed = true;
                }
            }
        }, handler) as Database<D>;
    };

    return createDatabaseProxy({ isBase: true, knex });
};
