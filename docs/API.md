# dbcor API Documentation

This document provides detailed information about the API of the dbcor library.

## Table of Contents

- [Types](#types)
- [Functions](#functions)
- [Classes](#classes)

## Types

### `Row`

Represents a row in the database, with column definitions.

```typescript
type Row = Record<string, Column<ColumnKind, any, boolean>>;
```

### `Column<Kind, UserType, Required>`

Represents a column definition with its properties and transformation methods.

```typescript
type Column<Kind extends ColumnKind, UserType, Required extends boolean> = {
  kind: Kind;
  default: UserType;
  required: Required;
  modifiable: ColumnModifiable<Kind>;
  toUser: (value: ColumnDatabaseType<Kind>) => UserType;
  toDatabase: (value: UserType) => ColumnDatabaseType<Kind>;
};
```

### `ColumnKind`

Represents the different kinds of columns that can exist in the database.

```typescript
type ColumnKind = "boolean" | "integer" | "number" | "string" | "datetime" | "uuid" | "id" | "external" | "created" | "updated";
```

### `DatabaseObject<D>`

Represents a database object containing tables.

```typescript
type DatabaseObject<D extends Record<string, Table<any>>> = D;
```

### `DatabaseConnector<D>`

Represents a function that connects to a database and returns a Database instance.

```typescript
type DatabaseConnector<D extends DatabaseObject<any>> = (knex: Knex, debug?: boolean) => Database<D>;
```

## Functions

### `makeDatabaseConnector<D>(database: D): DatabaseConnector<D>`

Creates a database connector function.

```typescript
const connector = makeDatabaseConnector({
  users: UserTable,
  posts: PostTable,
});
```

### `makeStaticTable<R, D>(props: { name: string; row: R; data: D; create: StaticTableCreator; }): StaticTable<StaticRow<R>, D> & D`

Creates a static table instance.

```typescript
const UserTable = makeStaticTable({
  name: 'users',
  row: {
    id: d.id(),
    name: d.string(true),
    email: d.string(true),
  },
  data: {
    admin: { id: 1, name: 'Admin', email: 'admin@example.com' },
  },
  create: 'standard',
});
```

### `makeDynamicTable<R extends DynamicRow & Row>(props: { name: string; row: R; create: DynamicCreator; }): DynamicTable<R>`

Creates a dynamic table instance.

```typescript
const PostTable = makeDynamicTable({
  name: 'posts',
  row: {
    id: d.id(),
    title: d.string(true),
    content: d.string(true),
    authorId: d.integer(true),
  },
  create: (table) => {
    table.foreign('authorId').references('id').inTable('users');
  },
});
```

## Classes

### `Table<R extends Row>`

Abstract class representing a table with generic row type.

#### Methods

- `connect(knex: Knexable): Table<R>`
- `select(id: number): Promise<SelectRow<R, 'User'> | undefined>`
- `selectBy(condition: WhereRow<R, 'User'>): Promise<SelectRow<R, 'User'>[]>`
- `selectAll(): Promise<SelectRow<R, 'User'>[]>`
- `count(): Promise<number>`
- `countOf(condition: WhereRow<R, 'User'>): Promise<number>`
- `create(): Promise<void>`
- `drop(): Promise<void>`

### `StaticTable<R extends StaticBaseRow & Row, D extends Readonly<StaticData<R>>>`

Class representing a static table with generic row and data types.

#### Methods

(Includes all methods from `Table<R>`, plus:)

- `getRow(by: number | string | keyof D): UserRow<R>`
- `getId(by: number | string | keyof D): number`
- `getDates(): string[]`
- `initialize(): Promise<void>`
- `add(by: string | number): Promise<void>`
- `remove(by: string | number): Promise<void>`

### `DynamicTable<R extends DynamicRow & Row>`

Class representing a dynamic table with generic row type.

#### Methods

(Includes all methods from `Table<R>`, plus:)

- `insert(row: InsertRow<R>): Promise<SelectRow<R>>`
- `insertMany(rows: InsertRow<R>[], batch?: number, onBatch?: (rows: InsertRow<R>[], index: number) => void): Promise<SelectRow<R>[]>`
- `update(id: number, row: UpdateRow<R>): Promise<SelectRow<R> | undefined>`
- `updateBy(conditions: WhereRow<R>, row: UpdateRow<R>): Promise<SelectRow<R>[]>`
- `delete(id: number): Promise<void>`
- `deleteBy(conditions: WhereRow<R>): Promise<void>`

### `Database<D extends DatabaseObject<any>>`

Represents a database instance with transaction management.

#### Methods

- `transaction(): Promise<Database<D>>`
- `rollback(): Promise<void>`
- `commit(): Promise<void>`

## Utility Functions

The `d` namespace provides several utility functions for creating column definitions:

- `d.boolean(required: boolean)`
- `d.integer(required: boolean)`
- `d.number(required: boolean)`
- `d.string(required: boolean)`
- `d.datetime(required: boolean, type?: DatabaseDateType)`
- `d.uuid(required: boolean)`
- `d.id()`
- `d.external()`
- `d.created(type?: DatabaseDateType)`
- `d.updated(type?: DatabaseDateType)`

These functions are used when defining the structure of your tables.

For more detailed information about each type, function, and class, please refer to the source code and inline documentation.