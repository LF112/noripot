import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { isUndefined } from 'underscore';
import { db } from '../../db';
import { gitSources, scripts, type TGitSource } from '../../db/schema';
import { NoriFile } from './base.ts';

export interface GitSourceOptions {
  pathname: string;
  url: string;
  branch?: string | null;
  token?: string | null;
  proxy?: string | null;
}

export interface GitProxyTestOptions {
  pathname?: string;
  url: string;
  token?: string | null;
  proxy?: string | null;
}

export interface GitPullResult {
  source: TGitSource;
  changed: boolean;
}

export class GitSource extends NoriFile {
  private syncing = new Map<string, Promise<GitPullResult>>();

  constructor() {
    super('projects/scripts');
  }

  /**
   * 获取所有 Git 仓库配置
   * */
  async list() {
    return db.query.gitSources.findMany();
  }

  /**
   * 获取指定 Git 仓库配置
   * @param pathname 脚本路径
   * */
  async get(pathname: string) {
    this.assertPathname(pathname);
    return db.query.gitSources.findFirst({ where: { pathname } });
  }

  /**
   * 新增或更新 Git 仓库配置
   * @param options Git 仓库配置
   * */
  async upsert(options: GitSourceOptions) {
    const { pathname } = options;
    this.assertPathname(pathname);
    const url = this.normalizeUrl(options.url);

    // 获取当前 git 配置
    const current = await this.get(pathname);

    const token = isUndefined(options.token)
      ? (current?.token ?? null)
      : options.token;
    const branch = isUndefined(options.branch)
      ? (current?.branch ?? null)
      : options.branch;
    const proxy = isUndefined(options.proxy)
      ? (current?.proxy ?? null)
      : this.normalizeProxy(options.proxy);
    this.assertToken(token ?? undefined, url);
    this.assertProxy(proxy, url);

    // 获取脚本配置
    const script = await db.query.scripts.findFirst({ where: { pathname } });

    // 检查 Git 仓库地址是否已存在
    const existingUrl = await db.query.gitSources.findFirst({ where: { url } });
    if (existingUrl && existingUrl.pathname !== pathname) {
      throw new Error(`Git 仓库地址已存在: ${url}`);
    }

    // 检查远端分支是否存在
    if (branch) {
      await this.assertRemoteBranch(url, token ?? undefined, branch, proxy);
    }

    // DATABASE
    const source: TGitSource = {
      pathname,
      url,
      branch,
      token,
      proxy,
      commitHash: current?.commitHash ?? null,
      commitMessage: current?.commitMessage ?? null,
      updatedAt: current?.updatedAt ?? null,
    };

    // 如果 GIT 配置已存在那就更新
    if (current) {
      return db
        .update(gitSources)
        .set({ url, branch, token, proxy })
        .where(eq(gitSources.pathname, pathname))
        .returning()
        .get();
    }

    // 新建配置
    const target = this.realpath(pathname);
    const targetStat = await this.safeStat(target);
    if (targetStat && !targetStat.isDirectory()) {
      throw new Error(`脚本路径必须是目录: ${pathname}`);
    }

    const createdScript = !script;
    try {
      if (createdScript) {
        await db.insert(scripts).values({ pathname });
      }
      await db.insert(gitSources).values(source);
      await this.clone(source);
    } catch (error) {
      if (createdScript) {
        await db.delete(scripts).where(eq(scripts.pathname, pathname));
      } else {
        await db.delete(gitSources).where(eq(gitSources.pathname, pathname));
      }
      throw error;
    }

    return this.updateCommitMetadata(pathname, this.realpath(pathname));
  }

  /**
   * 删除 Git 仓库配置
   * @param pathname 脚本路径
   * */
  async remove(pathname: string) {
    const source = await this.requireSource(pathname);
    await db.delete(gitSources).where(eq(gitSources.pathname, pathname));
    return source;
  }

