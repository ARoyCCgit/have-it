# Comprehensive Docker Setup & Troubleshooting Guide

This guide provides step-by-step instructions to properly configure, fix, build, and run the Docker containers for all Have-it microservices and web applications:
- **Backend Services**: `chat`, `user`, `mail`, `post`
- **Frontend Applications**: `frontend` (User Web App), `admin` (Command Center)

---

## Table of Contents
1. [Overview & Identified Issues](#1-overview--identified-issues)
2. [Step 1: Fix Dependency Declarations in package.json](#2-step-1-fix-dependency-declarations-in-packagejson)
3. [Step 2: Add .dockerignore Files (Crucial)](#3-step-2-add-dockerignore-files-crucial)
4. [Step 3: Complete Backend Dockerfiles](#4-step-3-complete-backend-dockerfiles)
   - [Chat Service (Port 5002)](#chat-service-backendchatdockerfile)
   - [User Service (Port 5000)](#user-service-backenduserdockerfile)
   - [Mail Service (Port 5001)](#mail-service-backendmaildockerfile)
   - [Post Service (Port 5003)](#post-service-backendpostdockerfile)
5. [Step 4: Complete Frontend & Admin Dockerfiles](#5-step-4-complete-frontend--admin-dockerfiles)
   - [Frontend Web App (Port 3000)](#frontend-web-app-frontenddockerfile)
   - [Admin Panel (Port 3001)](#admin-panel-admindockerfile)
6. [Step 5: Step-by-Step Verification & Build Commands](#6-step-5-step-by-step-verification--build-commands)
7. [Step 6: Optional Docker Compose Orchestration](#7-step-6-optional-docker-compose-orchestration)

---

## 1. Overview & Identified Issues

Your multi-stage approach using `node:22-alpine` is a clean foundation. However, building and running the images in their current state will encounter the following failures:

| Issue | Impact | Services Affected |
|---|---|---|
| **Missing `cors` in runtime dependencies** | Container crashes on startup with `Cannot find module 'cors'` | `backend/chat` |
| **Missing `typescript` in `package.json`** | Build fails at `npm run build` (`npx tsc`) | `backend/chat`, `backend/user`, `backend/mail` |
| **No `.dockerignore` files** | Host `node_modules` overwrite Linux modules; `.env` secrets get baked into images | All 6 services |
| **Missing `HOSTNAME="0.0.0.0"` in Next.js** | Container is unreachable from outside via `localhost:3000` / `3001` | `frontend`, `admin` |
| **Unexposed Ports** | Harder to trace and debug port mappings | `backend/chat`, `user`, `mail`, `post` |
| **Containers run as `root`** | Security vulnerability in production environments | All 6 services |

---

## 2. Step 1: Fix Dependency Declarations in package.json

Before building the Docker images, you must make a few small adjustments in three `package.json` files.

### 1. [backend/chat/package.json](file:///D:/Chat%20App/backend/chat/package.json)
1. **Move `cors` to dependencies**: In `backend/chat/package.json`, `"cors": "^2.8.6"` is currently under `"devDependencies"`. Because the runner runs `npm ci --omit=dev`, `cors` will not be installed in the final container. Move it to `"dependencies"`.
2. **Add `typescript`**: Add `"typescript": "^5.7.3"` to `"devDependencies"`.

```json
  "dependencies": {
    "axios": "^1.12.2",
    "cloudinary": "^1.41.3",
    "cors": "^2.8.6",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.18.1",
    "multer": "^2.0.2",
    "multer-storage-cloudinary": "^4.0.0",
    "socket.io": "^4.8.3"
  },
  "devDependencies": {
    "@types/axios": "^0.9.36",
    "@types/cors": "^2.8.19",
    "@types/dotenv": "^6.1.1",
    "@types/express": "^5.0.3",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/mongoose": "^5.11.96",
    "@types/multer": "^2.0.0",
    "concurrently": "^9.2.1",
    "nodemon": "^3.1.10",
    "typescript": "^5.7.3"
  }
```

### 2. [backend/user/package.json](file:///D:/Chat%20App/backend/user/package.json)
Add `"typescript": "^5.7.3"` to `"devDependencies"`:

```json
  "devDependencies": {
    "@types/amqplib": "^0.10.7",
    "@types/cors": "^2.8.19",
    "@types/dotenv": "^6.1.1",
    "@types/express": "^5.0.3",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/mongoose": "^5.11.96",
    "@types/redis": "^4.0.10",
    "concurrently": "^9.2.1",
    "nodemon": "^3.1.10",
    "typescript": "^5.7.3"
  }
```

### 3. [backend/mail/package.json](file:///D:/Chat%20App/backend/mail/package.json)
Add `"typescript": "^5.7.3"` to `"devDependencies"`:

```json
  "devDependencies": {
    "@types/amqplib": "^0.10.7",
    "@types/dotenv": "^6.1.1",
    "@types/express": "^5.0.3",
    "@types/nodemailer": "^7.0.1",
    "concurrently": "^9.2.1",
    "nodemon": "^3.1.10",
    "typescript": "^5.7.3"
  }
```

---

## 3. Step 2: Add .dockerignore Files (Crucial)

Create a `.dockerignore` file in the root of **each service folder**:
- `backend/chat/.dockerignore`
- `backend/user/.dockerignore`
- `backend/mail/.dockerignore`
- `backend/post/.dockerignore`
- `frontend/.dockerignore`
- `admin/.dockerignore`

### Standard Content for all `.dockerignore` files:
```dockerignore
node_modules
npm-debug.log
yarn-error.log
dist
.next
.env
.env.local
.env.*.local
.git
.gitignore
.vscode
.idea
*.tsbuildinfo
README.md
```

> **Why this is critical:**
> Without this file, when `COPY . .` runs, your host system's Windows `node_modules` folder is copied into the Linux container, overriding the Alpine binaries. Furthermore, your local `.env` containing sensitive database passwords and API secrets would be baked permanently into the Docker image layers.

---

## 4. Step 3: Complete Backend Dockerfiles

### Chat Service: [backend/chat/Dockerfile](file:///D:/Chat%20App/backend/chat/Dockerfile)
* **Port**: `5002`
* **Entry**: `node dist/index.js`
* **Protocol**: HTTP + Socket.IO

```dockerfile
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
```

---

### User Service: [backend/user/Dockerfile](file:///D:/Chat%20App/backend/user/Dockerfile)
* **Port**: `5000`
* **Entry**: `node dist/index.js`
* **Dependencies**: MongoDB, Redis, RabbitMQ

```dockerfile
# =========================
# 1. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =========================
# 2. Production Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

---

### Mail Service: [backend/mail/Dockerfile](file:///D:/Chat%20App/backend/mail/Dockerfile)
* **Port**: `5001`
* **Entry**: `node dist/index.js`
* **Dependencies**: RabbitMQ consumer, Nodemailer

```dockerfile
# =========================
# 1. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =========================
# 2. Production Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5001

CMD ["node", "dist/index.js"]
```

---

### Post Service: [backend/post/Dockerfile](file:///D:/Chat%20App/backend/post/Dockerfile)
* **Port**: `5003`
* **Entry**: `node dist/index.js`
* **Protocol**: HTTP + Socket.IO

```dockerfile
# =========================
# 1. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =========================
# 2. Production Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5003

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5003

CMD ["node", "dist/index.js"]
```

---

## 5. Step 4: Complete Frontend & Admin Dockerfiles

### Frontend Web App: [frontend/Dockerfile](file:///D:/Chat%20App/frontend/Dockerfile)
* **Port**: `3000`
* **Framework**: Next.js 15
* **Key Additions**: `ENV HOSTNAME="0.0.0.0"`, `USER node`, clean production dependency install.

```dockerfile
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
ENV PORT=3000

# Install only production dependencies in runner
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

USER node

EXPOSE 3000

CMD ["npm", "start"]
```

---

### Admin Panel: [admin/Dockerfile](file:///D:/Chat%20App/admin/Dockerfile)
* **Port**: `3001`
* **Framework**: Next.js 15
* **Fix**: Removed redundant `-- -p 3001` in CMD (since `npm start` in `admin/package.json` already has `-p 3001`).

```dockerfile
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
```

---

## 6. Step 5: Step-by-Step Verification & Build Commands

Once you have updated the files and saved them, test each container one by one using PowerShell or terminal:

### 1. Build and Run Chat Service
```powershell
cd "D:\Chat App\backend\chat"
docker build -t haveit-chat:latest .
docker run -d --name chat-service -p 5002:5002 --env-file .env haveit-chat:latest
docker logs -f chat-service
```

### 2. Build and Run User Service
```powershell
cd "D:\Chat App\backend\user"
docker build -t haveit-user:latest .
docker run -d --name user-service -p 5000:5000 --env-file .env haveit-user:latest
docker logs -f user-service
```

### 3. Build and Run Mail Service
```powershell
cd "D:\Chat App\backend\mail"
docker build -t haveit-mail:latest .
docker run -d --name mail-service -p 5001:5001 --env-file .env haveit-mail:latest
docker logs -f mail-service
```

### 4. Build and Run Post Service
```powershell
cd "D:\Chat App\backend\post"
docker build -t haveit-post:latest .
docker run -d --name post-service -p 5003:5003 --env-file .env haveit-post:latest
docker logs -f post-service
```

### 5. Build and Run Frontend Web App
```powershell
cd "D:\Chat App\frontend"
docker build -t haveit-frontend:latest .
docker run -d --name frontend-app -p 3000:3000 --env-file .env.example haveit-frontend:latest
docker logs -f frontend-app
```

### 6. Build and Run Admin Panel
```powershell
cd "D:\Chat App\admin"
docker build -t haveit-admin:latest .
docker run -d --name admin-app -p 3001:3001 --env-file .env.example haveit-admin:latest
docker logs -f admin-app
```

---

## 7. Step 6: Optional Docker Compose Orchestration

To run the entire ecosystem (all 4 microservices + frontend + admin + Redis + RabbitMQ + MongoDB) seamlessly in a single command, you can create a `docker-compose.yml` in the project root `D:\Chat App\docker-compose.yml`:

```yaml
version: "3.8"

networks:
  haveit-network:
    driver: bridge

services:
  # Infrastructure: Redis Cache
  redis:
    image: redis:7-alpine
    container_name: haveit-redis
    ports:
      - "6379:6379"
    networks:
      - haveit-network

  # Infrastructure: RabbitMQ Broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: haveit-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    networks:
      - haveit-network

  # Microservice: User & Auth
  user-service:
    build:
      context: ./backend/user
      dockerfile: Dockerfile
    container_name: haveit-user-service
    ports:
      - "5000:5000"
    env_file:
      - ./backend/user/.env
    depends_on:
      - redis
      - rabbitmq
    networks:
      - haveit-network

  # Microservice: Mail Notifications
  mail-service:
    build:
      context: ./backend/mail
      dockerfile: Dockerfile
    container_name: haveit-mail-service
    ports:
      - "5001:5001"
    env_file:
      - ./backend/mail/.env
    depends_on:
      - rabbitmq
    networks:
      - haveit-network

  # Microservice: Chat & WebSockets
  chat-service:
    build:
      context: ./backend/chat
      dockerfile: Dockerfile
    container_name: haveit-chat-service
    ports:
      - "5002:5002"
    env_file:
      - ./backend/chat/.env
    networks:
      - haveit-network

  # Microservice: Posts, Stories & Reels
  post-service:
    build:
      context: ./backend/post
      dockerfile: Dockerfile
    container_name: haveit-post-service
    ports:
      - "5003:5003"
    env_file:
      - ./backend/post/.env
    depends_on:
      - redis
    networks:
      - haveit-network

  # Web App: Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: haveit-frontend
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env.example
    depends_on:
      - user-service
      - chat-service
      - post-service
    networks:
      - haveit-network

  # Web App: Admin Command Center
  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    container_name: haveit-admin
    ports:
      - "3001:3001"
    env_file:
      - ./admin/.env.example
    depends_on:
      - user-service
      - chat-service
      - post-service
    networks:
      - haveit-network
```

To start everything together:
```powershell
docker compose up --build -d
```
To view logs of any specific service:
```powershell
docker compose logs -f chat-service
```
To stop everything:
```powershell
docker compose down
```
