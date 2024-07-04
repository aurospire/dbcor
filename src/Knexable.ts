import { Knex } from "knex";

/**
 * Type representing either a Knex instance or a Knex Transaction instance.
 * 
 * @typedef {Knex | Knex.Transaction} Knexable
 */
export type Knexable = Knex | Knex.Transaction;
