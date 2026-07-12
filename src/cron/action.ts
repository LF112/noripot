import { eq } from 'drizzle-orm';
import { db } from '../db';
import { ActionType, cron } from '../db/schema';
import type { NoriScript } from '../script';
import type { GitSource } from '../script/source/git.ts';

export interface ActionContext {
  script: NoriScript;
  git: GitSource;
}

type ActionClass = new (id: number, context: ActionContext) => ActionBase;

export abstract class ActionBase {
  protected abstract config: unknown;

  private static classMap = new Map<ActionType, ActionClass>();

  protected constructor(
    public readonly id: number,
    protected readonly context: ActionContext,
    public readonly type: ActionType,
  ) {}

  /**
   * 注册任务
   * @param type 任务类型
   * @param actionClass
   */
  static register(type: ActionType, actionClass: ActionClass) {
    ActionBase.classMap.set(type, actionClass);
  }

  /**
   * 使用具体任务类校验配置
   * @param type 任务类型
   * @param config 任务配置
   * @param context 任务依赖
   */
  static validate(type: ActionType, config: unknown, context: ActionContext) {
    const Action = ActionBase.classMap.get(type);
    if (!Action) {
      throw new Error(`不支持的任务类型: ${type}`);
    }

    new Action(0, context).assertConfig(config);
  }

  /**
   * 根据任务 ID 创建任务实例
   * @param id 任务 ID
   * @param context 任务依赖
   * @returns 任务实例
   */
  static create(id: number, context: ActionContext): ActionBase {
    const task = db
      .select({ type: cron.type })
      .from(cron)
      .where(eq(cron.id, id))
      .get();
    if (!task) {
      throw new Error(`计划任务不存在: ${id}`);
    }

    const Action = ActionBase.classMap.get(task.type);
    if (!Action) {
      throw new Error(`构造失败！不支持的任务类型: ${task.type}`);
    }

    return new Action(id, context);
  }

  /**
   * 加载最新配置并执行任务
   * */
  public async execute() {
    const task = db
      .select({ type: cron.type, config: cron.config })
      .from(cron)
      .where(eq(cron.id, this.id))
      .get();
    if (!task) {
      throw new Error(`计划任务不存在: ${this.id}`);
    }
    if (task.type !== this.type) {
      throw new Error(`计划任务类型已变更，请重新注册: ${this.id}`);
    }

    this.assertConfig(task.config);
    this.config = task.config;
    await this.perform();
  }

  protected abstract assertConfig(config: unknown): void;

  protected abstract perform(): Promise<void>;
}

export { ActionType };
