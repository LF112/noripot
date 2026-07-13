import {
  Activity,
  Boxes,
  CircleDot,
  Clock3,
  GitBranch,
  LoaderCircle,
  Network,
  RefreshCw,
  ScrollText,
  TerminalSquare,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { request } from '../api';
import {
  EmptyState,
  IconButton,
  PageHeader,
  Sheet,
  StatusBadge,
} from '../components/ui';
import { VirtualLogList } from '../components/virtual-log-list';
import { usePollCountdown } from '../lib/use-poll-countdown';
import { cn } from '../lib/utils';
import type { DashboardSnapshot, LogRecord, ProcessState } from '../types';

const processStates: Array<{
  status: ProcessState;
  label: string;
}> = [
  { status: 'running', label: '运行' },
  { status: 'restarting', label: '重启' },
  { status: 'stopped', label: '停止' },
  { status: 'failed', label: '异常' },
];

export function Overview({ data }: { data: DashboardSnapshot }) {
  const [activityOpen, setActivityOpen] = useState(false);
  const running = data.scripts.filter(
    (script) => script.status === 'running',
  ).length;
  const stateCounts = data.scripts.reduce<Record<ProcessState, number>>(
    (counts, script) => {
      counts[script.status] += 1;
      return counts;
    },
    { running: 0, restarting: 0, stopped: 0, failed: 0 },
  );
  const errors = data.recentLogs.filter((log) => log.level === 'ERROR').length;
  const stats = [
    {
      label: '脚本实例',
      value: data.scripts.length,
      detail: `${running} 个正在运行`,
      icon: Boxes,
      tone: 'green',
    },
    {
      label: '网关路由',
      value: data.gateways.length,
      detail: 'Caddy 动态配置',
      icon: Network,
      tone: 'blue',
    },
    {
      label: '计划任务',
      value: data.cronJobs.length,
      detail: '全部已注册',
      icon: Clock3,
      tone: 'yellow',
    },
    {
      label: 'Git 仓库',
      value: data.repositories.length,
      detail: `${errors} 条近期错误`,
      icon: GitBranch,
      tone: errors ? 'red' : 'purple',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM OVERVIEW"
        title="运行概览"
        description="脚本、路由和自动化任务的实时状态"
      />

      <section
        className="mb-6 grid grid-cols-4 overflow-hidden rounded-lg border border-border max-[1050px]:grid-cols-2 max-[520px]:grid-cols-1"
        aria-label="系统统计"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              className="grid min-h-32 grid-cols-[34px_1fr] grid-rows-[auto_1fr_auto] gap-x-3 gap-y-1 border-r border-border bg-card p-5 last:border-r-0 max-[1050px]:nth-2:border-r-0 max-[1050px]:nth-[-n+2]:border-b max-[1050px]:nth-[-n+2]:border-border max-[720px]:min-h-[116px] max-[720px]:p-4 max-[520px]:border-r-0 max-[520px]:border-b max-[520px]:last:border-b-0"
              key={stat.label}
            >
              <div
                className={cn(
                  'row-span-3 grid size-[34px] place-items-center rounded-[7px] border border-border-strong bg-muted text-foreground-secondary',
                  stat.tone === 'green' && 'border-primary/25 text-primary',
                  stat.tone === 'blue' && 'border-info/25 text-info',
                  stat.tone === 'yellow' && 'border-warning/25 text-warning',
                  stat.tone === 'purple' && 'border-special/25 text-special',
                  stat.tone === 'red' &&
                    'border-destructive/25 text-destructive',
                )}
              >
                <Icon size={18} />
              </div>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
              <strong className="self-center text-[28px] font-normal max-[720px]:text-2xl">
                {stat.value}
              </strong>
              <small className="text-[11px] text-foreground-subtle">
                {stat.detail}
              </small>
            </article>
          );
        })}
      </section>

      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] gap-6 max-[1050px]:grid-cols-1">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-border px-[18px] py-[15px]">
            <div>
              <span className="font-mono text-[10px] leading-[1.4] text-muted-foreground uppercase">
                RUNTIME
              </span>
              <h2 className="mt-[5px] text-base font-normal">实例状态</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1.5">
              {processStates
                .filter(({ status }) => stateCounts[status] > 0)
                .map(({ status, label }) => (
                  <span
                    className={cn(
                      'inline-flex items-center gap-[5px] text-[10px] whitespace-nowrap text-muted-foreground [&>i]:size-1.5 [&>i]:rounded-full [&>i]:bg-current',
                      status === 'running' && 'text-primary',
                      status === 'restarting' && 'text-warning',
                      status === 'failed' && 'text-destructive',
                    )}
                    key={status}
                  >
                    <i aria-hidden="true" />
                    {label} {stateCounts[status]}
                  </span>
                ))}
            </div>
          </header>
          {data.scripts.length ? (
            <div className="flex flex-col">
              {data.scripts.slice(0, 6).map((script) => (
                <div
                  className="flex min-h-16 items-center justify-between gap-4 border-b border-secondary px-[18px] py-2.5 last:border-b-0"
                  key={script.pathname}
                >
                  <div className="flex min-w-0 items-center gap-[11px]">
                    <TerminalSquare
                      className="shrink-0 text-foreground-subtle"
                      size={16}
                    />
                    <div>
                      <strong className="block truncate text-[13px] font-medium text-foreground-strong">
                        {script.pathname}
                      </strong>
                      <small className="mt-[3px] block text-[10px] text-foreground-subtle">
                        {script.pid ? `PID ${script.pid}` : '无活动进程'}
                      </small>
                    </div>
                  </div>
                  <StatusBadge status={script.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<TerminalSquare size={20} />}
              title="暂无脚本"
              description="同步脚本目录后，实例会显示在这里"
            />
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-border px-[18px] py-[15px]">
            <div>
              <span className="font-mono text-[10px] leading-[1.4] text-muted-foreground uppercase">
                RECENT ACTIVITY
              </span>
              <h2 className="mt-[5px] text-base font-normal">最近活动</h2>
            </div>
            <IconButton
              label="查看最近活动日志"
              onClick={() => setActivityOpen(true)}
            >
              <ScrollText size={16} />
            </IconButton>
          </header>
          {data.recentLogs.length ? (
            <div className="flex flex-col">
              {data.recentLogs.slice(0, 8).map((log) => (
                <div
                  className="grid min-h-[58px] grid-cols-[7px_minmax(0,1fr)] gap-[11px] border-b border-secondary px-[18px] py-[11px] last:border-b-0"
                  key={log.id}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-1.5 rounded-full bg-foreground-subtle',
                      log.level === 'SUCCESS' && 'bg-primary',
                      log.level === 'ERROR' && 'bg-destructive',
                      log.level === 'WARN' && 'bg-warning',
                      log.level === 'INFO' && 'bg-info',
                    )}
                  />
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-[10px] font-medium text-foreground-secondary uppercase">
                        {log.context}
                      </strong>
                      <time className="font-mono text-[9px] text-foreground-subtle">
                        {formatTime(log.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 mb-0 line-clamp-2 font-mono text-[10px] leading-[1.4] text-muted-foreground">
                      {log.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={20} />}
              title="暂无活动"
              description="当前运行时的服务日志会显示在这里"
            />
          )}
        </section>
      </div>

      <RuntimeActivityLogs
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </>
  );
}

function RuntimeActivityLogs({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    data: logs,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<LogRecord[]>(
    open ? '/api/runtime/logs?limit=500' : null,
    request,
    {
      refreshInterval: 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      keepPreviousData: false,
    },
  );
  const pollCountdown = usePollCountdown(1000, isValidating);
  const orderedLogs = useMemo(() => logs?.toReversed() ?? [], [logs]);

  return (
    <Sheet
      description="当前运行时 · 最多 500 条"
      open={open}
      title="最近活动日志"
      onClose={onClose}
    >
      <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden bg-surface-inset">
        <div className="sticky top-0 z-2 flex min-h-[46px] items-center justify-between border-b border-border bg-surface-inset/94 px-3.5 py-1.5 backdrop-blur-[10px]">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground-subtle [&>svg]:text-primary">
            <CircleDot
              className={isValidating ? 'animate-pulse' : ''}
              size={11}
            />
            {isValidating
              ? '正在更新'
              : `${logs?.length ?? 0} 条日志 · ${pollCountdown} 秒后轮询`}
          </span>
          <IconButton
            label="刷新日志"
            disabled={isValidating}
            onClick={() => void mutate()}
          >
            <RefreshCw
              className={
                isValidating ? 'animate-spin motion-reduce:animate-none' : ''
              }
              size={15}
            />
          </IconButton>
        </div>
        {isLoading ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-2.5 text-[11px] text-muted-foreground">
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              size={20}
            />
            <span>正在加载日志...</span>
          </div>
        ) : null}
        {error ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-2.5 text-[11px] text-destructive">
            <span>
              {error instanceof Error ? error.message : '日志加载失败'}
            </span>
          </div>
        ) : null}
        {!isLoading && !error && logs?.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="暂无运行时日志"
            description="新输出会实时显示在这里"
          />
        ) : null}
        {orderedLogs.length ? <VirtualLogList logs={orderedLogs} /> : null}
      </div>
    </Sheet>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
