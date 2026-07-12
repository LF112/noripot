import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { scripts } from '../db/schema';
import { NoriRuntime, type ProcessOptions } from './runtime.ts';
import { ScriptFile } from './source/file.ts';
import { ScriptPackage } from './source/package.ts';

export interface ScriptSyncResult {
  created: string[];
  deleted: string[];
}

export type ScriptUpdateOptions = Partial<ProcessOptions>;

export class NoriScript extends ScriptFile {
  public package = new ScriptPackage();
  private runtime = new NoriRuntime(this);
  private syncing: Promise<ScriptSyncResult> | null = null;

  /**
   * 获取脚本配置及当前运行状态
   */
  async list() {
    const records = await db
      .select()
      .from(scripts)
      .orderBy(asc(scripts.pathname));
    return records.map((record) => ({
      ...record,
      ...this.runtime.getStatus(record.pathname),
    }));
  }

  /**
   * 根据脚本目录同步数据库记录
   * */
  async sync(): Promise<ScriptSyncResult> {
    if (this.syncing) return this.syncing;

    this.syncing = this.syncUnlocked().finally(() => {
      this.syncing = null;
    });
    return this.syncing;
  }

  private async syncUnlocked(): Promise<ScriptSyncResult> {
    const scanned = await this.listScripts();
    const scannedSet = new Set(scanned);
    const stored = await db
      .select({ pathname: scripts.pathname })
      .from(scripts);
    const storedSet = new Set(stored.map(({ pathname }) => pathname));
    const created = scanned.filter((pathname) => !storedSet.has(pathname));
    const deleted = stored
      .map(({ pathname }) => pathname)
      .filter((pathname) => !scannedSet.has(pathname))
      .sort((a, b) => a.localeCompare(b));

    for (const pathname of created) {
      await this.package.autoInstall(pathname);
    }

    for (const pathname of deleted) {
      await this.runtime.stop(pathname);
    }

    if (deleted.length > 0) {
      await db.delete(scripts).where(inArray(scripts.pathname, deleted));
    }
    if (created.length > 0) {
      await db
        .insert(scripts)
        .values(created.map((pathname) => ({ pathname })))
        .onConflictDoNothing();
    }

    return { created, deleted };
  }

  /**
   * 更新脚本配置
   * @param pathname 脚本路径
   * @param options 脚本配置
   * */
  async update(pathname: string, options: ScriptUpdateOptions) {
    if (typeof pathname !== 'string' || !pathname) {
      throw new Error('脚本路径不能为空');
    }
    if (!options || typeof options !== 'object') {
      throw new Error('脚本配置不能为空');
    }

    const script = await db.query.scripts.findFirst({ where: { pathname } });
    if (!script) {
      throw new Error('脚本不存在');
    }
    if (!(await this.checkPathname(pathname))) {
      throw new Error('脚本文件不存在');
    }

    const values: ScriptUpdateOptions = {};
    if (options.retry !== undefined) {
      if (!Number.isSafeInteger(options.retry) || options.retry < -1) {
        throw new Error('重试次数必须是大于等于 -1 的整数');
      }
      values.retry = options.retry;
    }
    if (options.env !== undefined) {
      if (
        !options.env ||
        typeof options.env !== 'object' ||
        Array.isArray(options.env) ||
        Object.values(options.env).some((value) => typeof value !== 'string')
      ) {
        throw new Error('环境变量必须是字符串键值对');
      }
      values.env = options.env;
    }

    if (Object.keys(values).length === 0) {
      throw new Error('没有可更新的脚本配置');
    }

    return db
      .update(scripts)
      .set(values)
      .where(eq(scripts.pathname, pathname))
      .returning()
      .get();
  }

  /**
   * 启动脚本实例
   * @param pathname 脚本路径
   * @param options 脚本配置
   * */
  async run(pathname: string, options: Partial<ProcessOptions> = {}) {
    return this.runtime.run(pathname, options);
  }

  /**
   * 停止脚本实例
   * @param pathname 脚本路径
   * */
  async stop(pathname: string) {
    return this.runtime.stop(pathname);
  }
}
