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
      className={cn(
        'inline-flex min-w-[70px] items-center justify-center gap-1.5 rounded-full border border-[#363636] bg-[#1c1c1c] px-2 py-1 text-[10px] leading-none whitespace-nowrap text-[#898989] [&>span]:size-[5px] [&>span]:rounded-full [&>span]:bg-current',
        'data-[status=running]:border-primary/25 data-[status=running]:text-primary data-[status=success]:border-primary/25 data-[status=success]:text-primary',
        'data-[status=restarting]:border-yellow-400/25 data-[status=restarting]:text-yellow-400 data-[status=warn]:border-yellow-400/25 data-[status=warn]:text-yellow-400',
        'data-[status=failed]:border-red-400/25 data-[status=failed]:text-red-400 data-[status=error]:border-red-400/25 data-[status=error]:text-red-400',
      )}
      data-slot="badge"
      data-status={status.toLowerCase()}
    >
      <span aria-hidden="true" />
      {statusLabels[status] ?? status}
    </span>
  );
}
