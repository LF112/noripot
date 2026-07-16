# NORI POT - 狗食盆

一个使用 Bun 开发的 TypeScript 脚本的轻量级自托管运行平台。提供 Web 控制台，用于统一管理脚本进程、Cron 计划任务、Git 仓库同步、运行日志和 Caddy 反向代理。

> 项目目前处于早期开发阶段，接口和数据结构仍可能发生变化，建议在升级前备份运行数据。

## 功能特性

- **脚本管理**：自动扫描脚本目录，在控制台中启动、停止和同步脚本。
- **进程守护**：查看运行状态、PID 和重试次数，并按配置自动重启异常退出的进程。
- **环境变量**：为每个脚本单独配置运行时环境变量。
- **计划任务**：使用 Cron 表达式定时运行脚本，或拉取 Git 仓库并按需重启实例。
- **Git 同步**：从远端仓库克隆或拉取脚本，支持指定分支和 HTTPS 访问令牌。
- **网关路由**：通过内置 Caddy 将公开路径转发到脚本监听的端口。
- **日志查看**：在控制台查看系统活动、脚本标准输出、错误输出和计划任务执行日志。
- **数据持久化**：使用 SQLite 保存脚本配置、路由、计划任务和日志。

## 快速开始

### 环境要求

- [Docker](https://docs.docker.com/get-docker/)
- Docker Compose v2

### 启动服务

```bash
git clone https://github.com/LF112/noripot
cd noripot
docker compose up -d --build
```

启动后可访问：

| 服务       | 地址                      | 说明               |
|----------|-------------------------|------------------|
| Web 控制台  | <http://localhost:2048> | 管理脚本、任务、仓库、路由和日志 |
| Caddy 网关 | <http://localhost:4096> | 访问控制台中配置的反向代理路由  |

查看运行日志：

```bash
docker compose logs -f noripot
```

停止服务：

```bash
docker compose down
```

## 添加脚本

NoriPot 扫描宿主机的 `./noripot/scripts` 目录。该目录下的一级 `.ts` 文件和一级子目录都会被识别为可运行脚本。

例如，新建 `noripot/scripts/hello.ts`：

```ts
console.log('Hello from NoriPot');
```

然后在 Web 控制台的“脚本实例”页面点击“同步脚本”，找到 `hello.ts` 并启动它。脚本会通过以下方式运行：

```bash
bun run <脚本路径>
```

对于包含 `package.json` 的目录型脚本，NoriPot 会在首次扫描到该目录时自动安装依赖。推荐的目录结构如下：

```text
noripot/scripts/
├── hello.ts
└── webhook-service/
    ├── package.json
    ├── bun.lock
    └── index.ts
```

## 使用说明

### 管理脚本实例

在“脚本实例”页面可以：

- 同步脚本目录中的新增或已删除项目；
- 启动或停止脚本；
- 配置异常退出后的自动重试次数；
- 配置脚本专属环境变量；
- 查看和清理脚本运行日志。

脚本正常退出后会回到停止状态；异常退出时，会根据重试次数逐次延迟重启。重试次数为 `-1` 或 `0` 时不会自动重启。

### 配置计划任务

“计划任务”页面支持两类动作：

- **运行脚本**：按 Cron 表达式启动脚本，可选择先停止已有实例；
- **拉取仓库**：同步指定 Git 仓库，可选择同步前停止、同步后重新启动脚本。

任务创建后会立即注册，也可以从控制台手动执行并查看执行日志。

### 同步 Git 仓库

在“Git 仓库”页面填写脚本路径、仓库地址、分支以及可选的访问令牌。新配置会将仓库克隆到脚本工作区，后续可在控制台手动拉取，也可以交给计划任务定时同步。

注意：

- 访问令牌仅支持 HTTPS 仓库地址；
- 拉取操作会覆盖已跟踪文件的本地修改，但会保留未跟踪文件以及 `.gitignore` 忽略的文件；
- 访问令牌会保存在本地 SQLite 数据库中，请妥善保护持久化目录。

### 配置网关路由

脚本需要启动 HTTP 服务时，可在“网关路由”页面为它分配上游端口和公开路径。NoriPot 启动脚本时会把所配置的端口写入 `PORT` 环境变量，脚本可直接读取：

```ts
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  fetch() {
    return new Response('Hello from gateway');
  },
});
```

若公开路径配置为 `/api/*`，则可通过 `http://localhost:4096/api/...` 访问该脚本。路由修改后 Caddy 配置会自动重载，也可以在控制台中手动重载。

## 数据目录

Docker Compose 默认挂载以下目录：

| 宿主机路径               | 容器路径                        | 用途               |
|---------------------|-----------------------------|------------------|
| `./noripot/runtime` | `/noripot/runtime`          | SQLite 数据库及运行时数据 |
| `./noripot/scripts` | `/noripot/projects/scripts` | 本地脚本与 Git 仓库     |

升级、迁移或重装前，请至少备份这两个目录。执行 `docker compose down` 不会删除其中的数据。

## 本地开发

项目使用 Bun、React、Drizzle ORM、SQLite、Tailwind CSS 和 Caddy。

```bash
bun install
bun run dev
```

`bun run dev` 会使用 `docker-compose.yml` 与 `docker-compose.dev.yml` 构建开发容器，并以监听模式运行应用。修改后重新构建生产容器：

```bash
bun run build
```

常用目录：

```text
.
├── index.ts             # 应用入口与 HTTP API
├── src/
│   ├── cron/            # 计划任务
│   ├── dashboard/       # 控制台后端
│   ├── db/              # 数据库与数据模型
│   ├── gateway/         # Caddy 网关
│   ├── logger/          # 日志系统
│   └── script/          # 脚本扫描、运行与 Git 来源
├── src-ui/              # React 控制台
├── drizzle/             # SQLite 迁移
├── Dockerfile
└── docker-compose.yml
```

## 安全提示

当前 Web 控制台和 HTTP API **没有内置身份认证**，请勿直接暴露到公网。建议仅在可信网络中使用，或在外层反向代理中配置 HTTPS、访问控制和身份认证。同时请限制 `noripot/runtime` 与 `noripot/scripts` 的文件访问权限，因为其中可能包含访问令牌、环境变量和业务代码。

## 参与贡献

欢迎通过 Issue 报告问题或提出建议，也欢迎提交 Pull Request。提交代码前请尽量确保：

1. 变更范围清晰，并附带必要的说明；
2. 不提交令牌、环境变量、数据库或其他敏感数据；
3. 涉及界面或行为变化时，同步更新相关文档；
