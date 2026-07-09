import { NoriScript } from './src/script';

class NoriPot {
  public script = new NoriScript();
}

const noripot = new NoriPot();

Bun.serve({
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
  },
  async fetch() {
    return new Response('Not Found', { status: 404 });
  },
});

console.log('NoriPot 正在运行中');
