import { randomUUID } from "crypto";
import short from 'short-uuid';

const generateUUID = () => {
    return randomUUID();
};

const base36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const compress = (uuid: string, options?: { alphabet?: string; group?: number; join?: string; }) => {
    const alphabet = options?.alphabet ?? base36;

    const split = options?.group;
    const join = options?.join ?? '';

    const translator = short(alphabet);

    let compressed: string = translator.fromUUID(uuid);

    if (split)
        compressed = compressed.match(new RegExp(`.{${split}}`, 'g'))?.join(join) ?? '';

    return compressed;
};

const deflate = (compressed: string, options?: { alphabet?: string; }) => {
    const alphabet = options?.alphabet ?? base36;

    const translator = short(alphabet);

    compressed = compressed.replaceAll(new RegExp(`[^${alphabet}]`, 'g'), '');

    return translator.toUUID(compressed);
};

export type Uuid = `${string}-${string}-${string}-${string}-${string}`;

const empty: Uuid = '00000000-0000-0000-0000-000000000000';

export const Uuid = Object.freeze({
    generate: generateUUID,
    compress,
    deflate,
    get empty() { return empty; }
});
