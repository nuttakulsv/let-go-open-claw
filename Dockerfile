# NestJS + OpenClaw (ต้องใช้ Node 22+ ตามที่ OpenClaw กำหนด)
FROM node:22-alpine AS base

# ขั้นตอนติดตั้ง dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ขั้นตอน build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ขั้นตอน production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# โฟลเดอร์ config/memory ของ OpenClaw (ถ้าใช้ใน container)
ENV OPENCLAW_HOME=/app/.openclaw
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
