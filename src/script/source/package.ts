import * as path from 'node:path';
import { logger } from '../../logger';
import { NoriFile } from './base.ts';

export class ScriptPackage extends NoriFile {
  private l = logger.with('package');

  constructor() {
    super('projects');
  }

  /**
   * 自动安装依赖
   * @param pathname 路径
   * */
  public async autoInstall(pathname: string): Promise<boolean> {
    const firstSegment = pathname.split(path.sep).at(0);
    if (!firstSegment) {
      throw new Error('路径不合法');
    }

    const scriptsRoot = this.realpath('scripts');
    const unitPath = path.join(scriptsRoot, firstSegment);
    const unitStat = await this.safeStat(unitPath);
    if (!unitStat) {
      throw new Error('文件/目录不存在');
    }

    // 如果是文件那就跳过
    if (unitStat.isFile()) {
      this.l.log(`${pathname} 无需安装依赖`);
      return false;
    }

    // 找到 package.json 的位置
    const packageRoot = await this.findPackageJsonUntil(
      path.join(scriptsRoot, pathname),
      unitPath,
    );

    if (!packageRoot) {
      this.l.log(`未找到 ${pathname} package.json，跳过安装依赖`);
      return false;
    }

    // 执行安装依赖
    // Bun 的 --filter 选项需要使用相对路径，并且路径分隔符必须是 /
    const packageFilter = `./${path.relative(this.dir, packageRoot).split(path.sep).join('/')}`;
    const install = Bun.spawn(
      ['bun', 'install', '--filter', '!./', '--filter', packageFilter],
      {
        cwd: this.dir,
        stdout: 'inherit',
        stderr: 'inherit',
      },
    );

    const exitCode = await install.exited;
    if (exitCode !== 0) {
      throw new Error(`依赖安装失败: ${packageRoot}`);
    }

    return true;
  }

  /**
   * 查找 package.json 文件
   * @param startPath 起始路径
   * @param stopDir 停止查找的目录
   * */
  async findPackageJsonUntil(startPath: string, stopDir: string) {
    const startStat = await this.safeStat(startPath);

    if (!startStat) {
      return null;
    }

    let current = startStat.isFile() ? path.dirname(startPath) : startPath;

    current = path.resolve(current);
    stopDir = path.resolve(stopDir);

    while (this.isInside(current, stopDir)) {
      const packageJsonPath = path.join(current, 'package.json');

      if (await this.exists(packageJsonPath)) {
        return current;
      }

      if (current === stopDir) {
        break;
      }

      current = path.dirname(current);
    }

    return null;
  }
}
