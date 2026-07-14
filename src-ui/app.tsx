import { AlertTriangle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api, request } from './api';
import { AppLayout } from './components/app-layout';
import { Button, ConfirmDialog, IconButton } from './components/ui';
import { cn } from './lib/utils';
import { CronJobs } from './pages/cron-jobs';
import { Gateways } from './pages/gateways';
import { Overview } from './pages/overview';
import { Repositories } from './pages/repositories';
import { Scripts } from './pages/scripts';
import type { ActionRunner, DashboardSnapshot, ViewKey } from './types';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface ConfirmationState {
  title: string;
  description: string;
  confirmLabel: string;
}

interface PendingConfirmation extends ConfirmationState {
  resolve: (confirmed: boolean) => void;
}

export function App() {
  const [active, setActive] = useState<ViewKey>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );
  const pendingConfirmation = useRef<PendingConfirmation | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data,
    error,
    isLoading: loading,
    mutate,
  } = useSWR<DashboardSnapshot>('/api/dashboard', request, {
    refreshInterval: active === 'overview' ? 2000 : 0,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    shouldRetryOnError: true,
  });

  const notify = useCallback((next: ToastState) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      pendingConfirmation.current?.resolve(false);
    };
  }, []);

  const settleConfirmation = useCallback((confirmed: boolean) => {
    const pending = pendingConfirmation.current;
    if (!pending) return;

    pendingConfirmation.current = null;
    setConfirmation(null);
    pending.resolve(confirmed);
  }, []);

  const requestConfirmation = useCallback((next: ConfirmationState) => {
    return new Promise<boolean>((resolve) => {
      pendingConfirmation.current?.resolve(false);
      const pending = { ...next, resolve };
      pendingConfirmation.current = pending;
      setConfirmation(pending);
    });
  }, []);

  const runAction: ActionRunner = useCallback(
    async (key, path, body, successMessage) => {
      const dangerousAction = getDangerousAction(key, path, body);
      if (dangerousAction && !(await requestConfirmation(dangerousAction))) {
        return false;
      }

      setBusy(key);
      try {
        await api.post(path, body);
        await mutate();
        notify({ type: 'success', message: successMessage });
        return true;
      } catch (cause) {
        notify({
          type: 'error',
          message: cause instanceof Error ? cause.message : '操作失败',
        });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [mutate, notify, requestConfirmation],
  );

  return (
    <AppLayout active={active} onNavigate={setActive}>
      {loading && !data ? <LoadingState /> : null}
      {!loading && error && !data ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : '无法加载控制面板数据'
          }
          onRetry={() => void mutate()}
        />
      ) : null}
      {data ? renderView(active, data, busy, runAction) : null}
      <ConfirmDialog
        confirmLabel={confirmation?.confirmLabel ?? '确认操作'}
        description={confirmation?.description ?? ''}
        open={Boolean(confirmation)}
        title={confirmation?.title ?? '确认操作'}
        onCancel={() => settleConfirmation(false)}
        onConfirm={() => settleConfirmation(true)}
      />
      {toast ? (
        <div
          aria-live="polite"
          className={cn(
            'fixed right-[22px] bottom-[22px] z-80 grid min-h-[52px] w-[min(380px,calc(100vw-44px))] grid-cols-[18px_minmax(0,1fr)_28px] items-center gap-2.5 rounded-lg border border-control bg-surface-hover/96 py-2 pr-2 pl-3.5 text-xs text-foreground-secondary max-[520px]:right-3 max-[520px]:bottom-[78px] max-[520px]:w-[calc(100vw-24px)]',
            toast.type === 'success'
              ? '[&>svg]:text-primary'
              : '[&>svg]:text-destructive',
          )}
          data-slot="toast"
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertTriangle size={17} />
          )}
          <span>{toast.message}</span>
          <IconButton label="关闭通知" onClick={() => setToast(null)}>
            <X size={14} />
          </IconButton>
        </div>
      ) : null}
    </AppLayout>
  );
}

