import { sql } from 'drizzle-orm/sql/sql';
import { snakeCase } from 'drizzle-orm/sqlite-core';

export const scripts = snakeCase.table('scripts', (t) => ({
  pathname: t.text().primaryKey().unique(),
  retry: t.integer().default(3).notNull(),
  env: t
    .text({ mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
}));

export type TScript = typeof scripts.$inferSelect;
