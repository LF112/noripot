FROM caddy:2 AS caddy-bin

FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# 复制 Caddy 二进制文件
COPY --from=caddy-bin /usr/bin/caddy /usr/bin/caddy

# 设置依赖镜像源
RUN echo '[install]\nregistry = "https://registry.npmmirror.com"' > /root/.bunconfig.toml

# 初始化全局工作区环境
RUN mkdir -p \
    /usr/src/app/runtime \
    /usr/src/app/projects/scripts


RUN echo '{"name":"noripot-projects","private":true,"workspaces":["scripts/*","scripts/*/*"]}' > /usr/src/app/projects/package.json
RUN echo '[install]\nlinker = "isolated"\nregistry = "https://registry.npmmirror.com"' > /usr/src/app/projects/bunfig.toml

FROM base AS install
WORKDIR /temp

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS release

# node_modules
COPY --from=install /temp/node_modules /usr/src/app/node_modules

# app source
COPY index.ts /usr/src/app
COPY ./src/ /usr/src/app/src

# projects workspace
COPY --from=base /usr/src/app/projects /usr/src/app/projects

# permissions
RUN chown -R bun:bun /usr/src/app

COPY Caddyfile /etc/caddy/Caddyfile

RUN mkdir -p /run/caddy && chown -R bun:bun /run/caddy

EXPOSE 4096 3001

USER bun

ENTRYPOINT ["bun", "run", "/usr/src/app/index.ts"]