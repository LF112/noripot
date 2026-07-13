import { AlertTriangle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api, request } from './api';
import { AppLayout } from './components/app-layout';
import { Button, IconButton } from './components/ui';
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

export function App() {
  const [active, setActive] = useState<ViewKey>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
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
    };
  }, []);

  const runAction: ActionRunner = useCallback(
    async (key, path, body, successMessage) => {
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
    [mutate, notify],
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
