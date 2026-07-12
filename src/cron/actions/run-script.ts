import { ActionBase, type ActionContext, ActionType } from '../action.ts';

export interface RunScriptConfig {
  pathname: string;
  restart: boolean;
}

export class RunScriptAction extends ActionBase {
  protected override config!: RunScriptConfig;

  static {
    ActionBase.register(ActionType.RUN_SCRIPT, RunScriptAction);
  }

  constructor(id: number, context: ActionContext) {
    super(id, context, ActionType.RUN_SCRIPT);
  }

  protected assertConfig(config: unknown): asserts config is RunScriptConfig {
    if (
      !config ||
      typeof config !== 'object' ||
      typeof Reflect.get(config, 'pathname') !== 'string' ||
      typeof Reflect.get(config, 'restart') !== 'boolean'
    ) {
      throw new Error(`RUN_SCRIPT 任务配置不合法: ${this.id}`);
    }
  }

  protected async perform() {
    if (this.config.restart) {
      await this.context.script.stop(this.config.pathname);
    }
    await this.context.script.run(this.config.pathname);
  }
}
