import { sql } from 'drizzle-orm';
import { snakeCase } from 'drizzle-orm/sqlite-core';

export enum ActionType {
  RUN_SCRIPT = 'RUN_SCRIPT',
  GIT_PULL = 'GIT_PULL',
}

export const cron = snakeCase.table('cron', (t) => ({
  id: t.integer().primaryKey({ autoIncrement: true }),
  cron: t.text().notNull(),
  type: t.text().$type<ActionType>().notNull(),
  config: t
    .text({ mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'`),
}));

export type TCron = typeof cron.$inferSelect;
