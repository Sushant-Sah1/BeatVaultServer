# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.16.0

FROM node:${NODE_VERSION}-alpine as base
WORKDIR /usr/src/app
ENV NODE_ENV=production

FROM base as deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps as build
COPY package.json package-lock.json ./
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build  # Now runs just "tsc"

FROM base as final
USER root
RUN apk add --no-cache python3 ffmpeg yt-dlp curl unzip && \
    mkdir -p /usr/src/app/bin && \
    curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
        -o deno.zip && \
    unzip deno.zip deno -d /usr/src/app/bin/ && \
    chmod +x /usr/src/app/bin/deno && \
    ln -sf /usr/bin/yt-dlp /usr/src/app/bin/yt-dlp && \
    rm deno.zip && \
    apk del curl unzip

USER node
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./
COPY --chown=node:node cookies.txt ./cookies.txt

EXPOSE 4444
CMD ["node", "dist/index.js"]
