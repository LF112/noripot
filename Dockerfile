FROM caddy:2 AS caddy-bin

FROM oven/bun:1 AS base
WORKDIR /noripot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制 Caddy 二进制文件
COPY --from=caddy-bin /usr/bin/caddy /usr/bin/caddy

ENV CADDY_ADMIN_SOCKET=/run/caddy/admin.sock \
    CADDY_PORT=4096

# 设置依赖镜像源
RUN echo '[install]\nregistry = "https://registry.npmmirror.com"' > /root/.bunconfig.toml

# 初始化全局工作区环境
RUN mkdir -p \
    /noripot/_ \
    /noripot/runtime \
    /noripot/projects/scripts


RUN echo '{"name":"noripot-projects","private":true,"workspaces":["scripts/**"]}' > /noripot/projects/package.json
RUN echo '[install]\nlinker = "hoisted"\nregistry = "https://registry.npmmirror.com"' > /noripot/projects/bunfig.toml

FROM base AS install
WORKDIR /temp

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

FROM install AS db-generate
WORKDIR /temp

COPY drizzle.config.ts ./
COPY ./src/db/schema/ ./src/db/schema/
COPY ./drizzle/ ./drizzle/
RUN bun run gen:db

FROM base AS release

# node_modules
COPY --from=install /temp/node_modules /noripot/_/node_modules

# database migrations
COPY --from=db-generate /temp/drizzle /noripot/_/drizzle

# app source
COPY index.ts /noripot/_
COPY ./src/ /noripot/_/src

# projects workspace
COPY --from=base /noripot/projects /noripot/projects

# permissions
RUN chown -R bun:bun /noripot

COPY Caddyfile /etc/caddy/Caddyfile

RUN mkdir -p /run/caddy && chown -R bun:bun /run/caddy

EXPOSE 4096 3001

USER bun

ENTRYPOINT ["bun", "run", "/noripot/_/git.ts"]
