import { useEffect, useRef } from 'react';
import { VList, type VListHandle } from 'virtua';
import { cn } from '../lib/utils';
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
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      data={logs}
      itemSize={72}
      ref={list}
      role="log"
    >
      {(log) => (
        <article
          className={cn(
            'relative border-b border-[#242424] py-3 pr-3.5 pl-[18px] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[#434343] before:content-[""]',
            log.level === 'ERROR' && 'before:bg-red-400',
            log.level === 'WARN' && 'before:bg-yellow-400',
            log.level === 'SUCCESS' && 'before:bg-primary',
          )}
          key={log.id}
        >
          <header className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  'rounded-sm border border-[#363636] px-[5px] py-0.5 font-mono text-[9px] text-[#898989]',
                  log.level === 'ERROR' && 'border-red-400/30 text-red-400',
                  log.level === 'WARN' &&
                    'border-yellow-400/25 text-yellow-400',
                  log.level === 'SUCCESS' && 'border-primary/25 text-primary',
                )}
              >
                {log.level}
              </span>
              {log.tags
                .filter((tag) => tag !== excludedTag)
                .map((tag) => (
                  <span
                    className="rounded-sm border border-[#363636] px-[5px] py-0.5 font-mono text-[9px] text-[#898989]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <time className="shrink-0 font-mono text-[9px] text-[#646464]">
              {formatLogTime(log.createdAt)}
            </time>
          </header>
          <pre className="mt-2 mb-0 whitespace-pre-wrap font-mono text-[10px] leading-[1.55] text-[#b4b4b4] [overflow-wrap:anywhere]">
            {log.content}
          </pre>
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
