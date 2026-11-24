FROM node:24-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm@12.18.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 8000
USER node

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
