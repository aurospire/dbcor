import { Database } from "./Database";
import { Service } from "./Service";

export type SystemObject<
    D extends Database<any>,
    S extends Record<string, Service<D>>
> = S;

export type SystemConnector<D extends Database<any>, S extends SystemObject<D, any>> = (database: D) => System<D, S>;

export type InferSystemObject<C extends SystemConnector<any, any>> = ReturnType<C>;

export type System<D extends Database<any>, S extends SystemObject<D, any>> = S & {
    readonly db: D;
    readonly level: number;
    readonly closed: boolean;
    transaction: () => Promise<System<D, S>>;
    rollback: () => Promise<void>;
    commit: () => Promise<void>;
};

const keys = new Set(['db', 'level', 'closed', 'transaction', 'commit', 'rollback']);

const handler = {
    get: (target: any, key: string) => {
        if (keys.has(key))
            return target[key];

        const service = target.connected[key] ?? (target.connected[key] = target.sys[key]?.connect(target.db));
        return service ?? undefined;
    },
    getOwnPropertyDescriptor: (target: any, key: string): PropertyDescriptor | undefined => {
        return Object.getOwnPropertyDescriptor(target.sys, key);
    },
    has: (target: any, key: string) => {
        return key in target.sys;
    },
    ownKeys: (target: any) => {
        return Reflect.ownKeys(target.sys);
    }
};

export const makeSystemConnector = <D extends Database<any>>() => <S extends SystemObject<D, any>>(system: S): SystemConnector<D, S> => (database: D): System<D, S> => {
    const createSystemProxy = (db: D): System<D, S> => {
        return new Proxy({
            sys: system,
            connected: {},
            get db(): D {
                return db;
            },
            get closed() {
                return (db as Database<any>).closed;
            },
            get level() {
                return (db as Database<any>).level;
            },
            async transaction() {
                const transaction = await (db as Database<any>).transaction();

                return createSystemProxy(transaction);
            },
            async commit() {
                await (db as Database<any>).commit();
            },
            async rollback() {
                await (db as Database<any>).rollback();
            }
        }, handler) as System<D, S>;
    };

    return createSystemProxy(database);
};