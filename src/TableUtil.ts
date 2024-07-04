import { Knex } from "knex";

// Constraint
const ConstraintCode = {
    'Primary': "PK",
    'Foreign': 'FK',
    'Unique': 'UQ',
    'Index': 'IX',
} as const;

export type Constraint = keyof typeof ConstraintCode;

/**
 * Constructs a constraint name based on the provided type, table, and columns.
 *
 * @param {Constraint} type - The type of the constraint ('Primary', 'Foreign', 'Unique', 'Index').
 * @param {string} table - The name of the table.
 * @param {...string[]} columns - The columns involved in the constraint.
 * @returns {string} The constructed constraint name.
 */
export const Constraint = (type: Constraint, table: string, ...columns: string[]) => {
    return [
        ConstraintCode[type],
        table.toLocaleUpperCase(),
        ...columns.map(column => column.toLocaleUpperCase())
    ].filter(Boolean).join('_');
};

Constraint.Code = ConstraintCode;

/**
 * Generates a foreign key name based on the provided table names, column name, and suffix.
 *
 * @param {string} fromTable - The name of the originating table.
 * @param {string} [toTable=fromTable] - The name of the destination table.
 * @param {string} [name] - The column name.
 * @param {string | null} [suffix='id'] - The suffix to append to the column name.
 * @returns {string} The generated foreign key name.
 */
export const makeForeignKeyName = (fromTable: string, toTable: string = fromTable, name?: string, suffix: string | null = 'id') => {
    // Remove snake case lead
    name = name?.replace(/^_/, '');

    if (!name) {
        name = toTable.trim().replace(new RegExp(`^${fromTable}`), '');

        // Remove snake case lead
        name = name.replace(/^_/, '');

        // Self Link
        if (!name) name = fromTable;
    }

    // Remove snake case lead
    name = name.replace(/^_/, '');

    name = name.toLocaleLowerCase() + (suffix ? ('_' + suffix) : '');

    return name;
};

export type IdType = 'auto' | 'manual';

/**
 * Adds an ID column to the table builder with the specified type and name.
 *
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @param {string} tablename - The name of the table.
 * @returns {(type: IdType, name?: string) => Knex.ColumnBuilder} A function to add the ID column.
 */
const idColumn = (builder: Knex.CreateTableBuilder, tablename: string) => (type: IdType, name: string = 'id') => {
    return (type === 'auto' ? builder.increments(name) : builder.integer(name)).primary();
};

/**
 * Adds a foreign key column to the table builder.
 *
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @param {string} tableName - The name of the table.
 * @returns {(toTable?: string, name?: string, suffix?: string | null) => Knex.ReferencingColumnBuilder} A function to add the foreign key column.
 */
const fkColumn = (builder: Knex.CreateTableBuilder, tableName: string) => (toTable: string = tableName, name?: string, suffix: string | null = 'id') => {
    name = makeForeignKeyName(tableName, toTable, name);

    return builder
        .integer(name)
        .references('id')
        .inTable(toTable)
        .withKeyName(Constraint('Foreign', tableName, name))
        .index(Constraint('Index', tableName, name));
};

/**
 * Adds a datestamp column to the table builder.
 *
 * @param {Knex} knex - The Knex instance.
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @returns {(name: string, initialize: boolean) => Knex.ColumnBuilder} A function to add the datestamp column.
 */
const datestampColumn = (knex: Knex, builder: Knex.CreateTableBuilder) => (name: string, initialize: boolean) => {
    const column = builder.datetime(name, { useTz: false });

    return initialize ? column.defaultTo(knex.fn.now()) : column;
};

/**
 * Adds a named datestamp column to the table builder.
 *
 * @param {Knex} knex - The Knex instance.
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @param {string} defaultName - The default name of the column.
 * @returns {(name?: string) => Knex.ColumnBuilder} A function to add the named datestamp column.
 */
const namedDatestampColumn = (knex: Knex, builder: Knex.CreateTableBuilder, defaultName: string) => (name: string = defaultName) => {
    const column = builder.datetime(name, { useTz: false });

    return column.defaultTo(knex.fn.now());
};

/**
 * Adds an external UUID column to the table builder.
 *
 * @param {Knex} knex - The Knex instance.
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @param {string} tableName - The name of the table.
 * @returns {(name?: string) => Knex.ColumnBuilder} A function to add the external UUID column.
 */
const externalColumn = (knex: Knex, builder: Knex.CreateTableBuilder, tableName: string) => (name: string = 'external') => {
    return builder
        .uuid(name)
        .defaultTo(knex.fn.uuid())
        .unique({ indexName: Constraint('Unique', tableName, name) });
};

export type SuperchargedTableBuilder = Knex.CreateTableBuilder & {
    id: (type: IdType, name?: string) => Knex.ColumnBuilder;
    fk: (table: string, name?: string, suffix?: string | null) => Knex.ReferencingColumnBuilder;
    datestamp: (name: string, initialize: boolean) => Knex.ColumnBuilder;
    created: (name?: string) => Knex.ColumnBuilder;
    updated: (name?: string) => Knex.ColumnBuilder;
    external: (name?: string) => Knex.ColumnBuilder;
    name: {
        readonly table: string;
        index: (...columns: string[]) => string;
        unique: (...columns: string[]) => { indexName: string; };
        foreign: (...columns: string[]) => string;
    };
};

export type TableCallback = (builder: SuperchargedTableBuilder) => any;

/**
 * Enhances the table builder with additional methods for common column types.
 *
 * @param {Knex} knex - The Knex instance.
 * @param {Knex.CreateTableBuilder} builder - The table builder instance.
 * @param {string} tablename - The name of the table.
 * @returns {SuperchargedTableBuilder} The enhanced table builder.
 */
export const superchargeTable = (knex: Knex, builder: Knex.CreateTableBuilder, tablename: string): SuperchargedTableBuilder => {
    return Object.assign(builder, {
        id: idColumn(builder, tablename),
        fk: fkColumn(builder, tablename),
        datestamp: datestampColumn(knex, builder),
        created: namedDatestampColumn(knex, builder, 'created'),
        updated: namedDatestampColumn(knex, builder, 'updated'),
        external: externalColumn(knex, builder, tablename),
        name: {
            get table() { return tablename; },
            index: (...columns: string[]) => Constraint('Index', tablename, ...columns),
            unique: (...columns: string[]) => ({ indexName: Constraint('Index', tablename, ...columns) }),
            foreign: (...columns: string[]) => Constraint('Foreign', tablename, ...columns),
        }
    });
};
