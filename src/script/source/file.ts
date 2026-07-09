import { readdir } from 'node:fs/promises';
import { NoriFile } from './base.ts';

export class ScriptFile extends NoriFile {
  public ALLOW_SCRIPT_SUFFIX = ['.ts'];
  private allowedPathname = new Set<string>(); // 允许的路径

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

        if (
          dirent.isFile() &&
          !this.ALLOW_SCRIPT_SUFFIX.some((suffix) => pathname.endsWith(suffix))
        ) {
          continue;
        }

        this.allowedPathname.add(pathname);
        files.push(pathname);
      }
    } catch {
      return [];
    }

    return files;
  }

  /**
   * 判断是否为允许的路径
   * @param pathname 路径
   * */
  async checkPathname(pathname: string) {
    if (!this.allowedPathname.has(pathname)) {
      if (!(await this.listScripts()).includes(pathname)) {
        return false;
      }
    }
    return true;
  }
}
