import { randomUUID } from "crypto";
import short from 'short-uuid';

/**
 * Generates a new UUID (version 4).
 *
 * @returns {string} A newly generated UUID.
 */
const generateUUID = (): string => {
    return randomUUID();
};

const base36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Compresses a UUID using a specified alphabet and optional grouping and joining options.
 *
 * @param {string} uuid - The UUID to compress.
 * @param {Object} [options] - Optional parameters for compression.
 * @param {string} [options.alphabet] - The alphabet to use for compression. Defaults to base36.
 * @param {number} [options.group] - The number of characters in each group.
 * @param {string} [options.join] - The string to join the groups with. Defaults to ''.
 * @returns {string} The compressed UUID.
 */
const compress = (uuid: string, options?: { alphabet?: string; group?: number; join?: string; }): string => {
    const alphabet = options?.alphabet ?? base36;

    const split = options?.group;
    const join = options?.join ?? '';

    const translator = short(alphabet);

    let compressed: string = translator.fromUUID(uuid);

    if (split)
        compressed = compressed.match(new RegExp(`.{${split}}`, 'g'))?.join(join) ?? '';

    return compressed;
};

/**
 * Deflates a compressed UUID back to its original form using a specified alphabet.
 *
 * @param {string} compressed - The compressed UUID to deflate.
 * @param {Object} [options] - Optional parameters for deflation.
 * @param {string} [options.alphabet] - The alphabet to use for deflation. Defaults to base36.
 * @returns {string} The original UUID.
 */
const deflate = (compressed: string, options?: { alphabet?: string; }): string => {
    const alphabet = options?.alphabet ?? base36;

    const translator = short(alphabet);

    compressed = compressed.replaceAll(new RegExp(`[^${alphabet}]`, 'g'), '');

    return translator.toUUID(compressed);
};

/**
 * Type representing a UUID string format.
 */
export type Uuid = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Represents an empty UUID.
 * 
 * @readonly
 * @constant
 */
const empty: Uuid = '00000000-0000-0000-0000-000000000000';

/**
 * A utility object for generating, compressing, and deflating UUIDs.
 *
 * @namespace
 */
export const Uuid = Object.freeze({
    generate: generateUUID,
    compress,
    deflate,
    get empty() { return empty; }
});
