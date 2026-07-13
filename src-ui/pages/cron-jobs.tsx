import {
  CalendarClock,
  CircleDot,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ScrollText,
  Timer,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
} from '../components/ui';
import { formatLogTime, VirtualLogList } from '../components/virtual-log-list';
import { usePollCountdown } from '../lib/use-poll-countdown';
import { cn } from '../lib/utils';
import type {
  ActionRunner,
  CronActionType,
  CronRecord,
  CronScheduleRecord,
  LogRecord,
  RepositoryRecord,
  ScriptRecord,
} from '../types';

interface CronJobsProps {
  jobs: CronRecord[];
  repositories: RepositoryRecord[];
  scripts: ScriptRecord[];
  busy: string | null;
  runAction: ActionRunner;
}

export function CronJobs({
  jobs,
  repositories,
  scripts,
  busy,
  runAction,
}: CronJobsProps) {
  const [editing, setEditing] = useState<CronRecord | 'new' | null>(null);
  const [logging, setLogging] = useState<CronRecord | null>(null);
  const [now, setNow] = useState(Date.now());
  const { data: schedules } = useSWR<CronScheduleRecord[]>(
    '/api/cron/schedule',
    request,
    {
      refreshInterval: 5000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );
  const nextRunById = useMemo(
    () => new Map(schedules?.map(({ id, nextRunAt }) => [id, nextRunAt])),
    [schedules],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="AUTOMATION"
        title="计划任务"
        description="按 Cron 表达式执行脚本或同步 Git 仓库"
        actions={
          <Button onClick={() => setEditing('new')} variant="primary">
            <Plus size={15} />
            新建任务
          </Button>
        }
      />

      <section className="overflow-hidden rounded-lg border border-border bg-card max-[1050px]:overflow-x-auto">
        {jobs.length ? (
          <div className="w-full max-[1050px]:min-w-[820px]">
            <div className="grid min-h-[42px] grid-cols-[minmax(160px,1.1fr)_minmax(140px,.9fr)_minmax(160px,1fr)_100px_128px] items-center gap-[18px] border-b border-border bg-background px-[18px] text-[10px] text-foreground-subtle uppercase">
              <span>任务</span>
              <span>调度表达式</span>
              <span>目标</span>
              <span>运行策略</span>
              <span />
            </div>
            {jobs.map((job) => (
              <div
                className="border-b border-secondary last:border-b-0"
                key={job.id}
              >
                <div className="grid min-h-[66px] grid-cols-[minmax(160px,1.1fr)_minmax(140px,.9fr)_minmax(160px,1fr)_100px_128px] items-center gap-[18px] border-b border-border px-[18px] text-xs text-foreground-secondary hover:bg-surface-hover">
                  <div
                    className="flex min-w-0 items-center gap-[11px]"
                    data-label="任务"
                  >
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-[7px] border border-warning/20 bg-warning/4 text-warning">
                      <CalendarClock size={17} />
                    </span>
                    <div>
                      <strong className="block truncate text-[13px] font-medium text-foreground-strong">
                        {job.type === 'RUN_SCRIPT' ? '运行脚本' : '拉取仓库'}
                      </strong>
                      <small className="mt-[3px] block text-[10px] text-foreground-subtle">
                        任务 #{job.id}
                      </small>
                      <small className="mt-[3px] block font-mono text-[10px] whitespace-nowrap text-primary">
                        {formatNextRunCountdown(
                          nextRunById.get(job.id) ?? job.nextRunAt,
                          now,
                        )}
                      </small>
                    </div>
                  </div>
                  <div
                    className="flex min-w-0 flex-col items-start gap-[5px]"
                    data-label="调度表达式"
                  >
                    <code className="w-max rounded-[5px] border border-border-strong bg-surface-inset px-[7px] py-1 text-[11px] text-foreground-secondary">
                      {job.cron}
                    </code>
                    <small className="text-[10px] leading-[1.4] text-muted-foreground">
                      {describeCronExpression(job.cron)}
                    </small>
                  </div>
                  <span data-label="目标">{job.config.pathname || '—'}</span>
                  <span data-label="运行策略">
                    {job.config.restart ? '重启实例' : '保持运行'}
                  </span>
                  <div className="flex items-center justify-end gap-0.5">
                    <IconButton
                      label="查看执行日志"
                      onClick={() => setLogging(job)}
                    >
                      <ScrollText size={15} />
                    </IconButton>
                    <IconButton
                      label="编辑任务"
                      onClick={() => setEditing(job)}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label="立即执行"
                      disabled={busy === `cron:execute:${job.id}`}
                      onClick={() =>
                        runAction(
                          `cron:execute:${job.id}`,
                          '/api/cron/execute',
                          { id: job.id },
                          '计划任务执行完成',
                        )
                      }
                    >
                      <Play size={15} />
                    </IconButton>
                    <IconButton
                      label="删除任务"
                      variant="danger"
                      onClick={() =>
                        runAction(
                          `cron:remove:${job.id}`,
                          '/api/cron/remove',
                          { id: job.id },
                          '计划任务已删除',
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
                <div
                  className={cn(
                    'grid min-h-[38px] grid-cols-[14px_auto_auto_minmax(0,1fr)_auto] items-center gap-[9px] bg-surface-row px-[18px] py-[7px] text-[10px] text-foreground-subtle [&>p]:m-0 [&>p]:truncate [&>p]:font-mono [&>p]:text-foreground-secondary [&>time]:font-mono [&>time]:text-[9px] [&>time]:text-foreground-subtle',
                    job.latestLog?.level === 'ERROR' &&
                      '[&>svg]:text-destructive',
                    job.latestLog?.level === 'SUCCESS' &&
                      '[&>svg]:text-primary',
                    job.latestLog?.level === 'WARN' && '[&>svg]:text-warning',
                  )}
                >
                  <ScrollText size={13} />
                  <span className="text-muted-foreground">最近执行</span>
                  {job.latestLog ? (
                    <>
                      <span className="rounded-sm border border-border-strong px-[5px] py-0.5 font-mono text-[9px] text-muted-foreground">
                        {job.latestLog.level}
                      </span>
                      <p title={job.latestLog.content}>
                        {job.latestLog.content}
                      </p>
                      <time>{formatLogTime(job.latestLog.createdAt)}</time>
                    </>
                  ) : (
                    <p>暂无执行日志</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              <Button onClick={() => setEditing('new')} variant="primary">
                <Plus size={15} />
                新建任务
              </Button>
            }
            icon={<Timer size={22} />}
            title="暂无计划任务"
            description="创建任务以自动运行脚本或拉取仓库"
          />
        )}
      </section>

      <CronForm
        busy={busy}
        job={editing}
        repositories={repositories}
        scripts={scripts}
        onClose={() => setEditing(null)}
        runAction={runAction}
      />
      <CronLogs
        busy={busy}
        job={logging}
        runAction={runAction}
        onClose={() => setLogging(null)}
      />
    </>
  );
}

function CronForm({
  job,
  repositories,
  scripts,
  busy,
  onClose,
  runAction,
}: {
  job: CronRecord | 'new' | null;
  repositories: RepositoryRecord[];
  scripts: ScriptRecord[];
  busy: string | null;
  onClose: () => void;
  runAction: ActionRunner;
}) {
  const record = job && job !== 'new' ? job : null;
  const [type, setType] = useState<CronActionType>(
    record?.type ?? 'RUN_SCRIPT',
  );
  const [cronValue, setCronValue] = useState(() =>
    normalizeCronExpression(record?.cron ?? ''),
  );
  const [builderOpen, setBuilderOpen] = useState(false);
  const [targetPath, setTargetPath] = useState(
    String(record?.config.pathname ?? ''),
  );

  useEffect(() => {
    setType(record?.type ?? 'RUN_SCRIPT');
    setCronValue(normalizeCronExpression(record?.cron ?? ''));
    setTargetPath(String(record?.config.pathname ?? ''));
    setBuilderOpen(false);
  }, [record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = record?.id;
    const ok = await runAction(
      `cron:save:${id ?? 'new'}`,
      '/api/cron/upsert',
      {
        id,
        cron: cronValue,
        type: form.get('type'),
        config: {
          pathname: form.get('pathname'),
          restart: form.get('restart') === 'on',
        },
      },
      id ? '计划任务已更新' : '计划任务已创建',
    );
    if (ok) onClose();
  }

  return (
    <>
      <Modal
        description="Cron 表达式由 Bun 调度器解析"
        open={Boolean(job)}
        title={record ? `编辑任务 #${record.id}` : '新建计划任务'}
        onClose={onClose}
      >
        {job ? (
          <form
            className="flex flex-col gap-[17px] p-5"
            key={record?.id ?? 'new'}
            onSubmit={submit}
          >
            <Field label="任务类型">
              <Select
                defaultValue={record?.type ?? 'RUN_SCRIPT'}
                name="type"
                onValueChange={(value) => {
                  setType(value as CronActionType);
                  setTargetPath('');
                }}
              >
                <SelectTrigger aria-label="任务类型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUN_SCRIPT">运行脚本</SelectItem>
                  <SelectItem value="GIT_PULL">拉取 Git 仓库</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cron 表达式" hint="例如：*/30 * * * *">
              <div className="grid grid-cols-[minmax(0,1fr)_38px] gap-2 [&_[data-slot=input]]:font-mono [&_[data-slot=button]]:size-[38px] [&_[data-slot=button]]:border-control [&_[data-slot=button]]:bg-surface-inset [&_[data-slot=button]]:text-primary">
                <Input
                  name="cron"
                  onChange={(event) => setCronValue(event.currentTarget.value)}
                  placeholder="*/30 * * * *"
                  required
                  value={cronValue}
                />
                <IconButton
                  label="可视化配置计划"
                  aria-expanded={builderOpen}
                  onClick={() => setBuilderOpen((open) => !open)}
                  type="button"
                >
                  <CalendarClock size={16} />
                </IconButton>
              </div>
              <span
                className="mt-[7px] block text-[10px] leading-[1.4] text-muted-foreground"
                aria-live="polite"
              >
                {describeCronExpression(cronValue)}
              </span>
            </Field>
            <Field label={type === 'GIT_PULL' ? '目标仓库' : '目标脚本'}>
              <Select
                name="pathname"
                onValueChange={setTargetPath}
                required
                value={targetPath}
              >
                <SelectTrigger aria-label="目标">
                  <SelectValue placeholder="选择目标" />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'GIT_PULL' ? repositories : scripts).map(
                    (target) => (
                      <SelectItem key={target.pathname} value={target.pathname}>
                        {target.pathname}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center justify-between gap-5 rounded-md border border-border bg-background p-3">
              <span className="flex flex-col gap-1">
                <strong className="text-[11px] font-medium text-foreground-secondary">
                  {type === 'GIT_PULL' ? '拉取后重启' : '运行前重启'}
                </strong>
                <small className="text-[10px] text-foreground-subtle">
                  停止现有进程后执行本次任务
                </small>
              </span>
              <input
                defaultChecked={Boolean(record?.config.restart)}
                className="relative h-[18px] w-[34px] appearance-none rounded-full border border-control-strong bg-secondary transition before:m-0.5 before:block before:size-3 before:rounded-full before:bg-muted-foreground before:content-[''] checked:border-primary checked:bg-primary checked:before:translate-x-4 checked:before:bg-primary-foreground motion-reduce:transition-none"
                name="restart"
                type="checkbox"
              />
            </label>
            <div className="mx-[-20px] mt-1 mb-[-20px] flex justify-end gap-2 border-t border-border px-5 py-[15px]">
              <Button onClick={onClose} type="button">
                取消
              </Button>
              <Button
                loading={busy === `cron:save:${record?.id ?? 'new'}`}
                type="submit"
                variant="primary"
              >
                保存任务
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        description="选择常用计划类型并生成 Bun 支持的五段式 Cron 表达式"
        open={builderOpen && Boolean(job)}
        title="可视化计划配置"
        onClose={() => setBuilderOpen(false)}
      >
        <div className="p-4 max-[520px]:p-3">
          <CronBuilder
            expression={cronValue}
            onApply={(expression) => {
              setCronValue(expression);
              setBuilderOpen(false);
            }}
          />
        </div>
      </Modal>
    </>
  );
}

function CronLogs({
  job,
  busy,
  runAction,
  onClose,
}: {
  job: CronRecord | null;
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
      if (!job || (previousPage && previousPage.length < pageSize)) return null;
      const beforeId = pageIndex ? previousPage?.at(-1)?.id : undefined;
      if (pageIndex && beforeId === undefined) return null;
      return `/api/cron/logs?id=${job.id}&limit=${pageSize}${beforeId ? `&beforeId=${beforeId}` : ''}`;
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
      description={
        job
          ? `任务 #${job.id} · ${describeCronExpression(job.cron)}`
          : undefined
      }
      open={Boolean(job)}
      title="执行日志"
      onClose={onClose}
    >
      {job ? (
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
                disabled={!logs.length || busy === `cron:logs:clear:${job.id}`}
                onClick={async () => {
                  const ok = await runAction(
                    `cron:logs:clear:${job.id}`,
                    '/api/cron/logs/clear',
                    { id: job.id },
                    '执行日志已清空',
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
              title="暂无执行日志"
              description="任务执行后，开始、完成或失败状态会显示在这里"
            />
          ) : null}
          {orderedLogs.length ? (
            <VirtualLogList
              hasMore={hasMore}
              key={job.id}
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

type ScheduleMode = 'interval' | 'daily' | 'weekly' | 'monthly';
type IntervalUnit = 'minutes' | 'hours';

interface VisualSchedule {
  mode: ScheduleMode;
  interval: number;
  intervalUnit: IntervalUnit;
  time: string;
  weekdays: number[];
  monthDay: number;
}

const scheduleModes: Array<{ value: ScheduleMode; label: string }> = [
  { value: 'interval', label: '间隔' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

const weekdays = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
];

function CronBuilder({
  expression,
  onApply,
}: {
  expression: string;
  onApply: (expression: string) => void;
}) {
  const [schedule, setSchedule] = useState<VisualSchedule>(() =>
    parseVisualSchedule(expression),
  );
  const generatedExpression = createCronExpression(schedule);

  function updateSchedule(values: Partial<VisualSchedule>) {
    setSchedule((current) => ({ ...current, ...values }));
  }

  function toggleWeekday(day: number) {
    const selected = schedule.weekdays.includes(day);
    updateSchedule({
      weekdays: selected
        ? schedule.weekdays.filter((value) => value !== day)
        : [...schedule.weekdays, day],
    });
  }

  return (
    <section
      className="overflow-hidden rounded-md border border-border-strong bg-surface-inset"
      aria-label="可视化计划配置"
    >
      <div
        className="grid grid-cols-4 gap-[3px] border-b border-border bg-background p-1.5"
        role="tablist"
        aria-label="计划类型"
      >
        {scheduleModes.map((mode) => (
          <button
            aria-selected={schedule.mode === mode.value}
            className={cn(
              'min-h-[30px] min-w-0 cursor-pointer rounded-full border border-transparent bg-transparent text-[11px] font-medium text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70',
              schedule.mode === mode.value &&
                'border-primary/30 bg-secondary text-primary',
            )}
            key={mode.value}
            onClick={() => updateSchedule({ mode: mode.value })}
            role="tab"
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-[116px] items-center p-[18px] max-[520px]:items-start max-[520px]:p-3.5">
        {schedule.mode === 'interval' ? (
          <div className="flex w-full items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:flex-wrap [&_[data-slot=input]]:w-[104px] [&_[data-slot=input]]:shrink-0 [&_[data-slot=select-trigger]]:w-[92px] [&_[data-slot=select-trigger]]:shrink-0">
            <span>每隔</span>
            <Input
              aria-label="间隔数值"
              max={schedule.intervalUnit === 'minutes' ? 59 : 23}
              min={1}
              onChange={(event) =>
                updateSchedule({
                  interval: Math.min(
                    Math.max(Number(event.currentTarget.value) || 1, 1),
                    schedule.intervalUnit === 'minutes' ? 59 : 23,
                  ),
                })
              }
              type="number"
              value={schedule.interval}
            />
            <Select
              onValueChange={(value) =>
                updateSchedule({
                  intervalUnit: value as IntervalUnit,
                  interval: Math.min(
                    schedule.interval,
                    value === 'minutes' ? 59 : 23,
                  ),
                })
              }
              value={schedule.intervalUnit}
            >
              <SelectTrigger aria-label="间隔单位">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">分钟</SelectItem>
                <SelectItem value="hours">小时</SelectItem>
              </SelectContent>
            </Select>
            <span>执行一次</span>
          </div>
        ) : null}

        {schedule.mode === 'daily' ? (
          <div className="flex w-full items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:flex-wrap [&_[data-slot=input]]:w-[104px] [&_[data-slot=input]]:shrink-0">
            <span>每天</span>
            <Input
              aria-label="执行时间"
              onChange={(event) =>
                updateSchedule({ time: event.currentTarget.value })
              }
              type="time"
              value={schedule.time}
            />
            <span>执行</span>
          </div>
        ) : null}

        {schedule.mode === 'weekly' ? (
          <div className="flex w-full flex-col gap-3.5">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-[7px] text-[9px] text-foreground-subtle uppercase">
                执行星期
              </legend>
              <div className="grid grid-cols-7 gap-[5px]">
                {weekdays.map((day) => (
                  <button
                    aria-pressed={schedule.weekdays.includes(day.value)}
                    className={cn(
                      'aspect-square min-w-0 cursor-pointer rounded-md border border-border-strong bg-surface-hover text-[11px] text-muted-foreground hover:border-primary/40 hover:bg-primary/6 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary/70',
                      schedule.weekdays.includes(day.value) &&
                        'border-primary/40 bg-primary/6 text-primary',
                    )}
                    key={day.value}
                    onClick={() => toggleWeekday(day.value)}
                    type="button"
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex w-full items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:flex-wrap [&_[data-slot=input]]:w-[104px] [&_[data-slot=input]]:shrink-0">
              <span>执行时间</span>
              <Input
                aria-label="每周执行时间"
                onChange={(event) =>
                  updateSchedule({ time: event.currentTarget.value })
                }
                type="time"
                value={schedule.time}
              />
            </div>
          </div>
        ) : null}

        {schedule.mode === 'monthly' ? (
          <div className="flex w-full items-center gap-[9px] text-[11px] text-muted-foreground max-[520px]:flex-wrap [&_[data-slot=input]]:w-[104px] [&_[data-slot=input]]:shrink-0">
            <span>每月</span>
            <Input
              aria-label="每月执行日期"
              max={31}
              min={1}
              onChange={(event) =>
                updateSchedule({
                  monthDay: Math.min(
                    Math.max(Number(event.currentTarget.value) || 1, 1),
                    31,
                  ),
                })
              }
              type="number"
              value={schedule.monthDay}
            />
            <span>日</span>
            <Input
              aria-label="每月执行时间"
              onChange={(event) =>
                updateSchedule({ time: event.currentTarget.value })
              }
              type="time"
              value={schedule.time}
            />
            <span>执行</span>
          </div>
        ) : null}
      </div>

      <footer className="flex min-h-[58px] items-center justify-between gap-4 border-t border-border bg-background py-2.5 pr-3 pl-4 max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:[&_[data-slot=button]]:w-full">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className="text-[9px] text-foreground-subtle uppercase">
            生成表达式
          </span>
          <code className="truncate text-[11px] text-foreground-secondary">
            {generatedExpression}
          </code>
        </div>
        <Button
          disabled={
            schedule.mode === 'weekly' && schedule.weekdays.length === 0
          }
          onClick={() => onApply(generatedExpression)}
          type="button"
          variant="primary"
        >
          应用配置
        </Button>
      </footer>
    </section>
  );
}

function createCronExpression(schedule: VisualSchedule) {
  const interval = Math.max(1, Math.floor(schedule.interval || 1));
  const [hour, minute] = parseTime(schedule.time);

  switch (schedule.mode) {
    case 'interval':
      return schedule.intervalUnit === 'minutes'
        ? `*/${Math.min(interval, 59)} * * * *`
        : `0 */${Math.min(interval, 23)} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${schedule.weekdays.toSorted((a, b) => a - b).join(',')}`;
    case 'monthly':
      return `${minute} ${hour} ${Math.min(Math.max(schedule.monthDay, 1), 31)} * *`;
    default:
      return `${minute} ${hour} * * *`;
  }
}

function parseVisualSchedule(expression: string): VisualSchedule {
  const defaults: VisualSchedule = {
    mode: 'daily',
    interval: 30,
    intervalUnit: 'minutes',
    time: '09:00',
    weekdays: [1],
    monthDay: 1,
  };
  const parts = normalizeCronExpression(expression).trim().split(/\s+/);
  if (parts.length !== 5) return defaults;

  const [minute, hour, monthDay, month, weekday] = parts;
  if (
    minute === undefined ||
    hour === undefined ||
    monthDay === undefined ||
    month === undefined ||
    weekday === undefined
  ) {
    return defaults;
  }
  if (month !== '*') return defaults;
  if (
    minute?.startsWith('*/') &&
    hour === '*' &&
    monthDay === '*' &&
    weekday === '*'
  ) {
    return {
      ...defaults,
      mode: 'interval',
      interval: Number(minute.slice(2)) || defaults.interval,
    };
  }
  if (
    minute === '0' &&
    hour?.startsWith('*/') &&
    monthDay === '*' &&
    weekday === '*'
  ) {
    return {
      ...defaults,
      mode: 'interval',
      interval: Number(hour.slice(2)) || 1,
      intervalUnit: 'hours',
    };
  }
  if (!isTimePart(hour) || !isTimePart(minute)) return defaults;
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  if (monthDay === '*' && weekday !== '*') {
    const selectedDays = weekday
      .split(',')
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    return {
      ...defaults,
      mode: 'weekly',
      time,
      weekdays: selectedDays.length > 0 ? selectedDays : defaults.weekdays,
    };
  }
  if (monthDay !== '*' && weekday === '*') {
    return {
      ...defaults,
      mode: 'monthly',
      time,
      monthDay: Math.min(Math.max(Number(monthDay) || 1, 1), 31),
    };
  }
  if (monthDay === '*' && weekday === '*') {
    return { ...defaults, mode: 'daily', time };
  }
  return defaults;
}

function normalizeCronExpression(expression: string) {
  const parts = expression.trim().split(/\s+/);
  return parts.length === 6 && parts[0] === '0'
    ? parts.slice(1).join(' ')
    : expression.trim();
}

function isTimePart(value: string | undefined) {
  return value !== undefined && /^\d{1,2}$/.test(value);
}

function parseTime(value: string) {
  const [hour = '9', minute = '0'] = value.split(':');
  return [
    Math.min(Math.max(Number(hour) || 0, 0), 23),
    Math.min(Math.max(Number(minute) || 0, 0), 59),
  ];
}

function describeCronExpression(expression: string) {
  const normalized = normalizeCronExpression(expression);
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) return '请输入五段式 Cron 表达式';

  const [minute, hour, monthDay, month, weekday] = parts;
  if (!minute || !hour || !monthDay || !month || !weekday) {
    return '请输入五段式 Cron 表达式';
  }
  if (
    minute === '*' &&
    hour === '*' &&
    monthDay === '*' &&
    month === '*' &&
    weekday === '*'
  ) {
    return '每分钟执行一次';
  }
  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    monthDay === '*' &&
    month === '*' &&
    weekday === '*'
  ) {
    return `每隔 ${minute.slice(2)} 分钟执行一次`;
  }
  if (
    minute === '0' &&
    hour.startsWith('*/') &&
    monthDay === '*' &&
    month === '*' &&
    weekday === '*'
  ) {
    return `每隔 ${hour.slice(2)} 小时执行一次`;
  }
  if (isTimePart(minute) && isTimePart(hour) && month === '*') {
    const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    if (monthDay === '*' && weekday === '*') return `每天 ${time} 执行`;
    if (/^\d{1,2}$/.test(monthDay) && weekday === '*') {
      return `每月 ${monthDay} 日 ${time} 执行`;
    }
    if (monthDay === '*' && /^[0-6](?:,[0-6])*$/.test(weekday)) {
      const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `每${weekday
        .split(',')
        .map((day) => labels[Number(day)])
        .join('、')} ${time} 执行`;
    }
  }
  return `按 ${normalized} 调度`;
}

function formatNextRunCountdown(value: string | null | undefined, now: number) {
  if (!value) return '暂无下次执行时间';
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return '下次执行时间无效';

  const totalSeconds = Math.max(0, Math.ceil((target - now) / 1000));
  if (totalSeconds === 0) return '即将执行';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} 天 ${hours} 小时后执行`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分后执行`;
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒后执行`;
  return `${seconds} 秒后执行`;
}
