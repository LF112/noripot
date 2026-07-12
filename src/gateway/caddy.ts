import type { Subprocess } from 'bun';
import type { IConfig } from 'caddy-json-types';
import { logger } from '../logger';

type CaddyStatus = 'running' | 'stopped' | 'failed';

export class GatewayCaddy {
  private l = logger.with('caddy');
  private _stderr = this.l.tags('STDERR');
  private _stdout = this.l.tags('STDOUT');

  private process: Subprocess | null = null; // Caddy 进程实例

  private status: CaddyStatus = 'stopped'; // Caddy 状态
  private config: IConfig | null = null; // Caddy 配置

  public get adminSocket() {
    const unix = process.env.CADDY_ADMIN_SOCKET;
    if (!unix?.startsWith('/')) {
      throw new Error('CADDY_ADMIN_SOCKET 必须是绝对 Unix Socket 路径');
    }
    return unix;
  }

  public get port() {
    const port = Number(process.env.CADDY_PORT);
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
      throw new Error('CADDY_PORT 必须是 1 到 65535 之间的整数');
    }
    return port;
  }

  /**
   * 更新 Caddy 配置
   * @param config 新的 Caddy 配置
   * @param autoReload 是否自动重载配置，默认为 true
   */
  async updateConfig(config: IConfig, autoReload = true) {
    this.config = config;

    if (!autoReload) return;

    // 重载配置
    if (this.status === 'running') {
      await this.reload();
    } else {
      await this.start();
    }
  }

  /**
   * 启动 CADDY 网关服务
   * */
  async start() {
    if (this.process && this.status === 'running') {
      return;
    }

    if (this.process) {
      throw new Error('Caddy 实例状态异常，无法重复启动');
    }

    const proc = Bun.spawn(
      [
        'caddy',
        'run',
        '--config',
        '/etc/caddy/Caddyfile',
        '--adapter',
        'caddyfile',
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    this.process = proc;
    this.status = 'running';

    void this.streamLogger(proc.stdout, 'STDOUT');
    void this.streamLogger(proc.stderr, 'STDERR');
    void this.monitorProcess(proc);

    try {
      await this.waitForAdmin(proc);
      await this.reload();
      this.l.success(`Caddy 已启动，PID: ${proc.pid}`);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  /**
   * 停止 CADDY 网关服务
   */
  async stop() {
    const proc = this.process;
    this.process = null;
    this.status = 'stopped';

    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
      await proc.exited;
    }
  }

  /**
   * 重载当前配置
   */
  async reload() {
    if (!this.process || this.status !== 'running') {
      throw new Error('Caddy 尚未启动');
    }

    if (!this.config) {
      throw new Error('Caddy 配置尚未设置');
    }

    const response = await this.adminRequest('/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.config),
    });

    if (!response.ok) {
      throw new Error(
        `Caddy 配置重载失败: ${response.status} ${await response.text()}`,
      );
    }
  }

  /**
   * 等待 Caddy Admin API 就绪
   * @param proc Caddy 进程
   * */
  private async waitForAdmin(proc: Subprocess) {
    const attempts = 50;

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (this.process !== proc || proc.exitCode !== null) {
        throw new Error('Caddy 在 Admin API 就绪前退出');
      }

      try {
        const response = await this.adminRequest('/config/');
        if (response.ok) {
          return;
        }
      } catch {
        // Socket 尚未创建，继续等待 Caddy 初始化
      }

      await Bun.sleep(100);
    }

    throw new Error('等待 Caddy Admin API 就绪超时');
  }

  /**
   * 监控 Caddy 进程退出事件
   * @param proc Caddy 进程
   * */
  private async monitorProcess(proc: Subprocess) {
    const exitCode = await proc.exited;

    if (this.process !== proc) {
      return;
    }

    this.process = null;
    this.status = exitCode === 0 ? 'stopped' : 'failed';
    this.l.error(`Caddy 已退出，退出码: ${exitCode}`);
  }

  /**
   * 读取 Caddy 日志流并输出到控制台
   * @param stream Caddy 日志流
   * @param type 日志类型，STDOUT 或 STDERR
   * */
  private async streamLogger(
    stream: ReadableStream<Uint8Array> | number | null | undefined,
    type: 'STDOUT' | 'STDERR',
  ) {
    if (!stream || typeof stream === 'number') {
      return;
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        for (const line of decoder
          .decode(value, { stream: true })
          .split('\n')) {
          this.parseCaddyLog(type, line.trim());
        }
      }
    } catch (error) {
      this.l.error(`Caddy ${type} 日志流读取异常:`, error);
    } finally {
      reader.releaseLock();
    }
  }

  private parseCaddyLog(type: 'STDOUT' | 'STDERR', content: string) {
    if (!content) {
      return;
    }

    const log = type === 'STDOUT' ? this._stdout : this._stderr;

    try {
      const {
        level,
        ts: _,
        ...values
      } = JSON.parse(content) as {
        level?: 'info' | 'warn' | 'error' | 'debug' | 'panic' | 'fatal';
        ts?: number;
      };

      const logs = JSON.stringify(values);
      switch (level) {
        case 'error':
        case 'fatal':
          log.error(logs);
          break;
        case 'warn':
          log.warn(logs);
          break;
        case 'info':
          log.info(logs);
          break;
        case 'debug':
          log.debug(logs);
          break;
        case 'panic':
          log.error('Caddy PANIC:', logs);
          break;
        default:
          log.log(logs);
      }
    } catch {
      log.log(content);
    }
  }

  /**
   * 发送请求到 Caddy Admin API
   * @param path 请求路径
   * @param init 请求初始化参数
   * */
  private adminRequest(path: string, init?: RequestInit) {
    return fetch(`http://localhost${path}`, {
      ...init,
      unix: this.adminSocket,
    });
  }
}