function getDangerousAction(
  key: string,
  path: string,
  body: unknown,
): ConfirmationState | null {
  const pathname = getBodyValue(body, 'pathname');
  const id = getBodyValue(body, 'id');

  switch (path) {
    case '/api/sync':
      return {
        title: '同步脚本目录？',
        description:
          '已从目录移除的脚本将停止运行，其实例记录和关联配置也会被删除。',
        confirmLabel: '确认同步',
      };
    case '/api/stop':
      return {
        title: `停止实例 ${pathname || ''}？`,
        description: '实例进程将立即终止，正在处理的任务或请求可能中断。',
        confirmLabel: '停止实例',
      };
    case '/api/cron/execute':
      return {
        title: `立即执行任务 #${id || ''}？`,
        description: '任务配置的脚本运行、实例重启或仓库拉取操作将立即执行。',
        confirmLabel: '立即执行',
      };
    case '/api/cron/remove':
      return {
        title: `删除计划任务 #${id || ''}？`,
        description:
          '该任务的调度配置将被永久删除。已有执行日志不会被一并删除。',
        confirmLabel: '删除任务',
      };
    case '/api/gateway/remove':
      return {
        title: `删除网关路由 #${id || ''}？`,
        description: '对应的公开访问路径将立即失效。',
        confirmLabel: '删除路由',
      };
    case '/api/git/remove':
      return {
        title: `删除 ${pathname || '该仓库'} 的仓库配置？`,
        description:
          'Git 远端、分支、令牌和代理配置将被删除，本地脚本文件会保留。',
        confirmLabel: '删除配置',
      };
    case '/api/git/pull':
      return {
        title: `强制拉取 ${pathname || '该仓库'}？`,
        description:
          '本地内容将与远端分支强制同步，未提交更改和未跟踪文件会被清理。',
        confirmLabel: '强制拉取',
      };
    case '/api/git/upsert':
      if (!key.endsWith(':new')) return null;
      return {
        title: `添加并克隆 ${pathname || '该仓库'}？`,
        description: '如果目标脚本目录已存在，其内容会由克隆的远端仓库替换。',
        confirmLabel: '添加并克隆',
      };
    case '/api/script/logs/clear':
      return {
        title: `清空 ${pathname || '该脚本'} 的日志？`,
        description: '该脚本当前保存的全部运行日志将被永久删除。',
        confirmLabel: '清空日志',
      };
    case '/api/cron/logs/clear':
      return {
        title: `清空任务 #${id || ''} 的日志？`,
        description: '该计划任务当前保存的全部执行日志将被永久删除。',
        confirmLabel: '清空日志',
      };
    default:
      return null;
  }
}

function getBodyValue(body: unknown, key: string): string {
  if (!body || typeof body !== 'object') return '';
  const value = Reflect.get(body, key);
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function renderView(
  active: ViewKey,
  data: DashboardSnapshot,
  busy: string | null,
  runAction: ActionRunner,
) {
  switch (active) {
    case 'scripts':
      return (
        <Scripts busy={busy} runAction={runAction} scripts={data.scripts} />
      );
    case 'gateways':
      return (
        <Gateways
          busy={busy}
          gateways={data.gateways}
          runAction={runAction}
          scripts={data.scripts}
        />
      );
    case 'cron':
      return (
        <CronJobs
          busy={busy}
          jobs={data.cronJobs}
          repositories={data.repositories}
          runAction={runAction}
          scripts={data.scripts}
        />
      );
    case 'repositories':
      return (
        <Repositories
          busy={busy}
          repositories={data.repositories}
          runAction={runAction}
          scripts={data.scripts}
        />
      );
    default:
      return <Overview data={data} />;
  }
}

function LoadingState() {
  return (
    <div className="flex min-h-[calc(100vh-190px)] flex-col items-center justify-center text-center text-muted-foreground [&_p]:my-3 [&_p]:text-xs">
      <LoaderCircle
        className="animate-spin motion-reduce:animate-none"
        size={24}
      />
      <p>正在连接控制平面...</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-190px)] flex-col items-center justify-center text-center text-muted-foreground [&>svg]:text-destructive [&_p]:my-3 [&_p]:text-xs">
      <AlertTriangle size={24} />
      <h1 className="mt-3.5 text-xl font-normal text-foreground-strong">
        连接失败
      </h1>
      <p>{message}</p>
      <Button onClick={onRetry} type="button" variant="primary">
        重新连接
      </Button>
    </div>
  );
}
