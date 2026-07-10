import { serializeLogValues } from '../serialize.ts';
import type { LogEntry, LogLevel, LogTransport } from '../types.ts';

interface LevelStyle {
  icon: string;
  name: string;
}

const LEVEL_STYLES: Record<LogLevel, LevelStyle> = {
  LOG: { icon: '📝', name: 'LOG' },
  INFO: { icon: 'ℹ️', name: 'INFO' },
  DEBUG: { icon: '🐛', name: 'DEBUG' },
  WARN: { icon: '⚠️️', name: 'WARN' },
  ERROR: { icon: '❗️', name: 'ERROR' },
  SUCCESS: { icon: '✅', name: 'SUCCESS' },
};

export class ConsoleTransport implements LogTransport {
  private started = false;
  private activeGroupKey: string | null = null;

  write(entry: LogEntry): void {
    this.ensureStarted();

    const lines: string[] = [];
    const groupKey = `${entry.context}\0${entry.level}`;

    if (groupKey !== this.activeGroupKey) {
      const style = LEVEL_STYLES[entry.level];

      lines.push('│');
      lines.push(
        `├─ [${entry.context} - ${style.icon} ${style.name}] ───────────`,
      );
      this.activeGroupKey = groupKey;
    }

    lines.push(
      `├─ ${this.formatTime(entry.timestamp)}${this.formatTags(entry.tags)}:`,
    );

    for (const line of serializeLogValues(entry.values).split(/\r?\n/)) {
      lines.push(`│  ${line}`);
    }

    console.log(lines.join('\n'));
  }

  close(): void {
    this.ensureStarted();
    console.log('└─ 🐾 Bye-Bye!');
    this.activeGroupKey = null;
  }

  private ensureStarted(): void {
    if (this.started) {
      return;
    }

    console.log(`┌─ 🐾 NORI POT 正在运行中...`);
    this.started = true;
  }

  private formatTags(tags: readonly string[]): string {
    if (tags.length === 0) {
      return '';
    }

    return ` [${tags.map((tag) => tag.toUpperCase()).join(', ')}]`;
  }

  private formatTime(date: Date): string {
    const year = String(date.getFullYear()).slice(-2);
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());
    const hour = this.pad(date.getHours());
    const minute = this.pad(date.getMinutes());
    const second = this.pad(date.getSeconds());
    const millisecond = this.pad(date.getMilliseconds(), 3);

    return `${year}${month}${day} ${hour}:${minute}:${second}.${millisecond}`;
  }

  private pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
  }
}
