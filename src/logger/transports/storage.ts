import { db } from '../../db';
import { logs } from '../../db/schema';
import { serializeLogValues } from '../serialize.ts';
import type { LogEntry, LogTransport } from '../types.ts';

export class StorageTransport implements LogTransport {
  write(entry: LogEntry): void {
    const isScriptOutput =
      entry.context === 'runtime' &&
      entry.tags.some((tag) => tag === 'STDOUT' || tag === 'STDERR');
    const isCronExecution = entry.tags.some((tag) => tag.startsWith('cron:'));
    if (!isScriptOutput && !isCronExecution) return;

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
