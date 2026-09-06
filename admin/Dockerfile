# =========================
# 1. Dependencies Stage
# =========================
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

# =========================
# 2. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =========================
# 3. Production Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

USER node

EXPOSE 3001

CMD ["npm", "start"]