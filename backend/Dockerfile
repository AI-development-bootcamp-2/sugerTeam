FROM node:20-alpine

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile

COPY backend/ ./backend/

WORKDIR /app/backend

RUN pnpm exec prisma generate

COPY backend/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
