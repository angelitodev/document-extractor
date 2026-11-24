FROM node:24-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm@12.18.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_URL
RUN pnpm build
RUN mkdir -p node_modules/.vite-temp && chown node:node node_modules/.vite-temp

ENV NODE_ENV=production
EXPOSE 5173
USER node

CMD ["pnpm", "run", "start"]
