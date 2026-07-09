import { snakeCase } from 'drizzle-orm/sqlite-core';

export const scripts = snakeCase.table('scripts', (t) => ({
  pathname: t.text().primaryKey().unique(),
  retry: t.integer().default(3).notNull(),
  cron: t.text(),
}));

export type TScript = typeof scripts.$inferSelect;
