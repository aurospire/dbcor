import { ColumnKind, ColumnDatabaseType, ColumnModifiable } from "./ColumnKind";

/**
 * Represents a column definition with its properties and transformation methods.
 *
 * @template Kind - The kind of the column.
 * @template UserType - The type of the value as used by the user.
 * @template Required - A boolean indicating whether the column is required.
 */
export type Column<Kind extends ColumnKind, UserType, Required extends boolean> = {
    /** The kind of the column. */
    kind: Kind;

    /** The default value of the column. */
    default: UserType;

    /** Indicates whether the column is required. */
    required: Required;

    /** Indicates whether the column is modifiable. */
    modifiable: ColumnModifiable<Kind>;

    /**
     * Function to transform a database value to a user value.
     *
     * @param {ColumnDatabaseType<Kind>} value - The value from the database.
     * @returns {UserType} The transformed user value.
     */
    toUser: (value: ColumnDatabaseType<Kind>) => UserType;

    /**
     * Function to transform a user value to a database value.
     *
     * @param {UserType} value - The value from the user.
     * @returns {ColumnDatabaseType<Kind>} The transformed database value.
     */
    toDatabase: (value: UserType) => ColumnDatabaseType<Kind>;
};
