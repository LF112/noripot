import { ActionBase, type ActionContext, ActionType } from '../action.ts';

export interface GitPullConfig {
  pathname: string;
  restart: boolean;
}

export class GitPullAction extends ActionBase {
  protected override config!: GitPullConfig;

  static {
    ActionBase.register(ActionType.GIT_PULL, GitPullAction);
  }

  constructor(id: number, context: ActionContext) {
    super(id, context, ActionType.GIT_PULL);
  }

  protected assertConfig(config: unknown): asserts config is GitPullConfig {
    if (
      !config ||
      typeof config !== 'object' ||
      typeof Reflect.get(config, 'pathname') !== 'string' ||
      typeof Reflect.get(config, 'restart') !== 'boolean'
    ) {
      throw new Error(`GIT_PULL 任务配置不合法: ${this.id}`);
    }
  }

  protected async perform() {
    const { changed } = await this.context.git.pull(this.config.pathname);

    if (this.config.restart && changed) {
      await this.context.script.stop(this.config.pathname);
      await this.context.script.run(this.config.pathname);
    }
  }
}
