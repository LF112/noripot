export type LogLevel = 'LOG' | 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  context: string;
  level: LogLevel;
  tags: readonly string[];
  values: readonly unknown[];
  timestamp: Date;
}

export interface LogTransport {
  write(entry: LogEntry): void;
  close?(): void;
}

export interface ConsoleTransportOptions {
  title?: string;
  writer?: (content: string) => void;
}
