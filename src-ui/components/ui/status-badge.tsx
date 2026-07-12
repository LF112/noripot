import { cn } from '../../lib/utils';

const statusLabels: Record<string, string> = {
  running: '运行中',
  restarting: '重启中',
  stopped: '已停止',
  failed: '异常',
  SUCCESS: '成功',
  ERROR: '错误',
  WARN: '警告',
  INFO: '信息',
  DEBUG: '调试',
  LOG: '日志',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn('status-badge', `status-${status.toLowerCase()}`)}
      data-slot="badge"
      data-status={status.toLowerCase()}
    >
      <span aria-hidden="true" />
      {statusLabels[status] ?? status}
    </span>
  );
}
