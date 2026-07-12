import { Logger } from './logger.ts';
import { ConsoleTransport } from './transports/console.ts';
import { MemoryTransport } from './transports/memory.ts';
import { StorageTransport } from './transports/storage.ts';

export { ContextLogger } from './context.ts';
export { Logger, type LoggerOptions } from './logger.ts';
export { ConsoleTransport } from './transports/console.ts';
export {
  type MemoryLogRecord,
  MemoryTransport,
} from './transports/memory.ts';
export { StorageTransport } from './transports/storage.ts';
export type {
  ConsoleTransportOptions,
  LogEntry,
  LogLevel,
  LogTransport,
} from './types.ts';

export const memoryTransport = new MemoryTransport(500);

export const logger = new Logger({
  transports: [new ConsoleTransport(), memoryTransport, new StorageTransport()],
});
