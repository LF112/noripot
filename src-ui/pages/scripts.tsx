import {
  Boxes,
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
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
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
import { usePollCountdown } from '../lib/use-poll-countdown';
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

      <section className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label="搜索脚本"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索脚本路径"
            value={query}
          />
        </label>
        <span className="polling-state">
          {isValidating || logsValidating ? (
            <RefreshCw className="animate-spin" size={11} />
          ) : (
            <CircleDot size={11} />
          )}
          {filtered.length} 个实例 · {pollCountdown} 秒后刷新
        </span>
      </section>

      <section className="table-panel">
        {filtered.length ? (
          <div className="data-table scripts-table">
            <div className="table-head">
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
                <div className="script-job-entry" key={script.pathname}>
                  <div className="table-row">
                    <div className="primary-cell" data-label="脚本">
                      <span className="file-icon">
                        <TerminalSquare size={17} />
                      </span>
                      <div>
                        <strong>{script.pathname}</strong>
                        <small>
                          {Object.keys(script.env).length} 个环境变量
                        </small>
                      </div>
                    </div>
                    <div data-label="状态">
                      <StatusBadge status={script.status} />
                    </div>
                    <span className="mono muted" data-label="进程">
                      {script.pid ? `PID ${script.pid}` : '—'}
                    </span>
                    <span data-label="重试">
                      {script.retry < 0 ? '持续重试' : `${script.retry} 次`}
                    </span>
                    <div className="row-actions">
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
                    className={`latest-log-row ${latestLog ? `level-${latestLog.level.toLowerCase()}` : ''}`}
                  >
                    <ScrollText size={13} />
                    <span className="latest-log-label">最近执行</span>
                    {latestLog ? (
                      <>
                        <span className="log-level">{latestLog.level}</span>
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

  useEffect(() => {
    setError('');
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
      const entries = environment
        .map((row) => ({ key: row.key.trim(), value: row.value }))
        .filter((row) => row.key || row.value);
      if (entries.some((row) => !row.key)) {
        throw new Error('环境变量键名不能为空');
      }
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
      open={Boolean(script)}
      title="编辑脚本配置"
      onClose={onClose}
    >
      {script ? (
        <form className="modal-form" key={script.pathname} onSubmit={submit}>
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
          <fieldset className="environment-fieldset">
            <div className="environment-header">
              <legend>环境变量</legend>
              <Button
                onClick={() =>
                  setEnvironment((rows) => [...rows, createEnvironmentRow()])
                }
                type="button"
                variant="ghost"
              >
                <ListPlus size={15} />
                添加变量
              </Button>
            </div>
            <div className="environment-list">
              {environment.map((row) => (
                <div className="environment-row" key={row.id}>
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
          </fieldset>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
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
  const key = script
    ? `/api/script/logs?pathname=${encodeURIComponent(script.pathname)}&limit=300`
    : null;
  const {
    data: logs,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<LogRecord[]>(key, request, {
    refreshInterval: 1000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    keepPreviousData: false,
  });
  const pollCountdown = usePollCountdown(1000, isValidating);
  const orderedLogs = useMemo(() => logs?.toReversed() ?? [], [logs]);

  return (
    <Sheet
      description={script?.pathname}
      open={Boolean(script)}
      title="运行日志"
      onClose={onClose}
    >
      {script ? (
        <div className="script-log-view">
          <div className="script-log-toolbar">
            <span className="polling-state">
              <CircleDot className={isValidating ? 'active' : ''} size={11} />
              {isValidating
                ? '正在更新'
                : `${logs?.length ?? 0} 条日志 · ${pollCountdown} 秒后轮询`}
            </span>
            <div className="log-toolbar-actions">
              <IconButton
                label="清空日志"
                disabled={
                  !logs?.length ||
                  busy === `script:logs:clear:${script.pathname}`
                }
                onClick={async () => {
                  const ok = await runAction(
                    `script:logs:clear:${script.pathname}`,
                    '/api/script/logs/clear',
                    { pathname: script.pathname },
                    '运行日志已清空',
                  );
                  if (ok) await mutate();
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
                  className={isValidating ? 'animate-spin' : ''}
                  size={15}
                />
              </IconButton>
            </div>
          </div>

          {isLoading ? (
            <div className="log-loading">
              <LoaderCircle className="animate-spin" size={20} />
              <span>正在加载日志...</span>
            </div>
          ) : null}
          {error ? (
            <div className="log-loading error-state">
              <span>
                {error instanceof Error ? error.message : '日志加载失败'}
              </span>
            </div>
          ) : null}
          {!isLoading && !error && logs?.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={20} />}
              title="暂无实例日志"
              description="启动脚本后，标准输出和错误会显示在这里"
            />
          ) : null}
          {orderedLogs.length ? (
            <VirtualLogList excludedTag={script.pathname} logs={orderedLogs} />
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
