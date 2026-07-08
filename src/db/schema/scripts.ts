import { snakeCase } from 'drizzle-orm/sqlite-core';

export const scripts = snakeCase.table('scripts', (t) => ({
  pathname: t.text().primaryKey().unique(),
}));
