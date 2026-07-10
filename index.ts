import { NoriGateway } from './src/gateway';
import { NoriScript } from './src/script';

class NoriPot {
  private server: ReturnType<typeof Bun.serve> | null = null;

  public script = new NoriScript();
  public gateway = new NoriGateway();

  constructor() {
    process.once('SIGINT', () => void this.shutdown('SIGINT'));
    process.once('SIGTERM', () => void this.shutdown('SIGTERM'));
  }

  public async bootstrap() {
    console.log('🐾 NoriPot 正在运行中...');
    try {
      console.log('|- 正在启动网关...');
      await this.gateway.start();
      console.log('|- 网关启动成功 ✅');
    } catch {
      console.log('|- 网关启动失败 ❌');
    }

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
        '/api/start': {
          POST: async (req) => {
            const data = (await req.json()) as { pathname: string };

            try {
              await noripot.script.create(data.pathname);
            } catch (e) {
              console.log((e as Error).message);
            }

            try {
              await noripot.script.run(data.pathname);
            } catch (e) {
              console.log((e as Error).message);
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
            } catch (e) {
              console.log((e as Error).message);
            }

            return Response.json({
              data: await noripot.script.listScripts(),
            });
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
      },
      async fetch() {
        return new Response('Not Found', { status: 404 });
      },
    });

    console.log(`🐾 NoriPot 已就绪！`);
  }

  private async shutdown(signal: NodeJS.Signals) {
    console.log(`🐾 NoriPot 收到 ${signal} 信号，正在关闭...`);

    if (this.server) {
      console.log('|- 正在关闭 HTTP 服务...');
      await this.server.stop(true);
    }

    console.log('|- 正在关闭网关...');
    await noripot.gateway.stop();

    process.exit(0);
  }
}

const noripot = new NoriPot();
await noripot.bootstrap();
