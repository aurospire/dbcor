# dbcor

A TypeScript library for declaratively defining database schemas with dynamic and static tables, enabling data transformation and validation at the code layer.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
  - [Defining Tables](#defining-tables)
    - [Static Tables](#static-tables)
    - [Dynamic Tables](#dynamic-tables)
  - [Creating a Database](#creating-a-database)
  - [Working with Tables](#working-with-tables)
  - [Transactions](#transactions)
  - [Services and System](#services-and-system)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Installation

You can install dbcor using npm:

```bash
npm install dbcor
```

Or using yarn:

```bash
yarn add dbcor
```

## Features

- Declarative schema definition for both dynamic and static tables
- Type-safe database operations
- Built-in data transformation and validation
- Support for transactions
- Integration with Knex.js for database agnostic operations
- Extensible architecture for custom column types and table structures
- Service layer support for complex business logic

## Usage

### Defining Tables

dbcor allows you to define both static and dynamic tables. The key difference is that static tables have predefined data, while dynamic tables allow for runtime data manipulation.

#### Static Tables

Static tables are useful for data that is known at compile-time and doesn't change frequently. They come with three types of base rows:

1. `BaseRow`: Includes `id` and `created` columns.
2. `StandardRow`: Includes `id`, `created`, `name`, and `description` columns.
3. Custom: You can define your own base row structure.

Here's an example of how to define a static table:

```typescript
import { d, StaticTable } from 'dbcor';

const UserTypeTable = d.StaticTable({
  name: 'user_types',
  row: 'standard', // Uses StandardRow
  create: 'standard', // Uses standard creation method
  data: {
    admin: {
      id: 1,
      name: 'Admin',
      description: 'Administrator user type',
      created: '2023-01-01',
    },
    user: {
      id: 2,
      name: 'User',
      description: 'Regular user type',
      created: '2023-01-01',
    },
  },
});
```

#### Dynamic Tables

Dynamic tables are used for data that changes at runtime. They always include a base row with `id` and `created` columns. Here's an example:

```typescript
import { d, DynamicTable } from 'dbcor';

const UserTable = d.DynamicTable({
  name: 'users',
  row: {
    name: d.string(true),
    email: d.string(true),
    type_id: d.integer(true),
    updated: d.updated(),
  },
  create: (table) => {
    table.fk('user_types'); // Automatically creates 'type_id' foreign key
  },
});
```

Note the naming conventions:
- Table names are in PascalCase (e.g., `UserTable`)
- Column names are in snake_case, preferably single words
- Foreign keys use the `_id` suffix
- When referencing another table, the prefix is removed if it matches the table name (e.g., `UserType` becomes `type_id`, not `user_type_id`)

### Creating a Database

To create a database, use the `makeDatabaseConnector` function:

```typescript
import { makeDatabaseConnector } from 'dbcor';
import Knex from 'knex';

const connector = makeDatabaseConnector({
  userTypes: UserTypeTable,
  users: UserTable,
});

const knex = Knex({
  client: 'pg',
  connection: {
    // Your database connection details
  },
});

const db = connector(knex);
```

### Working with Tables

Once you have created your database, you can perform various operations on your tables:

```typescript
// Selecting data
const userType = await db.userTypes.select(1);
const users = await db.users.selectBy({ type_id: 1 });

// Inserting data (for dynamic tables)
const newUser = await db.users.insert({
  name: 'John Doe',
  email: 'john@example.com',
  type_id: 2,
});

// Updating data (for dynamic tables)
await db.users.update(newUser.id, { name: 'Jane Doe' });

// Deleting data (for dynamic tables)
await db.users.delete(newUser.id);

// Using Query for type-safe queries
const activeUsers = await Query.all(db.users.row, 
  db.users.query().where('active', true)
);
```

### Knex Migrations

For Knex migrations, you can use the `create` and `initialize` methods:

For static tables:

```typescript
exports.up = async (knex) => {
  await UserTypeTable.initialize();
};

exports.down = async (knex) => {
  await UserTypeTable.drop();
};
```

For dynamic tables:

```typescript
exports.up = async (knex) => {
  await UserTable.create();
};

exports.down = async (knex) => {
  await UserTable.drop();
};
```

### Built-in Data Types

dbcor provides several built-in data types in the `d` namespace:

- `d.boolean(required)`
- `d.integer(required)`
- `d.number(required)`
- `d.string(required)`
- `d.datetime(required, type?)`
- `d.uuid(required)`
- `d.id()`
- `d.external()`
- `d.created(type?)`
- `d.updated(type?)`

### Table Helper Methods

When defining tables, you can use several helper methods:

- `table.id(type, name?)`: Defines an ID column
- `table.fk(table, name?, suffix?)`: Defines a foreign key column
- `table.datestamp(name, initialize)`: Defines a datestamp column
- `table.created(name?)`: Defines a creation timestamp column
- `table.updated(name?)`: Defines an update timestamp column
- `table.external(name?)`: Defines an external ID column

### Row Type Helpers

You can use special properties to refer to row types:

```typescript
type UserSelect = typeof UserTable.Select;
type UserInsert = typeof UserTable.Insert;
type UserUpdate = typeof UserTable.Update;
```

### Transactions

dbcor supports transactions to ensure data integrity:

```typescript
const transaction = await db.transaction();

try {
  const newUser = await transaction.users.insert({
    name: 'New User',
    email: 'newuser@example.com',
    type_id: 2,
  });

  // More operations...

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  console.error('Transaction failed:', error);
}
```

### Services and System

dbcor allows you to create a service layer for complex business logic:

```typescript
import { Service, makeSystemConnector } from 'dbcor';

class UserService extends Service<typeof db> {
  async createUser(name: string, email: string, typeId: number) {
    // Business logic here
    return this.db.users.insert({ name, email, type_id: typeId });
  }

  protected __clone(): UserService {
    return new UserService();
  }
}

const systemConnector = makeSystemConnector<typeof db>()({
  users: new UserService(),
});

const system = systemConnector(db);

// Usage
await system.users.createUser('John Doe', 'john@example.com', 2);
```

You can infer the database type for type-safe operations:

```typescript
import { InferDatabaseObject } from 'dbcor';

type MyDatabase = InferDatabaseObject<typeof connector>;
```

## API Reference

For a complete API reference, please refer to the [API documentation](./docs/API.md).
