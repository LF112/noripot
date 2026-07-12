import {
  Activity,
  Boxes,
  Clock3,
  GitBranch,
  Network,
  TerminalSquare,
} from 'lucide-react';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui';
import type { DashboardSnapshot, ProcessState } from '../types';

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
        description="脚本、路由和自动化任务的实时状态。"
      />

      <section className="stat-grid" aria-label="系统统计">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.tone}`}>
                <Icon size={18} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </article>
          );
        })}
      </section>

      <div className="overview-grid">
        <section className="panel process-panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">RUNTIME</span>
              <h2>实例状态</h2>
            </div>
            <div className="instance-state-summary">
              {processStates.map(({ status, label }) => (
                <span
                  className={`overview-state status-${status}`}
                  key={status}
                >
                  <i aria-hidden="true" />
                  {label} {stateCounts[status]}
                </span>
              ))}
            </div>
          </header>
          {data.scripts.length ? (
            <div className="compact-list">
              {data.scripts.slice(0, 6).map((script) => (
                <div className="compact-row" key={script.pathname}>
                  <div className="row-title">
                    <TerminalSquare size={16} />
                    <div>
                      <strong>{script.pathname}</strong>
                      <small>
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
              description="同步脚本目录后，实例会显示在这里。"
            />
          )}
        </section>

        <section className="panel log-panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">RECENT ACTIVITY</span>
              <h2>最近活动</h2>
            </div>
            <Activity size={17} />
          </header>
          {data.recentLogs.length ? (
            <div className="log-list">
              {data.recentLogs.slice(0, 8).map((log) => (
                <div className="log-row" key={log.id}>
                  <span className={`log-dot ${log.level.toLowerCase()}`} />
                  <div>
                    <div className="log-meta">
                      <strong>{log.context}</strong>
                      <time>{formatTime(log.createdAt)}</time>
                    </div>
                    <p>{log.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={20} />}
              title="暂无活动"
              description="服务日志会按时间显示在这里。"
            />
          )}
        </section>
      </div>
    </>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
