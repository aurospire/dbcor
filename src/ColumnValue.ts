/**
 * Represents the value of a column, which can be either of type `T` or `T | null` depending on whether the column is required.
 *
 * @template T - The type of the column value.
 * @template Required - A boolean indicating whether the column is required.
 */
export type ColumnValue<T, Required extends boolean> = Required extends true ? T : T | null;
