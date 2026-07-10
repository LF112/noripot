import { index, snakeCase, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { scripts } from './scripts.ts';

export const gateway = snakeCase.table(
  'gateway',
  (t) => ({
    id: t.integer().primaryKey({ autoIncrement: true }),

    pathname: t
      .text()
      .notNull()
      .references(() => scripts.pathname, {
        onDelete: 'cascade',
      }),

    port: t.integer().notNull(),

    path: t.text().notNull(),
  }),
  (table) => [
    index('gateway_script_pathname_idx').on(table.pathname),
    uniqueIndex('gateway_port_unique').on(table.port),
    uniqueIndex('gateway_path_unique').on(table.path),
  ],
);
