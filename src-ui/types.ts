export type ProcessState = 'running' | 'restarting' | 'stopped' | 'failed';

export interface ScriptRecord {
  pathname: string;
  retry: number;
  env: Record<string, string>;
  status: ProcessState;
  pid: number | null;
  retryCount: number;
}

export interface GatewayRecord {
  id: number;
  pathname: string;
  port: number;
  path: string;
}

export type CronActionType = 'RUN_SCRIPT' | 'GIT_PULL';

export interface CronRecord {
  id: number;
  cron: string;
  type: CronActionType;
  config: {
    pathname?: string;
    restart?: boolean;
    [key: string]: unknown;
  };
  nextRunAt: string | null;
  latestLog: LogRecord | null;
}

export interface CronScheduleRecord {
  id: number;
  nextRunAt: string | null;
}

export interface RepositoryRecord {
  pathname: string;
  url: string;
  branch: string | null;
  commitHash: string | null;
  commitMessage: string | null;
  updatedAt: string | null;
}

export type LogLevel = 'LOG' | 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogRecord {
  id: number;
  context: string;
  level: LogLevel;
  tags: string[];
  content: string;
  createdAt: string;
}

export interface ScriptLatestLogRecord {
  pathname: string;
  log: LogRecord | null;
}

export interface DashboardSnapshot {
  scripts: ScriptRecord[];
  gateways: GatewayRecord[];
  cronJobs: CronRecord[];
  repositories: RepositoryRecord[];
  recentLogs: LogRecord[];
}

export type ViewKey =
  | 'overview'
  | 'scripts'
  | 'gateways'
  | 'cron'
  | 'repositories';

export type ActionRunner = (
  key: string,
  path: string,
  body: unknown,
  successMessage: string,
) => Promise<boolean>;
