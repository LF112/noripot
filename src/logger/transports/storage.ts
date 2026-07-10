import { db } from '../../db';
import { logs } from '../../db/schema';
import { serializeLogValues } from '../serialize.ts';
import type { LogEntry, LogTransport } from '../types.ts';

export class StorageTransport implements LogTransport {
  write(entry: LogEntry): void {
    db.insert(logs)
      .values({
        context: entry.context,
        level: entry.level,
        tags: [...entry.tags],
        content: serializeLogValues(entry.values),
        createdAt: entry.timestamp,
      })
      .run();
  }
}
