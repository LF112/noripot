import { Database } from 'bun:sqlite';

import { join } from 'node:path';
import { drizzle, type SQLiteBunDatabase } from 'drizzle-orm/bun-sqlite';
import { relations } from './relations.ts';

let db: SQLiteBunDatabase<typeof relations> & { $client: Database };

const initDB = async () => {
  const sqlite = new Database(join(process.cwd(), 'runtime/data.sqlite'), {
    create: true,
  });

  db = drizzle({ client: sqlite, relations });

  return db;
};

// 初始化数据连接
db ??= await initDB();

export { db };
