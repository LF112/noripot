import { type CronUpsertOptions, NoriCronJob } from './src/cron';
import { NoriGateway } from './src/gateway';
import { logger } from './src/logger';
import { NoriScript, type ScriptUpdateOptions } from './src/script';
import { GitSource, type GitSourceOptions } from './src/script/source/git.ts';

class NoriPot {
  private server: ReturnType<typeof Bun.serve> | null = null;

  public script = new NoriScript();
  public gateway = new NoriGateway();
  public git = new GitSource();
  public cron = new NoriCronJob(this.script, this.git);

  constructor() {
    process.once('SIGINT', () => void this.shutdown('SIGINT'));
    process.once('SIGTERM', () => void this.shutdown('SIGTERM'));
  }

  public async bootstrap() {
    logger.log('正在扫描脚本...');
    const { created, deleted } = await this.script.sync();
    logger.log(
      `脚本扫描完成：新增 ${created.length} 个，删除 ${deleted.length} 个 ✅`,
    );

    try {
      logger.log('正在启动网关...');
      await this.gateway.start();
      logger.log('网关启动成功 ✅');
    } catch {
      logger.log('网关启动失败 ❌');
    }

    logger.log('正在注册计划任务...');
    this.cron.start();
    logger.log('计划任务注册完成 ✅');

    // HTTP SERVER
    this.server = Bun.serve({
      port: 3001,
      routes: {
        '/api/list': {
          GET: async () => {
            return Response.json({
              data: await noripot.script.listScripts(),
            });
          },
        },
        '/api/sync': {
          POST: async () => {
            try {
              const result = await noripot.script.sync();
              if (result.deleted.length > 0) {
                await noripot.gateway.reload();
              }
              return Response.json({ data: result });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 500 },
              );
            }
          },
        },
        '/api/update': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as ScriptUpdateOptions & {
                pathname: string;
              };
              const script = await noripot.script.update(data.pathname, {
                retry: data.retry,
                env: data.env,
              });
              return Response.json({ data: script });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/start': {
          POST: async (req) => {
            const data = (await req.json()) as { pathname: string };

            try {
              await noripot.script.run(data.pathname);
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }

            return Response.json({
              data: true,
            });
          },
        },
        '/api/stop': {
          POST: async (req) => {
            const data = (await req.json()) as { pathname: string };

            try {
              await noripot.script.stop(data.pathname);
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }

            return Response.json({
              data: await noripot.script.listScripts(),
            });
          },
        },
        '/api/cron/upsert': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as CronUpsertOptions;
              const task = noripot.cron.upsert(data);
              return Response.json(
                { data: task },
                { status: data.id === undefined ? 201 : 200 },
              );
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/cron/execute': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { id: number };
              await noripot.cron.execute(data.id);
              return Response.json({ data: true });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/cron/remove': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { id: number };
              const task = noripot.cron.remove(data.id);
              return Response.json({ data: task });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/gateway/list': {
          GET: async () => {
            return Response.json({
              data: await noripot.gateway.list(),
            });
          },
        },
        '/api/gateway/upsert': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as {
                pathname: string;
                port: number;
                path: string;
              };
              const gateway = await noripot.gateway.upsert(data);
              return Response.json({ data: gateway }, { status: 201 });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/gateway/remove': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { id: number };
              const gateway = await noripot.gateway.remove(data.id);
              return Response.json({ data: gateway });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        '/api/gateway/reload': {
          POST: async () => {
            try {
              await noripot.gateway.reload();
              return Response.json({ data: true });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 503 },
              );
            }
          },
        },
        // 获取 Git 仓库列表
        '/api/git/list': {
          GET: async () => {
            const sources = await noripot.git.list();
            return Response.json({
              data: sources,
            });
          },
        },
        // 获取 Git 仓库配置
        '/api/git/get': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { pathname: string };
              const source = await noripot.git.get(data.pathname);
              if (!source) {
                return Response.json(
                  { error: 'Git 仓库不存在' },
                  { status: 404 },
                );
              }
              return Response.json({
                data: source,
              });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        // 新增或更新 Git 仓库配置
        '/api/git/upsert': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as GitSourceOptions;
              const source = await noripot.git.upsert(data);
              return Response.json({ data: source }, { status: 201 });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        // 删除 Git 仓库配置
        '/api/git/remove': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { pathname: string };
              const source = await noripot.git.remove(data.pathname);
              return Response.json({
                data: source,
              });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        // 强制同步 Git 仓库代码
        '/api/git/pull': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { pathname: string };
              const source = await noripot.git.pull(data.pathname);
              return Response.json({
                data: source,
              });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        // 获取已配置仓库的远端分支列表
        '/api/git/branch/list': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as { pathname: string };
              return Response.json({
                data: await noripot.git.listBranches(data.pathname),
              });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
        // 获取远端仓库的分支列表
        '/api/git/branch/remote/list': {
          POST: async (req) => {
            try {
              const data = (await req.json()) as {
                url: string;
                token?: string;
              };
              return Response.json({
                data: await noripot.git.listRemoteBranches(
                  data.url,
                  data.token,
                ),
              });
            } catch (error) {
              return Response.json(
                { error: (error as Error).message },
                { status: 400 },
              );
            }
          },
        },
      },
      async fetch() {
        return new Response('Not Found', { status: 404 });
      },
    });

    logger.log(`🐾 NoriPot 已就绪！`);
  }

  private async shutdown(signal: NodeJS.Signals) {
    logger.log(`🐾 NoriPot 收到 ${signal} 信号，正在关闭...`);

    if (this.server) {
      logger.log('正在关闭 HTTP 服务...');
      await this.server.stop(true);
    }

    this.cron.stop();

    logger.log('正在关闭网关...');
    await noripot.gateway.stop();

    logger.close();
    process.exit(0);
  }
}

const noripot = new NoriPot();
await noripot.bootstrap();
