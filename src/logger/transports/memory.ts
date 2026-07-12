import { serializeLogValues } from '../serialize.ts';
import type { LogEntry, LogLevel, LogTransport } from '../types.ts';

export interface MemoryLogRecord {
  id: number;
  context: string;
  level: LogLevel;
  tags: string[];
  content: string;
  createdAt: Date;
}

export class MemoryTransport implements LogTransport {
  private readonly records: MemoryLogRecord[] = [];
  private nextId = 1;

  constructor(private readonly capacity = 500) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new Error('MemoryTransport capacity must be a positive integer');
    }
  }

  write(entry: LogEntry): void {
    this.records.push({
      id: this.nextId,
      context: entry.context,
      level: entry.level,
      tags: [...entry.tags],
      content: serializeLogValues(entry.values),
      createdAt: entry.timestamp,
    });
    this.nextId += 1;

    const overflow = this.records.length - this.capacity;
    if (overflow > 0) this.records.splice(0, overflow);
  }

  list(limit = this.capacity): MemoryLogRecord[] {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 0), this.capacity);
    if (safeLimit === 0) return [];
    return this.records.slice(-safeLimit).toReversed();
  }

  close(): void {
    this.records.length = 0;
  }
}
