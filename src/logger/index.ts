import { Logger } from './logger.ts';
import { ConsoleTransport } from './transports/console.ts';
import { StorageTransport } from './transports/storage.ts';

export { ContextLogger } from './context.ts';
export { Logger, type LoggerOptions } from './logger.ts';
export { ConsoleTransport } from './transports/console.ts';
export { StorageTransport } from './transports/storage.ts';
export type {
  ConsoleTransportOptions,
  LogEntry,
  LogLevel,
  LogTransport,
} from './types.ts';

export const logger = new Logger({
  transports: [new ConsoleTransport(), new StorageTransport()],
});
