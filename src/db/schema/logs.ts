import { index, snakeCase } from 'drizzle-orm/sqlite-core';
import type { LogLevel } from '../../logger';

export const logs = snakeCase.table(
  'logs',
  (t) => ({
    id: t.integer().primaryKey({ autoIncrement: true }),
    context: t.text().notNull(),
    level: t.text().$type<LogLevel>().notNull(),
    tags: t.text({ mode: 'json' }).$type<string[]>().notNull(),
    content: t.text().notNull(),
    createdAt: t.integer({ mode: 'timestamp_ms' }).notNull(),
  }),
  (table) => [
    index('logs_context_idx').on(table.context),
    index('logs_created_at_idx').on(table.createdAt),
  ],
);
