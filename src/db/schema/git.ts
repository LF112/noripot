import { snakeCase, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { scripts } from './scripts.ts';

export const gitSources = snakeCase.table(
  'git_sources',
  (t) => ({
    pathname: t
      .text()
      .primaryKey()
      .references(() => scripts.pathname, { onDelete: 'cascade' }),
    url: t.text().notNull(),
    branch: t.text(),
    token: t.text(),
  }),
  (table) => [uniqueIndex('git_sources_url_unique').on(table.url)],
);

export type TGitSource = typeof gitSources.$inferSelect;
