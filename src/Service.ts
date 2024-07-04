import { Database } from "./Database";

export abstract class Service<DB extends Database<any>> {
    #db?: DB;

    get db(): DB {

        if (!this.#db)
            throw new Error('Service is not connected.');

        return this.#db;
    }

    connect(db: DB): Service<DB> {
        const service = this.__clone();
        service.#db = db;
        return service;
    }

    protected abstract __clone(): Service<DB>;
}