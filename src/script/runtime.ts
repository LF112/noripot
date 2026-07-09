import type { Subprocess } from 'bun';
import { omit } from 'underscore';
import { db } from '../db';
import type { TScript } from '../db/schema';
import type { NoriScript } from './index.ts';

export type ProcessOptions = Omit<TScript, 'pathname'>;

interface ProcessInfo {
  pathname: string; // 唯一
  process: Subprocess | null;
  status: 'running' | 'stopped' | 'failed';
  retryCount: number; // 重启次数
  config: ProcessOptions; // 脚本配置
}

export class NoriRuntime {
  private processes = new Map<string, ProcessInfo>();

  constructor(private script: NoriScript) {}

  /**
   * 启动脚本实例
   * @param pathname 脚本路径
   * @param options 脚本配置
   * */
  async run(
    pathname: string,
    options: Partial<ProcessOptions> = {},
  ): Promise<void> {
    const scriptOptions = await db.query.scripts.findFirst({
      where: { pathname },
    });
    if (!scriptOptions) {
      throw new Error('脚本不存在');
    }

    if (!(await this.script.checkPathname(pathname))) {
      throw new Error('脚本不存在');
    }

    // 首次启动初始化配置
    if (!this.processes.has(pathname)) {
      this.processes.set(pathname, {
        pathname,
        process: null,
        status: 'stopped',
        retryCount: 0,
        config: { ...omit(scriptOptions, 'pathname'), ...options },
      });
    }

    const info = this.processes.get(pathname)!;

    // 检查是否已经启动进程
    if (info.status === 'running' && info.process) {
      throw new Error('实例已经在运行中，无法重复启动');
    }

    info.status = 'running';

    // 拉起 Bun 子进程
    const proc = Bun.spawn(['bun', 'run', this.script.realpath(pathname)], {
      env: { ...process.env },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    info.process = proc;

    // 监听输出
    void this.streamLogger(pathname, proc.stdout, 'STDOUT');
    void this.streamLogger(pathname, proc.stderr, 'STDERR');

    // 监听进程
    void this.monitorProcess(pathname, proc);
  }

  /**
   * 停止脚本实例
   * @param pathname 脚本路径
   * */
  async stop(pathname: string) {
    const info = this.processes.get(pathname);
    if (info?.process) {
      info.status = 'stopped';
      info.retryCount = 0;
      info.process.kill();
      info.process = null;
      console.log(`🛑 实例 [${pathname}] 已手动停止`);
    }
  }

  /**
   * 监控进程状态，处理异常崩溃和自动重启
   * @param pathname 脚本路径
   * @param proc Bun 子进程实例
   * */
  async monitorProcess(pathname: string, proc: Subprocess) {
    // 等待进程退出，拿到退出码
    const exitCode = await proc.exited;
    const info = this.processes.get(pathname);

    // 如果 info 不存在，或者用户手动触发了 stop，则不进行重启
    if (!info || info.status === 'stopped') return;

    // exitCode !== 0 代表进程异常崩溃
    if (exitCode !== 0) {
      console.error(`🚨 实例 [${pathname}] 异常崩溃，退出码: ${exitCode}`);

      const MAX_RETRIES = info.config.retry;
      if (info.retryCount < MAX_RETRIES) {
        info.retryCount++;
        const delay = info.retryCount * 1000;

        console.log(
          `🔄 [${pathname}] 将在 ${delay / 1000} 秒后尝试第 ${info.retryCount} 次自动重启...`,
        );

        setTimeout(() => {
          this.run(info.pathname);
        }, delay);
      } else {
        console.error(
          `❌ [${pathname}] 连续崩溃超过 ${MAX_RETRIES} 次，停止自动重启！`,
        );
        info.status = 'failed';
      }
    } else {
      // exitCode === 0 代表脚本正常执行完毕退出
      console.log(`✅ 实例 [${pathname}] 已正常运行结束。`);
      info.status = 'stopped';
      info.retryCount = 0; // 正常退出时重置计数器
    }
  }

  /**
   * 进程输出流日志器
   * @param pathname 脚本路径
   * @param stream Bun 子进程的输出流
   * @param type 输出类型，STDOUT 或 STDERR
   * */
  private async streamLogger(
    pathname: string,
    stream: ReadableStream,
    type: 'STDOUT' | 'STDERR',
  ) {
    // 获取流的读取器
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        // 持续读取流中的下一个数据块
        const { done, value } = await reader.read();

        // 如果 done 为 true，代表子进程已经关闭了该输出流
        if (done) {
          break;
        }

        // 将 Uint8Array 解码为文本
        const text = decoder.decode(value, { stream: true });

        // 处理文本
        this.handleLogOutput(pathname, type, text);
      }
    } catch (error) {
      console.error(`[${pathname}] 的 ${type} 日志流读取异常:`, error);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 处理日志输出，将其按行打印到控制台
   * @param pathname 脚本路径
   * @param type 输出类型，STDOUT 或 STDERR
   * @param rawText 原始文本
   * */
  private handleLogOutput(
    pathname: string,
    type: 'STDOUT' | 'STDERR',
    rawText: string,
  ) {
    // 按换行符切分
    const lines = rawText.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue; // 跳过空行

      const logEntry = {
        pathname,
        type, // STDOUT 正常日志，STDERR 错误/异常日志
        time: new Date().toISOString(),
        message: line,
      };

      console.log(
        `[${logEntry.type}][${logEntry.pathname}] ${logEntry.message}`,
      );
    }
  }
}
