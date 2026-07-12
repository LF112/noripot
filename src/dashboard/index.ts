import { desc, sql } from 'drizzle-orm';
import type { NoriCronJob } from '../cron';
import { db } from '../db';
import { logs, scripts } from '../db/schema';
import type { NoriGateway } from '../gateway';
import { memoryTransport } from '../logger';
import type { NoriScript } from '../script';
import type { GitSource } from '../script/source/git.ts';

export class NoriDashboard {
  constructor(
    private readonly script: NoriScript,
    private readonly gateway: NoriGateway,
    private readonly cron: NoriCronJob,
    private readonly git: GitSource,
  ) {}

  async snapshot() {
    const [scripts, gateways, repositories] = await Promise.all([
      this.script.list(),
      this.gateway.list(),
      this.git.list(),
    ]);
    const nextRunById = new Map(
      this.cron.schedule().map(({ id, nextRunAt }) => [id, nextRunAt]),
    );
    const cronJobs = this.cron.list().map((job) => ({
      ...job,
      nextRunAt: nextRunById.get(job.id) ?? null,
      latestLog: this.cronLogs(job.id, 1)[0] ?? null,
    }));

    return {
      scripts,
      gateways,
      cronJobs,
      repositories: repositories.map(({ token: _, ...source }) => source),
      recentLogs: memoryTransport.list(80),
    };
  }

  runtimeLogs(limit = 500) {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
    return memoryTransport.list(safeLimit);
  }

  scriptLogs(pathname: string, limit = 200) {
    const normalizedPathname = pathname.trim();
    if (!normalizedPathname) {
      throw new Error('脚本路径不能为空');
    }

    const safeLimit = Math.min(Math.max(limit, 1), 500);
    return db
      .select()
      .from(logs)
      .where(
        sql`exists (
          select 1
          from json_each(${logs.tags})
          where json_each.value = ${normalizedPathname}
        )`,
      )
      .orderBy(desc(logs.createdAt))
      .limit(safeLimit)
      .all();
  }

  clearScriptLogs(pathname: string) {
    const normalizedPathname = pathname.trim();
    if (!normalizedPathname) {
      throw new Error('脚本路径不能为空');
    }

    return db
      .delete(logs)
      .where(
        sql`exists (
          select 1
          from json_each(${logs.tags})
          where json_each.value = ${normalizedPathname}
        )`,
      )
      .run();
  }

  latestScriptLogs() {
    const pathnames = db
      .select({ pathname: scripts.pathname })
      .from(scripts)
      .all();

    return pathnames.map(({ pathname }) => ({
      pathname,
      log: this.scriptLogs(pathname, 1)[0] ?? null,
    }));
  }

  cronLogs(id: number, limit = 200) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('计划任务 ID 不合法');
    }

    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const tag = `cron:${id}`;
    return db
      .select()
      .from(logs)
      .where(
        sql`exists (
          select 1
          from json_each(${logs.tags})
          where json_each.value = ${tag}
        )`,
      )
      .orderBy(desc(logs.createdAt))
      .limit(safeLimit)
      .all();
  }

  clearCronLogs(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('计划任务 ID 不合法');
    }

    const tag = `cron:${id}`;
    return db
      .delete(logs)
      .where(
        sql`exists (
          select 1
          from json_each(${logs.tags})
          where json_each.value = ${tag}
        )`,
      )
      .run();
  }
}
