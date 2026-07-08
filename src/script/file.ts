import { access, stat } from 'node:fs/promises';

import { isAbsolute, join, relative } from 'node:path';

export class NoriFile {
  public readonly dir: string;

  constructor(readonly pathname: string) {
    this.dir = join(process.cwd(), pathname);
  }

  /**
   * 获取文件状态
   * @param pathname 路径
   * */
  protected async safeStat(pathname: string) {
    try {
      return await stat(pathname);
    } catch {
      return null;
    }
  }

  /**
   * 判断 child 是否在 parent 目录下
   * @param child 子路径
   * @param parent 父路径
   * */
  protected isInside(child: string, parent: string) {
    const relativeFilepath = relative(parent, child);
    return (
      relativeFilepath === '' ||
      (!relativeFilepath.startsWith('..') && !isAbsolute(relativeFilepath))
    );
  }

  /**
   * 判断文件是否存在
   * @param pathname 路径
   * */
  protected async exists(pathname: string): Promise<boolean> {
    return access(pathname)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * 判断路径是否是目录
   * @param pathname 路径
   * */
  protected async isDirectory(pathname: string): Promise<boolean> {
    return stat(this.realpath(pathname))
      .then((stats) => stats.isDirectory())
      .catch(() => false);
  }

  private _cachePathname = new Map<string, string>();
  /**
   * 获取脚本的绝对路径
   * @param pathname 脚本相对路径
   * */
  protected realpath(pathname: string): string {
    const cached = this._cachePathname.get(pathname);
    if (cached) {
      return cached;
    }
    const realPath = join(this.dir, pathname);
    this._cachePathname.set(pathname, realPath);
    return realPath;
  }
}
