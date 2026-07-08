import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { drizzle, type SQLiteBunDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { relations } from './relations.ts';

let db: SQLiteBunDatabase<typeof relations> & { $client: Database };

const initDB = async () => {
  const appDir = process.cwd();
  const sqlite = new Database(join(appDir, 'runtime/data.sqlite'), {
    create: true,
  });

  db = drizzle({ client: sqlite, relations });

  migrate(db, { migrationsFolder: join(appDir, 'drizzle') });

  return db;
};

// 初始化数据连接
db ??= await initDB();

export { db };
