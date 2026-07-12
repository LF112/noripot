import { readdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NoriFile } from './base.ts';

export class ScriptFile extends NoriFile {
  public ALLOW_SCRIPT_SUFFIX = ['.ts'];

  constructor() {
    super('projects/scripts');
  }

  /**
   * 获取所有的脚本
   * */
  public async listScripts() {
    const files: string[] = [];

    try {
      for (const dirent of await readdir(this.dir, { withFileTypes: true })) {
        const pathname = dirent.name;

        const isAllowedFile =
          dirent.isFile() &&
          this.ALLOW_SCRIPT_SUFFIX.some((suffix) => pathname.endsWith(suffix));

        if (!dirent.isDirectory() && !isAllowedFile) {
          continue;
        }

        files.push(pathname);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    return files.sort((a, b) => a.localeCompare(b));
  }

  /**
   * 判断是否为允许的路径
   * @param pathname 路径
   * */
  async checkPathname(pathname: string) {
    return (await this.listScripts()).includes(pathname);
  }

  /**
   * 获取脚本运行目录
   * @param pathname 脚本绝对路径
   * */
  async getCwd(pathname: string) {
    const scriptStat = await stat(pathname);
    return scriptStat.isDirectory() ? pathname : dirname(pathname);
  }
}
