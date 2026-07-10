import type { LogEntry, LogLevel } from './types.ts';

type LogEmitter = (entry: LogEntry) => void;

export class ContextLogger {
  constructor(
    private readonly context: string,
    private readonly _tags: readonly string[],
    private readonly emit: LogEmitter,
  ) {}

  /**
   * 创建携带标签的 Logger
   * logger.with('MyClass').withTags('tag1', 'tag2')
   */
  tags(...tags: string[]): ContextLogger {
    return new ContextLogger(
      this.context,
      this.normalizeTags([...this._tags, ...tags]),
      this.emit,
    );
  }

  log(...values: unknown[]): void {
    this.write('LOG', values);
  }

  info(...values: unknown[]): void {
    this.write('INFO', values);
  }

  debug(...values: unknown[]): void {
    this.write('DEBUG', values);
  }

  warn(...values: unknown[]): void {
    this.write('WARN', values);
  }

  error(...values: unknown[]): void {
    this.write('ERROR', values);
  }

  success(...values: unknown[]): void {
    this.write('SUCCESS', values);
  }

  /**
   * 写入日志
   * @param level 日志等级
   * @param values 日志内容
   * */
  private write(level: LogLevel, values: readonly unknown[]): void {
    this.emit({
      context: this.context,
      level,
      tags: this._tags,
      values,
      timestamp: new Date(),
    });
  }

  /**
   * 规范化标签
   * @param tags 标签数组
   * */
  private normalizeTags(tags: readonly string[]): string[] {
    const result: string[] = [];
    const existing = new Set<string>();

    for (const originalTag of tags) {
      const tag = originalTag.trim();

      if (!tag) {
        continue;
      }

      const key = tag.toLowerCase();

      if (existing.has(key)) {
        continue;
      }

      existing.add(key);
      result.push(tag);
    }

    return result;
  }
}
