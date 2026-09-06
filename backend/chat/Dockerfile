# =========================
# 1. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Clean install all dependencies (including devDependencies like typescript)
RUN npm ci

# Copy source code and compile TypeScript to JavaScript (/app/dist)
COPY . .
RUN npm run build

# =========================
# 2. Production Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5002

# Only install runtime dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Run as non-root node user
USER node

EXPOSE 5002

CMD ["node", "dist/index.js"]