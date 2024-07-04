# dbcor

A TypeScript library for declaratively defining database schemas with dynamic and static tables, enabling data transformation and validation at the code layer.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
  - [Defining Tables](#defining-tables)
  - [Creating a Database](#creating-a-database)
  - [Working with Tables](#working-with-tables)
  - [Transactions](#transactions)
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

## Usage

### Defining Tables

dbcor allows you to define both static and dynamic tables. Here's an example of how to define a static table:

```typescript
import { d, StaticTable } from 'dbcor';

const UserTable = d.StaticTable({
  name: 'users',
  row: {
    id: d.id(),
    name: d.string(true),
    email: d.string(true),
    created: d.created(),
  },
  data: {
    admin: {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      created: '2023-01-01',
    },
  },
  create: 'standard',
});
```

And here's how you can define a dynamic table:

```typescript
import { d, DynamicTable } from 'dbcor';

const PostTable = d.DynamicTable({
  name: 'posts',
  row: {
    id: d.id(),
    title: d.string(true),
    content: d.string(true),
    authorId: d.integer(true),
    created: d.created(),
    updated: d.updated(),
  },
  create: (table) => {
    table.foreign('authorId').references('id').inTable('users');
  },
});
```

### Creating a Database

To create a database, you need to use the `makeDatabaseConnector` function:

```typescript
import { makeDatabaseConnector } from 'dbcor';
import Knex from 'knex';

const connector = makeDatabaseConnector({
  users: UserTable,
  posts: PostTable,
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
const user = await db.users.select(1);
const posts = await db.posts.selectBy({ authorId: 1 });

// Inserting data (for dynamic tables)
const newPost = await db.posts.insert({
  title: 'New Post',
  content: 'This is a new post',
  authorId: 1,
});

// Updating data (for dynamic tables)
await db.posts.update(newPost.id, { title: 'Updated Title' });

// Deleting data (for dynamic tables)
await db.posts.delete(newPost.id);
```

### Transactions

dbcor supports transactions to ensure data integrity:

```typescript
const transaction = await db.transaction();

try {
  const newUser = await transaction.users.insert({
    name: 'New User',
    email: 'newuser@example.com',
  });

  await transaction.posts.insert({
    title: 'First Post',
    content: 'This is my first post',
    authorId: newUser.id,
  });

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  console.error('Transaction failed:', error);
}
```

## API Reference

For a complete API reference, please refer to the [API documentation](./docs/API.md). This document provides detailed information about the types, functions, and classes available in dbcor, including:

- Core types like `Row`, `Column`, and `ColumnKind`
- Functions for creating tables and database connectors
- Classes for working with static and dynamic tables
- Utility functions for defining column types

## Contributing

We welcome contributions to dbcor! Please see our [Contributing Guide](./CONTRIBUTING.md) for more details on how to get started.

## License

dbcor is released under the [MIT License](./LICENSE).