  /**
   * 强制同步远端分支代码
   * @param pathname 脚本路径
   * */
  async pull(pathname: string): Promise<GitPullResult> {
    this.assertPathname(pathname);
    const pending = this.syncing.get(pathname);
    if (pending) return pending;

    const task = this.pullUnlocked(pathname).finally(() => {
      this.syncing.delete(pathname);
    });
    this.syncing.set(pathname, task);
    return task;
  }

  /**
   * 获取已配置仓库的远端分支列表
   * @param pathname 脚本路径
   * */
  async listBranches(pathname: string) {
    const source = await this.requireSource(pathname);
    return this.listRemoteBranches(
      source.url,
      source.token ?? undefined,
      source.proxy,
    );
  }

  /**
   * 获取远端仓库的分支列表
   * @param url Git 仓库地址
   * @param token Personal Access Token
   * @param proxy
   * */
  async listRemoteBranches(url: string, token?: string, proxy?: string | null) {
    const cleanUrl = this.normalizeUrl(url);
    const cleanProxy = this.normalizeProxy(proxy);
    this.assertToken(token, cleanUrl);
    this.assertProxy(cleanProxy, cleanUrl);
    const authenticatedUrl = this.withToken(cleanUrl, token);
    const output = await this.git(
      ['ls-remote', '--heads', authenticatedUrl],
      this.dir,
      token,
      cleanProxy,
    );

    return output
      .split('\n')
      .map((line) => line.match(/\trefs\/heads\/(.+)$/)?.[1])
      .filter((branch): branch is string => Boolean(branch))
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * 测试代理能否访问指定 Git 仓库
   * @param options Git 仓库及代理配置
   * */
  async testProxy(options: GitProxyTestOptions) {
    const url = this.normalizeUrl(options.url);
    const proxy = this.normalizeProxy(options.proxy);
    if (!proxy) throw new Error('Git 代理地址不能为空');

    const current = options.pathname
      ? await this.get(options.pathname)
      : undefined;
    const token = isUndefined(options.token)
      ? (current?.token ?? undefined)
      : (options.token ?? undefined);
    this.assertToken(token, url);
    this.assertProxy(proxy, url);

    await this.git(
      ['ls-remote', this.withToken(url, token)],
      this.dir,
      token,
      proxy,
      15_000,
    );
    return true;
  }

  private async pullUnlocked(pathname: string) {
    const source = await this.requireSource(pathname);
    const repositoryPath = this.realpath(pathname);
    const gitDirectory = await this.safeStat(join(repositoryPath, '.git'));

    if (!gitDirectory?.isDirectory()) {
      throw new Error(`Git 仓库目录无效: ${repositoryPath}`);
    }

    const previousCommitHash = (
      await this.git(['rev-parse', 'HEAD'], repositoryPath)
    ).trim();
    await this.sync(source, repositoryPath);
    const updatedSource = await this.updateCommitMetadata(
      pathname,
      repositoryPath,
    );

    return {
      source: updatedSource,
      changed: previousCommitHash !== updatedSource.commitHash,
    };
  }

  private async updateCommitMetadata(pathname: string, repositoryPath: string) {
    const [commitHash, commitMessage] = await Promise.all([
      this.git(['rev-parse', 'HEAD'], repositoryPath),
      this.git(['log', '-1', '--pretty=%s'], repositoryPath),
    ]);

    return db
      .update(gitSources)
      .set({
        commitHash: commitHash.trim(),
        commitMessage: commitMessage.trim(),
        updatedAt: new Date(),
      })
      .where(eq(gitSources.pathname, pathname))
      .returning()
      .get();
  }

  /**
   * 克隆远端仓库到本地
   * @param source Git 仓库配置
   * */
  private async clone(source: TGitSource) {
    const target = this.realpath(source.pathname);
    const targetStat = await this.safeStat(target);
    const temporary = `${target}.clone-${crypto.randomUUID()}`;
    const backup = `${target}.backup-${crypto.randomUUID()}`;
    const authenticatedUrl = this.withToken(
      source.url,
      source.token ?? undefined,
    );
    const gitignore = await readFile(join(target, '.gitignore')).catch(
      () => null,
    );

    try {
      await mkdir(this.dir, { recursive: true });
      await this.git(
        [
          'clone',
          '--no-checkout',
          '--origin',
          'origin',
          authenticatedUrl,
          temporary,
        ],
        this.dir,
        source.token ?? undefined,
        source.proxy,
      );
      await this.git(['remote', 'set-url', 'origin', source.url], temporary);
      await this.sync(source, temporary);
      if (gitignore) {
        await writeFile(join(temporary, '.gitignore'), gitignore);
      }
      if (targetStat) {
        await rename(target, backup);
        try {
          await rename(temporary, target);
        } catch (error) {
          await rename(backup, target);
          throw error;
        }
        await rm(backup, { recursive: true, force: true }).catch(
          () => undefined,
        );
      } else {
        await rename(temporary, target);
      }
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * 同步远端分支代码到本地
   * @param source Git 仓库配置
   * @param repositoryPath 本地仓库路径
   * */
  private async sync(source: TGitSource, repositoryPath: string) {
    const token = source.token ?? undefined;
    const authenticatedUrl = this.withToken(source.url, token);
    const branches = await this.listRemoteBranches(
      source.url,
      token,
      source.proxy,
    );
    const branch =
      source.branch ??
      (await this.defaultBranch(source.url, token, source.proxy));

    if (!branches.includes(branch)) {
      throw new Error(`远端分支不存在: ${branch}`);
    }

    await this.git(['remote', 'set-url', 'origin', source.url], repositoryPath);
    await this.git(
      [
        'fetch',
        '--prune',
        '--no-tags',
        authenticatedUrl,
        '+refs/heads/*:refs/remotes/origin/*',
      ],
      repositoryPath,
      token,
      source.proxy,
    );

    const gitignorePath = join(repositoryPath, '.gitignore');
    const gitignore = await readFile(gitignorePath).catch(() => null);
    await this.git(
      ['checkout', '-B', branch, `refs/remotes/origin/${branch}`],
      repositoryPath,
    );
    await this.git(
      ['reset', '--hard', `refs/remotes/origin/${branch}`],
      repositoryPath,
    );
    await this.git(['clean', '-ffdx', '-e', '.gitignore'], repositoryPath);

    if (gitignore) {
      await writeFile(gitignorePath, gitignore);
    }

    await this.git(
      ['branch', '--set-upstream-to', `origin/${branch}`, branch],
      repositoryPath,
    );
  }

  /**
   * 获取远端仓库的默认分支
   * @param url Git 仓库地址
   * @param token Personal Access Token
   * @param proxy
   * */
  private async defaultBranch(
    url: string,
    token?: string,
    proxy?: string | null,
  ) {
    const output = await this.git(
      ['ls-remote', '--symref', this.withToken(url, token), 'HEAD'],
      this.dir,
      token,
      proxy,
    );
    const branch = output.match(/^ref: refs\/heads\/(.+)\tHEAD$/m)?.[1];
    if (!branch) throw new Error('无法获取远端默认分支');
    return branch;
  }

  /**
   * 检查远端分支是否存在
   * @param url Git 仓库地址
   * @param token Personal Access Token
   * @param branch 分支名称
   * @param proxy
   * */
  private async assertRemoteBranch(
    url: string,
    token: string | undefined,
    branch: string,
    proxy?: string | null,
  ) {
    if (!(await this.listRemoteBranches(url, token, proxy)).includes(branch)) {
      throw new Error(`远端分支不存在: ${branch}`);
    }
  }

  /*
   * 获取指定 Git 仓库配置
   * @param pathname 脚本路径
   */
  private async requireSource(pathname: string) {
    const source = await this.get(pathname);
    if (!source) throw new Error(`Git 仓库不存在: ${pathname}`);
    return source;
  }

  /**
   * 将 Git 仓库地址规范化为标准 URL
   * @param value Git 仓库地址
   * */
  private normalizeUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Git 仓库地址不合法');
    }

    if (!['https:', 'http:', 'ssh:', 'file:'].includes(url.protocol)) {
      throw new Error(`不支持的 Git 协议: ${url.protocol}`);
    }

    url.username = '';
    url.password = '';
    return url.href;
  }

  /**
   * 将 Personal Access Token 添加到 Git 仓库地址中
   * @param url Git 仓库地址
   * @param token Personal Access Token
   * */
  private withToken(url: string, token?: string) {
    if (!token) return url;
    const authenticated = new URL(url);
    authenticated.username = token;
    return authenticated.href;
  }

  /**
   * 检查 Personal Access Token 是否可用
   * @param token Personal Access Token
   * @param url Git 仓库地址
   * */
  private assertToken(token: string | undefined, url: string) {
    if (!token) return;
    if (new URL(url).protocol !== 'https:') {
      throw new Error('PAT 仅支持 HTTPS Git 仓库地址');
    }
  }

  /**
   * 规范化并校验 Git HTTP 代理地址
   * @param value HTTP 代理地址
   * */
  private normalizeProxy(value?: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;

    let proxy: URL;
    try {
      proxy = new URL(normalized);
    } catch {
      throw new Error('Git 代理地址不合法');
    }

    if (
      ![
        'http:',
        'https:',
        'socks4:',
        'socks4a:',
        'socks5:',
        'socks5h:',
      ].includes(proxy.protocol)
    ) {
      throw new Error(`不支持的 Git 代理协议: ${proxy.protocol}`);
    }

    return proxy.href;
  }

  /**
   * 检查代理是否适用于当前 Git 仓库协议
   * @param proxy HTTP 代理地址
   * @param url Git 仓库地址
   * */
  private assertProxy(proxy: string | null, url: string) {
    if (!proxy) return;
    if (!['http:', 'https:'].includes(new URL(url).protocol)) {
      throw new Error('代理仅支持 HTTP/HTTPS Git 仓库地址');
    }
  }

  /**
   * 检查脚本路径是否合法
   * @param pathname 脚本路径
   * */
  private assertPathname(pathname: string) {
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(pathname) ||
      pathname === '.' ||
      pathname === '..'
    ) {
      throw new Error('脚本路径只能包含字母、数字、点、下划线和连字符');
    }
  }

