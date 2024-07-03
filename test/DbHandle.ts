import knex from "knex";
import nodefs from 'fs';
import nodepath from 'path';
import nodeos from 'os';
import { Knexable } from "@";

export type DbHandle = {
    db: Knexable;
    filename: string;
    destroy: () => Promise<void>;
};

const makeTempFile = (path?: string): string => {
    const temp = path ?? nodeos.tmpdir();

    const tempfile = nodepath.join(temp, `temp_${Date.now()}.sqlite3`);

    nodefs.closeSync(nodefs.openSync(tempfile, 'w'));

    console.log(`CREATED ${tempfile}`);

    return tempfile;
};

export type DbHandleOpts = { source: 'memory'; } | { source: 'file', keep?: boolean, path?: string; };

export const makeDbHandle = (opts: DbHandleOpts): DbHandle => {
    const filename = opts.source === 'file' ? makeTempFile(opts.path) : ':memory:';

    const db = knex({
        client: 'better-sqlite3',
        connection: { filename },
        useNullAsDefault: true,
    });

    const destroy = async () => {
        await db.destroy();

        if (opts.source === 'file') {
            if (!opts.keep) {
                nodefs.rmSync(filename);

                console.log(`DELETED ${filename}`);
            }
        }
    };

    return { db, filename, destroy };
};
