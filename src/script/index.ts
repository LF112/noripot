import { db } from '../db';
import { scripts } from '../db/schema';
import { NoriRuntime, type ProcessOptions } from './runtime.ts';
import { ScriptFile } from './source/file.ts';
import { ScriptPackage } from './source/package.ts';

export class NoriScript extends ScriptFile {
  public package = new ScriptPackage();
  private runtime = new NoriRuntime(this);

  /**
   * 初始化脚本 & 配置
   * @param pathname 脚本路径
   * @param options 脚本配置
   * */
  async create(pathname: string, options: Partial<ProcessOptions> = {}) {
    if (await db.query.scripts.findFirst({ where: { pathname } })) {
      throw new Error('脚本已存在');
    }

    // 检查文件是否合法
    if (!(await this.checkPathname(pathname))) {
      throw new Error('脚本文件不合法');
    }

    // 自动安装依赖
    await this.package.autoInstall(pathname);

    // 存储配置
    await db.insert(scripts).values({ pathname, ...options });
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
