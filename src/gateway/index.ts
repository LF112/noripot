import type { IConfig, IModulesCaddyhttpRoute } from 'caddy-json-types';
import { asc, eq, or } from 'drizzle-orm';
import { db } from '../db';
import { gateway } from '../db/schema';
import { GatewayCaddy } from './caddy.ts';

export type GatewayOptions = {
  id?: number;
  pathname: string;
  port: number;
  path: string;
};

type GatewayRecord = typeof gateway.$inferSelect;

export class NoriGateway {
  private caddy = new GatewayCaddy();

  private reloadQueue: Promise<void> = Promise.resolve();

  /**
   * 启动 Caddy 网关
   */
  async start() {
    await this.caddy.updateConfig(await this.getConfig());
  }

  /**
   * 关闭 Caddy 网关
   */
  async stop() {
    await this.caddy.stop();
  }

  /**
   * 从数据库获取网关配置
   */
  async list() {
    return db.select().from(gateway).orderBy(asc(gateway.id));
  }

  /**
   * 新增或更新网关配置
   */
  async upsert(options: GatewayOptions) {
    this.validateOptions(options);

    const script = await db.query.scripts.findFirst({
      where: { pathname: options.pathname },
    });
    if (!script) {
      throw new Error('脚本不存在');
    }

    const current = options.id
      ? await db.query.gateway.findFirst({ where: { id: options.id } })
      : undefined;
    if (options.id && !current) {
      throw new Error('网关不存在');
    }

    const conflicts = await db
      .select()
      .from(gateway)
      .where(
        or(eq(gateway.port, options.port), eq(gateway.path, options.path)),
      );
    const otherConflicts = conflicts.filter((entry) => entry.id !== options.id);
    const samePort = otherConflicts.find(
      (entry) => entry.port === options.port,
    );
    const samePath = otherConflicts.find(
      (entry) => entry.path === options.path,
    );

    if (options.id && otherConflicts.length > 0) {
      if (samePort) {
        throw new Error('端口已被其他网关配置使用');
      }
      throw new Error('网关路径已被其他网关配置使用');
    }

    if (otherConflicts.some((entry) => entry.pathname !== options.pathname)) {
      if (samePort?.pathname !== options.pathname) {
        throw new Error('端口已被其他网关配置使用');
      }
      throw new Error('网关路径已被其他网关配置使用');
    }

    if (samePort && samePath && samePort.id !== samePath.id) {
      throw new Error('端口和路径分别属于不同的网关配置，无法更新');
    }

    const existing = current ?? samePort ?? samePath;
    const created = existing
      ? db
          .update(gateway)
          .set({
            pathname: options.pathname,
            port: options.port,
            path: options.path,
          })
          .where(eq(gateway.id, existing.id))
          .returning()
          .get()
      : db.insert(gateway).values(options).returning().get();

    await this.reload();
    return created;
  }

  /**
   * 删除网关配置
   */
  async remove(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('网关 ID 不合法');
    }

    const existing = await db.query.gateway.findFirst({ where: { id } });
    if (!existing) {
      throw new Error('网关不存在');
    }

    await db.delete(gateway).where(eq(gateway.id, id));
    await this.reload();
    return existing;
  }

  /**
   * 重载 caddy 配置
   */
  reload() {
    const task = this.reloadQueue.then(async () => {
      await this.caddy.updateConfig(await this.getConfig());
    });

    this.reloadQueue = task.catch(() => undefined);
    return task;
  }

  /**
   * 获取当前配置
   * */
  private async getConfig(): Promise<IConfig> {
    return this.createConfig(await this.list());
  }

  /**
   * 生成 Caddy 原生 JSON 配置
   * @param entries 网关配置列表
   */
  private createConfig(entries: GatewayRecord[]): IConfig {
    const routes: IModulesCaddyhttpRoute[] = entries.map((entry) => ({
      match: [{ path: [entry.path] }],
      handle: [
        {
          handler: 'reverse_proxy',
          upstreams: [{ dial: `127.0.0.1:${entry.port}` }],
        },
      ],
      terminal: true,
    }));

    routes.push({
      handle: [
        {
          handler: 'static_response',
          status_code: '404',
          body: 'Not Found',
        },
      ],
      terminal: true,
    });

    return {
      admin: {
        listen: `unix/${this.caddy.adminSocket}`,
      },
      apps: {
        http: {
          servers: {
            gateway: {
              listen: [`:${this.caddy.port}`],
              routes,
            },
          },
        },
      },
    };
  }

  /**
   * 验证网关配置参数
   * @param options 网关配置参数
   * */
  private validateOptions({ pathname, port, path }: GatewayOptions) {
    if (!pathname) {
      throw new Error('脚本路径不能为空');
    }

    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
      throw new Error('端口必须是 1 到 65535 之间的整数');
    }

    if (port === this.caddy.port) {
      throw new Error('网关端口不能与 Caddy 监听端口相同');
    }

    if (!path.startsWith('/')) {
      throw new Error('网关路径必须以 / 开头');
    }
  }
}
