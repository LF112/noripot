import { ContextLogger } from './context.ts';
import type { LogEntry, LogTransport } from './types.ts';

export interface LoggerOptions {
  transports?: readonly LogTransport[];
}

export class Logger {
  private readonly transports: readonly LogTransport[];
  private closed = false;

  constructor(options: LoggerOptions = {}) {
    this.transports = options.transports ?? [];
  }

  /**
   * 写入日志
   * @param values 日志内容
   * */
  log(...values: unknown[]): void {
    this.write({
      context: 'ROOT',
      level: 'LOG',
      tags: [],
      values,
      timestamp: new Date(),
    });
  }

  /**
   * 创建带上下文的日志对象
   * @param context 上下文名称
   * */
  with(context: string): ContextLogger {
    const normalizedContext = context.trim();

    if (!normalizedContext) {
      throw new Error('Logger context 不能为空');
    }

    return new ContextLogger(normalizedContext, [], (entry) =>
      this.write(entry),
    );
  }

  /**
   * 停止记录日志
   * */
  close(): void {
    if (this.closed) {
      return;
    }

    for (const transport of this.transports) {
      transport.close?.();
    }

    this.closed = true;
  }

  /**
   * 写入日志条目到所有传输器
   * @param entry 日志条目
   * */
  private write(entry: LogEntry): void {
    if (this.closed) {
      return;
    }

    for (const transport of this.transports) {
      transport.write(entry);
    }
  }
}
