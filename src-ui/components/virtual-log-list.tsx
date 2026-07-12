import { useEffect, useRef } from 'react';
import { VList, type VListHandle } from 'virtua';
import type { LogRecord } from '../types';

interface VirtualLogListProps {
  logs: LogRecord[];
  excludedTag?: string;
}

export function VirtualLogList({ logs, excludedTag }: VirtualLogListProps) {
  const list = useRef<VListHandle>(null);
  const latestLogId = logs.at(-1)?.id;

  useEffect(() => {
    if (logs.length === 0) return;
    let measuredFrame = 0;
    const initialFrame = requestAnimationFrame(() => {
      list.current?.scrollToIndex(logs.length - 1, { align: 'end' });
      measuredFrame = requestAnimationFrame(() => {
        list.current?.scrollToIndex(logs.length - 1, { align: 'end' });
      });
    });
    return () => {
      cancelAnimationFrame(initialFrame);
      cancelAnimationFrame(measuredFrame);
    };
  }, [latestLogId, logs.length]);

  return (
    <VList
      aria-label="日志列表"
      aria-live="polite"
      bufferSize={400}
      className="script-log-list"
      data={logs}
      itemSize={72}
      ref={list}
      role="log"
    >
      {(log) => (
        <article
          className={`script-log-entry level-${log.level.toLowerCase()}`}
          key={log.id}
        >
          <header>
            <div>
              <span className="log-level">{log.level}</span>
              {log.tags
                .filter((tag) => tag !== excludedTag)
                .map((tag) => (
                  <span className="log-tag" key={tag}>
                    {tag}
                  </span>
                ))}
            </div>
            <time>{formatLogTime(log.createdAt)}</time>
          </header>
          <pre>{log.content}</pre>
        </article>
      )}
    </VList>
  );
}

export function formatLogTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
