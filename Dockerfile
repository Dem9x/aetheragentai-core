FROM node:24-alpine3.21 AS deps

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    linux-headers

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/agent-cli/package.json packages/agent-cli/package.json

RUN npm install

# =========================

FROM node:24-alpine3.21 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/apps/web

RUN npx prisma generate
RUN npm run build

# =========================

FROM node:24-alpine3.21 AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma

EXPOSE 3000

WORKDIR /app/apps/web

CMD ["npm", "run", "start"]