  /**
   * 执行 Git 命令
   * @param args Git 命令参数
   * @param cwd 当前工作目录
   * @param token Personal Access Token
   * @param proxy
   * @param timeoutMs
   * */
  private async git(
    args: string[],
    cwd: string,
    token?: string,
    proxy?: string | null,
    timeoutMs?: number,
  ) {
    const config = proxy ? ['-c', `http.proxy=${proxy}`] : [];
    const process = Bun.spawn(['git', ...config, ...args], {
      cwd,
      env: { ...globalThis.process.env, GIT_TERMINAL_PROMPT: '0' },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    let timedOut = false;
    const timeout = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          process.kill();
        }, timeoutMs)
      : undefined;
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ]);
    if (timeout) clearTimeout(timeout);

    if (timedOut) {
      throw new Error(`Git 代理连接测试超时 (${timeoutMs! / 1000} 秒)`);
    }

    if (exitCode !== 0) {
      const message = this.redact(stderr.trim() || stdout.trim(), token);
      throw new Error(`Git 命令执行失败 (${exitCode}): ${message}`);
    }

    return stdout;
  }

  /**
   * 将 Personal Access Token 从 Git 命令输出中脱敏
   * @param message Git 命令输出
   * @param token Personal Access Token
   * */
  private redact(message: string, token?: string) {
    if (!token) return message;
    return message
      .replaceAll(token, '<PAT>')
      .replaceAll(encodeURIComponent(token), '<PAT>');
  }
}
