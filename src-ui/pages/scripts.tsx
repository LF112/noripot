import {
  Boxes,
  Braces,
  CircleDot,
  ListPlus,
  LoaderCircle,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Settings2,
  Square,
  TerminalSquare,
  Trash2,
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { request } from '../api';
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Sheet,
  StatusBadge,
} from '../components/ui';
import { formatLogTime, VirtualLogList } from '../components/virtual-log-list';
import {
  type EnvironmentSourceFormat,
  parseEnvironmentSource,
  serializeEnvironmentSource,
  validateEnvironmentEntries,
} from '../lib/environment-formats';
import { usePollCountdown } from '../lib/use-poll-countdown';
import { cn } from '../lib/utils';
import type {
  ActionRunner,
  LogRecord,
  ScriptLatestLogRecord,
  ScriptRecord,
} from '../types';

interface ScriptsProps {
  scripts: ScriptRecord[];
  busy: string | null;
  runAction: ActionRunner;
}

const latestLogPollInterval = 2000;

export function Scripts({ scripts, busy, runAction }: ScriptsProps) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ScriptRecord | null>(null);
  const [logging, setLogging] = useState<ScriptRecord | null>(null);
  const [nextLogPollAt, setNextLogPollAt] = useState(
    () => Date.now() + latestLogPollInterval,
  );
  const [pollCountdown, setPollCountdown] = useState(
    latestLogPollInterval / 1000,
  );
  const {
    data: liveScripts,
    isValidating,
    mutate: mutateStatus,
  } = useSWR<ScriptRecord[]>('/api/scripts/status', request, {
    refreshInterval: 2000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const {
    data: latestLogs,
    isValidating: logsValidating,
    mutate: mutateLatestLogs,
  } = useSWR<ScriptLatestLogRecord[]>('/api/scripts/latest-logs', request, {
    refreshInterval: latestLogPollInterval,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!logsValidating) {
      setNextLogPollAt(Date.now() + latestLogPollInterval);
    }
  }, [latestLogs, logsValidating]);

  useEffect(() => {
    const updateCountdown = () => {
      setPollCountdown(
        Math.max(0, Math.ceil((nextLogPollAt - Date.now()) / 1000)),
      );
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [nextLogPollAt]);
  const currentScripts = liveScripts ?? scripts;
  const latestLogByPathname = useMemo(
    () => new Map(latestLogs?.map(({ pathname, log }) => [pathname, log])),
    [latestLogs],
  );
  const filtered = useMemo(
    () =>
      currentScripts.filter((script) =>
        script.pathname.toLowerCase().includes(query.toLowerCase()),
      ),
    [currentScripts, query],
  );

  async function runScriptAction(
    key: string,
    path: string,
    body: unknown,
    message: string,
  ) {
    const ok = await runAction(key, path, body, message);
    if (ok) await Promise.all([mutateStatus(), mutateLatestLogs()]);
  }

  return (
    <>
      <PageHeader
        eyebrow="PROCESS MANAGER"
        title="脚本实例"
        description="管理脚本运行状态、重试策略与环境变量"
        actions={
          <Button
            loading={busy === 'sync'}
            onClick={() => runAction('sync', '/api/sync', {}, '脚本目录已同步')}
          >
            <RefreshCw size={15} />
            同步目录
          </Button>
        }
      />

      <section className="mb-3.5 flex items-center justify-between gap-4">
        <label className="flex h-9 w-[min(320px,100%)] items-center gap-[9px] rounded-md border border-border-strong bg-surface-hover px-[11px] text-foreground-subtle focus-within:border-primary/55">
          <Search size={16} />
          <input
            className="w-full border-0 bg-transparent text-xs text-foreground-strong outline-none placeholder:text-placeholder"
            aria-label="搜索脚本"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索脚本路径"
            value={query}
          />
        </label>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground-subtle [&>svg]:text-primary">
          {isValidating || logsValidating ? (
            <RefreshCw
              className="animate-spin motion-reduce:animate-none"
              size={11}
            />
          ) : (
            <CircleDot size={11} />
          )}
          {filtered.length} 个实例 · {pollCountdown} 秒后刷新
        </span>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card max-[1050px]:overflow-x-auto">
        {filtered.length ? (
          <div className="w-full max-[1050px]:min-w-[820px]">
            <div className="grid min-h-[42px] grid-cols-[minmax(220px,1.6fr)_100px_100px_100px_104px] items-center gap-[18px] border-b border-border bg-background px-[18px] text-[10px] text-foreground-subtle uppercase">
              <span>脚本</span>
              <span>状态</span>
              <span>进程</span>
              <span>重试</span>
              <span />
            </div>
            {filtered.map((script) => {
              const active =
                script.status === 'running' || script.status === 'restarting';
              const latestLog =
                latestLogByPathname.get(script.pathname) ?? null;
              return (
                <div
                  className="border-b border-secondary last:border-b-0"
                  key={script.pathname}
                >
                  <div className="grid min-h-[66px] grid-cols-[minmax(220px,1.6fr)_100px_100px_100px_104px] items-center gap-[18px] border-b border-border px-[18px] text-xs text-foreground-secondary hover:bg-surface-hover">
                    <div
                      className="flex min-w-0 items-center gap-[11px]"
                      data-label="脚本"
                    >
                      <span className="grid size-[34px] shrink-0 place-items-center rounded-[7px] border border-primary/25 bg-primary/5 text-primary">
                        <TerminalSquare size={17} />
                      </span>
                      <div>
                        <strong className="block truncate text-[13px] font-medium text-foreground-strong">
                          {script.pathname}
                        </strong>
                        <small className="mt-[3px] block text-[10px] text-foreground-subtle">
                          {Object.keys(script.env).length} 个环境变量
                        </small>
                      </div>
                    </div>
                    <div data-label="状态">
                      <StatusBadge status={script.status} />
                    </div>
                    <span
                      className="font-mono text-foreground-subtle"
                      data-label="进程"
                    >
                      {script.pid ? `PID ${script.pid}` : '—'}
                    </span>
                    <span data-label="重试">
                      {script.retry < 0 ? '持续重试' : `${script.retry} 次`}
                    </span>
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton
                        label="查看日志"
                        onClick={() => setLogging(script)}
                      >
                        <ScrollText size={16} />
                      </IconButton>
                      <IconButton
                        label="编辑配置"
                        onClick={() => setEditing(script)}
                      >
                        <Settings2 size={16} />
                      </IconButton>
                      {active ? (
                        <IconButton
                          label="停止实例"
                          disabled={busy === `stop:${script.pathname}`}
                          onClick={() =>
                            runScriptAction(
                              `stop:${script.pathname}`,
                              '/api/stop',
                              { pathname: script.pathname },
                              '实例已停止',
                            )
                          }
                        >
                          <Square size={15} />
                        </IconButton>
                      ) : (
                        <IconButton
                          label="启动实例"
                          disabled={busy === `start:${script.pathname}`}
                          onClick={() =>
                            runScriptAction(
                              `start:${script.pathname}`,
                              '/api/start',
                              { pathname: script.pathname },
                              '实例已启动',
                            )
                          }
                        >
                          <Play size={16} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'grid min-h-[38px] grid-cols-[14px_auto_auto_minmax(0,1fr)_auto] items-center gap-[9px] bg-surface-row px-[18px] py-[7px] text-[10px] text-foreground-subtle [&>p]:m-0 [&>p]:truncate [&>p]:font-mono [&>p]:text-foreground-secondary [&>time]:font-mono [&>time]:text-[9px] [&>time]:text-foreground-subtle',
                      latestLog?.level === 'ERROR' &&
                        '[&>svg]:text-destructive',
                      latestLog?.level === 'SUCCESS' && '[&>svg]:text-primary',
                      latestLog?.level === 'WARN' && '[&>svg]:text-warning',
                    )}
                  >
                    <ScrollText size={13} />
                    <span className="text-muted-foreground">最近执行</span>
                    {latestLog ? (
                      <>
                        <span className="rounded-sm border border-border-strong px-[5px] py-0.5 font-mono text-[9px] text-muted-foreground">
                          {latestLog.level}
                        </span>
                        <p title={latestLog.content}>{latestLog.content}</p>
                        <time>{formatLogTime(latestLog.createdAt)}</time>
                      </>
                    ) : (
                      <p>暂无执行日志</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Boxes size={22} />}
            title={query ? '未找到脚本' : '暂无脚本实例'}
            description={
              query ? '尝试调整搜索关键词' : '同步脚本目录以创建实例记录'
            }
          />
        )}
      </section>

      <ScriptSettings
        busy={busy}
        script={editing}
        onClose={() => setEditing(null)}
        runAction={runAction}
      />
      <ScriptLogs
        busy={busy}
        runAction={runAction}
        script={logging}
        onClose={() => setLogging(null)}
      />
    </>
  );
}

interface EnvironmentRow {
  id: number;
  key: string;
  value: string;
}

type EnvironmentEditorMode = 'table' | EnvironmentSourceFormat;

const environmentModes: { value: EnvironmentEditorMode; label: string }[] = [
  { value: 'table', label: '表格' },
  { value: 'env', label: '.env' },
  { value: 'linux', label: 'Linux' },
  { value: 'windows', label: 'Windows' },
  { value: 'yaml', label: 'YAML' },
];

let environmentRowId = 0;

function createEnvironmentRow(key = '', value = ''): EnvironmentRow {
  environmentRowId += 1;
  return { id: environmentRowId, key, value };
}

function ScriptSettings({
  script,
  busy,
  onClose,
  runAction,
}: {
  script: ScriptRecord | null;
  busy: string | null;
  onClose: () => void;
  runAction: ActionRunner;
}) {
  const [error, setError] = useState('');
  const [environment, setEnvironment] = useState<EnvironmentRow[]>([]);
  const [environmentMode, setEnvironmentMode] =
    useState<EnvironmentEditorMode>('table');
  const [environmentSource, setEnvironmentSource] = useState('');

  useEffect(() => {
    setError('');
    setEnvironmentMode('table');
    setEnvironmentSource('');
    const rows = Object.entries(script?.env ?? {}).map(([key, value]) =>
      createEnvironmentRow(key, value),
    );
    setEnvironment(rows.length > 0 ? rows : [createEnvironmentRow()]);
  }, [script]);

  function updateEnvironment(
    id: number,
    field: 'key' | 'value',
    value: string,
  ) {
    setEnvironment((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function environmentEntries() {
    const entries = environment
      .map((row) => ({ key: row.key.trim(), value: row.value }))
      .filter((row) => row.key || row.value);
    if (entries.some((row) => !row.key)) {
      throw new Error('环境变量键名不能为空');
    }
    return validateEnvironmentEntries(entries);
  }

  function changeEnvironmentMode(nextMode: EnvironmentEditorMode) {
    if (nextMode === environmentMode) return;
    try {
      const entries =
        environmentMode === 'table'
          ? environmentEntries()
          : parseEnvironmentSource(environmentSource, environmentMode);
      if (nextMode === 'table') {
        setEnvironment(
          entries.length
            ? entries.map(({ key, value }) => createEnvironmentRow(key, value))
            : [createEnvironmentRow()],
        );
        setEnvironmentSource('');
      } else {
        setEnvironmentSource(serializeEnvironmentSource(entries, nextMode));
      }
      setEnvironmentMode(nextMode);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '环境变量格式不正确');
    }
  }

  function removeEnvironment(id: number) {
    setEnvironment((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createEnvironmentRow()];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!script) return;
    const form = new FormData(event.currentTarget);
    try {
      const entries =
        environmentMode === 'table'
          ? environmentEntries()
          : parseEnvironmentSource(environmentSource, environmentMode);
      if (new Set(entries.map((row) => row.key)).size !== entries.length) {
        throw new Error('环境变量键名不能重复');
      }
      const env = Object.fromEntries(
        entries.map((row) => [row.key, row.value]),
      );
      const ok = await runAction(
        `update:${script.pathname}`,
        '/api/update',
        {
          pathname: script.pathname,
          retry: Number(form.get('retry')),
          env,
        },
        '脚本配置已保存',
      );
      if (ok) onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '配置格式不正确');
    }
  }

  return (
    <Modal
      description={script?.pathname}
      className="w-[min(680px,calc(100%-32px))] max-[520px]:w-full"
      open={Boolean(script)}
      title="编辑脚本配置"
      onClose={onClose}
    >
      {script ? (
        <form
          className="flex flex-col gap-[17px] p-5"
          key={script.pathname}
          onSubmit={submit}
        >
          <Field
            label="最大重试次数"
            hint="-1 表示持续重试，0 表示禁用自动重试"
          >
            <Input
              defaultValue={script.retry}
              min={-1}
              name="retry"
              required
              type="number"
            />
          </Field>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <div className="flex min-h-9 items-center justify-between gap-3">
              <div className="flex flex-col gap-[3px]">
                <legend className="text-[11px] font-medium text-foreground-secondary">
                  环境变量
                </legend>
              </div>
              {environmentMode === 'table' ? (
                <Button
                  onClick={() =>
                    setEnvironment((rows) => [...rows, createEnvironmentRow()])
                  }
                  className="text-primary"
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <ListPlus size={15} />
                  添加变量
                </Button>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-surface-inset">
              <div
                aria-label="环境变量格式"
                className="grid grid-cols-5 gap-[3px] border-b border-border bg-background p-1.5 max-[520px]:grid-cols-3"
                role="tablist"
              >
                {environmentModes.map((mode) => (
                  <button
                    aria-selected={environmentMode === mode.value}
                    className={cn(
                      'flex min-h-[30px] min-w-0 cursor-pointer items-center justify-center gap-[5px] rounded-full border border-transparent bg-transparent text-[11px] font-medium text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground-strong focus-visible:outline-2 focus-visible:outline-primary/70 max-[520px]:min-h-[34px]',
                      environmentMode === mode.value &&
                        'border-primary/30 bg-secondary text-primary',
                    )}
                    key={mode.value}
                    onClick={() => changeEnvironmentMode(mode.value)}
                    role="tab"
                    type="button"
                  >
                    {mode.value === 'table' ? (
                      <ListPlus size={13} />
                    ) : (
                      <Braces size={13} />
                    )}
                    {mode.label}
                  </button>
                ))}
              </div>
              {environmentMode === 'table' ? (
                <div className="flex flex-col gap-2 p-3">
                  {environment.map((row) => (
                    <div
                      className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)_34px] items-center gap-2 max-[520px]:grid-cols-[minmax(0,1fr)_34px] [&_[data-slot=input]:first-child]:font-mono [&_[data-slot=input]:first-child]:uppercase max-[520px]:[&_[data-slot=input]:first-child]:col-start-1 max-[520px]:[&_[data-slot=input]:nth-child(2)]:col-start-1 max-[520px]:[&_[data-slot=button]]:col-start-2 max-[520px]:[&_[data-slot=button]]:row-span-2 max-[520px]:[&_[data-slot=button]]:row-start-1"
                      key={row.id}
                    >
                      <Input
                        aria-label="环境变量键名"
                        autoComplete="off"
                        onChange={(event) =>
                          updateEnvironment(row.id, 'key', event.target.value)
                        }
                        placeholder="KEY"
                        value={row.key}
                      />
                      <Input
                        aria-label="环境变量值"
                        autoComplete="off"
                        onChange={(event) =>
                          updateEnvironment(row.id, 'value', event.target.value)
                        }
                        placeholder="value"
                        value={row.value}
                      />
                      <IconButton
                        label="删除环境变量"
                        onClick={() => removeEnvironment(row.id)}
                        type="button"
                        variant="danger"
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  aria-label={`${environmentMode} 环境变量`}
                  className="block min-h-[218px] w-full resize-y border-0 bg-surface-inset px-4 py-3.5 font-mono text-xs leading-[1.65] text-foreground-strong outline-none placeholder:text-control-hover focus:shadow-[inset_0_0_0_1px_var(--app-primary)] max-[520px]:min-h-[190px]"
                  onChange={(event) => {
                    setEnvironmentSource(event.target.value);
                    setError('');
                  }}
                  placeholder={
                    environmentMode === 'linux'
                      ? 'export API_URL="https://example.com"'
                      : environmentMode === 'windows'
                        ? 'set "API_URL=https://example.com"'
                        : environmentMode === 'yaml'
                          ? 'API_URL: "https://example.com"'
                          : 'API_URL="https://example.com"'
                  }
                  spellCheck={false}
                  value={environmentSource}
                />
              )}
            </div>
          </fieldset>
          {error ? (
            <p className="m-0 text-[11px] text-destructive">{error}</p>
          ) : null}
          <div className="mx-[-20px] mt-1 mb-[-20px] flex justify-end gap-2 border-t border-border px-5 py-[15px]">
            <Button onClick={onClose} type="button">
              取消
            </Button>
            <Button
              loading={busy === `update:${script.pathname}`}
              type="submit"
              variant="primary"
            >
              保存配置
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function ScriptLogs({
  script,
  busy,
  runAction,
  onClose,
}: {
  script: ScriptRecord | null;
  busy: string | null;
  runAction: ActionRunner;
  onClose: () => void;
}) {
  const pageSize = 200;
  const {
    data: logPages,
    error,
    isLoading,
    isValidating,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<LogRecord[]>(
    (pageIndex, previousPage) => {
      if (!script || (previousPage && previousPage.length < pageSize)) {
        return null;
      }
      const beforeId = pageIndex ? previousPage?.at(-1)?.id : undefined;
      if (pageIndex && beforeId === undefined) return null;
      return `/api/script/logs?pathname=${encodeURIComponent(script.pathname)}&limit=${pageSize}${beforeId ? `&beforeId=${beforeId}` : ''}`;
    },
    request,
    {
      refreshInterval: 1000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateFirstPage: true,
    },
  );
  const pollCountdown = usePollCountdown(1000, isValidating);
  const logs = useMemo(
    () => [
      ...new Map((logPages?.flat() ?? []).map((log) => [log.id, log])).values(),
    ],
    [logPages],
  );
  const orderedLogs = useMemo(() => logs.toReversed(), [logs]);
  const isLoadingMore =
    isLoading || (size > 0 && logPages?.[size - 1] === undefined);
  const hasMore = Boolean(
    logPages?.length && logPages.at(-1)!.length === pageSize,
  );
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) void setSize((current) => current + 1);
  }, [hasMore, isLoadingMore, setSize]);

  return (
    <Sheet
      description={script?.pathname}
      open={Boolean(script)}
      title="运行日志"
      onClose={onClose}
    >
      {script ? (
        <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden bg-surface-inset">
          <div className="sticky top-0 z-2 flex min-h-[46px] items-center justify-between border-b border-border bg-surface-inset/94 px-3.5 py-1.5 backdrop-blur-[10px]">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground-subtle [&>svg]:text-primary">
              <CircleDot
                className={isValidating ? 'animate-pulse' : ''}
                size={11}
              />
              {isValidating
                ? isLoadingMore
                  ? '正在加载更早日志'
                  : '正在更新'
                : `${logs.length} 条日志 · ${pollCountdown} 秒后轮询`}
            </span>
            <div className="flex items-center gap-0.5">
              <IconButton
                label="清空日志"
                disabled={
                  !logs.length ||
                  busy === `script:logs:clear:${script.pathname}`
                }
                onClick={async () => {
                  const ok = await runAction(
                    `script:logs:clear:${script.pathname}`,
                    '/api/script/logs/clear',
                    { pathname: script.pathname },
                    '运行日志已清空',
                  );
                  if (ok) {
                    await setSize(1);
                    await mutate();
                  }
                }}
                variant="danger"
              >
                <Trash2 size={15} />
              </IconButton>
              <IconButton
                label="刷新日志"
                disabled={isValidating}
                onClick={() => void mutate()}
              >
                <RefreshCw
                  className={
                    isValidating
                      ? 'animate-spin motion-reduce:animate-none'
                      : ''
                  }
                  size={15}
                />
              </IconButton>
            </div>
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
          {!isLoading && !error && logs.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={20} />}
              title="暂无实例日志"
              description="启动脚本后，标准输出和错误会显示在这里"
            />
          ) : null}
          {orderedLogs.length ? (
            <VirtualLogList
              excludedTag={script.pathname}
              hasMore={hasMore}
              key={script.pathname}
              loadingMore={isLoadingMore}
              logs={orderedLogs}
              onReachStart={loadMore}
            />
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
