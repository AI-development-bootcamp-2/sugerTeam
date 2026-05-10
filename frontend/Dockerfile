FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --frozen-lockfile

COPY frontend/ ./frontend/

WORKDIR /app/frontend

EXPOSE 5173

CMD ["pnpm", "dev"]
