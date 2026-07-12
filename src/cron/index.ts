import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { type ActionType, cron, type TCron } from '../db/schema';
import { logger } from '../logger';
import type { NoriScript } from '../script';
import type { GitSource } from '../script/source/git.ts';
import { ActionBase, type ActionContext } from './action.ts';
import './actions/git-pull.ts';
import './actions/run-script.ts';
import { GitPullAction } from './actions/git-pull.ts';
import { RunScriptAction } from './actions/run-script.ts';

export interface CronUpsertOptions {
  id?: number;
  cron: string;
  type: ActionType;
  config: Record<string, unknown>;
}

export class NoriCronJob {
  private l = logger.with('cron');

  private jobs = new Map<number, Bun.CronJob>();
  private executions = new Map<number, Promise<void>>();
  private readonly context: ActionContext;

  constructor(script: NoriScript, git: GitSource) {
    this.context = { script, git };
  }

  /**
   * 从数据库注册并启用全部计划任务
   */
  start() {
    this.stop();

    const tasks = db.select().from(cron).orderBy(asc(cron.id)).all();
    for (const task of tasks) {
      try {
        this.register(task);
        this.l.log(`计划任务 [${task.id}] 已启用: ${task.cron}`);
      } catch (error) {
        this.l.error(`计划任务 [${task.id}] 注册失败:`, error);
      }
    }
  }

  /**
   * 创建或更新并立即启用计划任务
   * @param options 计划任务配置
   */
  upsert(options: CronUpsertOptions) {
    if (!options || typeof options !== 'object') {
      throw new Error('计划任务配置不能为空');
    }

    const id = options.id;
    if (id !== undefined) {
      this.assertId(id);
    }

    const expression =
      typeof options.cron === 'string' ? options.cron.trim() : '';
    if (!expression) {
      throw new Error('Cron 表达式不能为空');
    }
    if (
      !options.config ||
      typeof options.config !== 'object' ||
      Array.isArray(options.config)
    ) {
      throw new Error('任务 config 必须是 JSON 对象');
    }

    try {
      if (!Bun.cron.parse(expression)) {
        throw new Error('表达式没有下一次执行时间');
      }
    } catch (error) {
      const message = error instanceof Error ? `: ${error.message}` : '';
      throw new Error(`Cron 表达式不合法${message}`);
    }

    ActionBase.validate(options.type, options.config, this.context);

    const values = {
      cron: expression,
      type: options.type,
      config: options.config,
    };

    if (id === undefined) {
      const task = db.insert(cron).values(values).returning().get();

      try {
        this.register(task);
      } catch (error) {
        db.delete(cron).where(eq(cron.id, task.id)).run();
        throw error;
      }

      this.l.log(`计划任务 [${task.id}] 已创建并启用: ${task.cron}`);
      return task;
    }

    const previous = db.select().from(cron).where(eq(cron.id, id)).get();
    if (!previous) {
      throw new Error(`计划任务不存在: ${id}`);
    }

    const task = db
      .update(cron)
      .set(values)
      .where(eq(cron.id, id))
      .returning()
      .get();

    try {
      this.register(task);
    } catch (error) {
      db.update(cron)
        .set({
          cron: previous.cron,
          type: previous.type,
          config: previous.config,
        })
        .where(eq(cron.id, id))
        .run();
      throw error;
    }

    this.l.log(`计划任务 [${task.id}] 已更新并启用: ${task.cron}`);
    return task;
  }

  /**
   * 立即执行计划任务
   * @param id 任务 ID
   */
  execute(id: number): Promise<void> {
    this.assertId(id);

    const pending = this.executions.get(id);
    if (pending) return pending;

    const execution = this.executeAction(id).finally(() => {
      this.executions.delete(id);
    });
    this.executions.set(id, execution);
    return execution;
  }

  /**
   * 删除计划任务
   * @param id 任务 ID
   */
  remove(id: number) {
    this.assertId(id);

    const task = db.delete(cron).where(eq(cron.id, id)).returning().get();
    if (!task) {
      throw new Error(`计划任务不存在: ${id}`);
    }

    this.jobs.get(id)?.stop();
    this.jobs.delete(id);
    this.l.log(`计划任务 [${id}] 已删除`);
    return task;
  }

  /**
   * 停止全部计划任务
   */
  stop() {
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();
  }

  /**
   * 注册单个 Bun Cron 任务
   * @param task 任务记录
   */
  private register(task: Pick<TCron, 'id' | 'cron'>) {
    const job = Bun.cron(task.cron, () => this.dispatch(task.id));
    this.jobs.get(task.id)?.stop();
    this.jobs.set(task.id, job);
  }

  /**
   * 派遣任务执行
   * @param id 任务 ID
   * */
  private async dispatch(id: number) {
    try {
      return await this.execute(id);
    } catch (error) {
      this.l.error(`计划任务 [${id}] 执行失败:`, error);
    }
  }

  private async executeAction(id: number) {
    const action = ActionBase.create(id, this.context);
    await action.execute();
    this.l.log(`计划任务 [${id}] 执行完成`);
  }

  private assertId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('计划任务 ID 不合法');
    }
  }
}

// 注册 Action
const _ = [GitPullAction, RunScriptAction];
