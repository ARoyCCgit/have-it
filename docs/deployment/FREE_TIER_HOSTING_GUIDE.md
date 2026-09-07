# 🌐 Have-it — 100% Free Production Hosting Guide

> **A Complete Blueprint for Deploying the Have-it Microservices & Web Apps at Zero Cost**  
> Covers cloud databases, PaaS deployment (Render + Vercel), VPS Docker Compose (Oracle Always Free), WebSockets configuration, and keep-alive setups.

---

## 📑 Table of Contents

1. [Architectural Overview & The Free Stack](#1-architectural-overview--the-free-stack)
2. [Step 1: Free Cloud Databases & Brokers (Prerequisites)](#step-1-free-cloud-databases--brokers-prerequisites)
   - [1.1 MongoDB Atlas (Database)](#11-mongodb-atlas-database)
   - [1.2 Upstash Redis (Cache & Session)](#12-upstash-redis-cache--session)
   - [1.3 CloudAMQP (RabbitMQ Message Broker)](#13-cloudamqp-rabbitmq-message-broker)
   - [1.4 Cloudinary (Media CDN)](#14-cloudinary-media-cdn)
3. [Step 2: Recommended Free Hosting Paths](#step-2-recommended-free-hosting-paths)
   - [Path A: Vercel + Render (Easiest, Managed, No Server Maintenance)](#path-a-vercel--render-managed-paas-recommended)
   - [Path B: Oracle Cloud Always Free VPS (Single Docker Compose Host)](#path-b-oracle-cloud-always-free-vps-pure-docker)
4. [Step 3: Deploying with Path A (Vercel + Render)](#step-3-deploying-with-path-a-vercel--render)
   - [3.1 Deploying the Next.js Frontend on Vercel](#31-deploying-the-nextjs-frontend-on-vercel)
   - [3.2 Deploying the Next.js Admin Panel on Vercel](#32-deploying-the-nextjs-admin-panel-on-vercel)
   - [3.3 Deploying Backend Microservices to Render](#33-deploying-backend-microservices-to-render)
   - [3.4 Eliminating Free Tier Spin-Down (Keep-Alive Cron)](#34-eliminating-free-tier-spin-down-keep-alive-cron)
5. [Step 4: Deploying with Path B (Oracle Cloud Always Free VM)](#step-4-deploying-with-path-b-oracle-cloud-always-free-vm)
   - [4.1 VM Provisioning](#41-vm-provisioning)
   - [4.2 Running Docker Compose on the Server](#42-running-docker-compose-on-the-server)
   - [4.3 Nginx Reverse Proxy with SSL (Certbot)](#43-nginx-reverse-proxy-with-ssl-certbot)
6. [Step 5: Complete Environment Variables Matrix](#step-5-complete-environment-variables-matrix)
7. [Step 6: Verification & Pre-Flight Testing](#step-6-verification--pre-flight-testing)

---

## 1. Architectural Overview & The Free Stack

Have-it consists of multiple moving parts:
* **Frontend Web Clients**: `frontend` (Port 3000) & `admin` (Port 3001) built with Next.js 15.
* **Backend Microservices**:
  - `user-service` (Port 5000) — Auth, Profiles, Sessions
  - `mail-service` (Port 5001) — RabbitMQ Email Consumer
  - `chat-service` (Port 5002) — REST API + Socket.IO WebSockets
  - `post-service` (Port 5003) — Posts, Stories, Likes, Comments
* **Data Layer**: MongoDB, Redis, RabbitMQ, and Cloudinary.

```mermaid
flowchart TD
    subgraph Clients ["Web Clients (Vercel — 100% Free)"]
        FE["User Frontend<br>https://haveit.vercel.app"]
        Admin["Admin Console<br>https://admin-haveit.vercel.app"]
    end

    subgraph Backend ["Backend Microservices (Render.com / Koyeb)"]
        User["👤 user-service<br>(REST API)"]
        Chat["💬 chat-service<br>(WebSockets + REST)"]
        Post["📸 post-service<br>(REST API)"]
        Mail["✉️ mail-service<br>(RabbitMQ Consumer)"]
    end

    subgraph Data ["Managed Cloud DBs (100% Free Tiers)"]
        Mongo[("🍃 MongoDB Atlas<br>M0 Free 512MB")]
        Redis[("⚡ Upstash Redis<br>10k req/day free")]
        Rabbit[("🐇 CloudAMQP<br>1M msgs/mo free")]
        Cloud[("☁️ Cloudinary<br>25 credits/mo free")]
    end

    FE -->|HTTP Auth| User
    FE -->|WSS & HTTP| Chat
    FE -->|HTTP Feeds| Post
    Admin -->|HTTP API| User

    Chat -->|Internal HTTP| User
    Post -->|Internal HTTP| User
    User --> Mongo & Redis & Rabbit
    Chat --> Mongo & Cloud
    Post --> Mongo & Redis & Cloud
    Rabbit --> Mail
```

---

## Step 1: Free Cloud Databases & Brokers (Prerequisites)

Because running stateful databases (MongoDB, RabbitMQ, Redis) on free ephemeral container hosts can cause data loss, use dedicated, free managed cloud providers.

### 1.1 MongoDB Atlas (Database)
* **Status**: You already have a free MongoDB cluster configured in your `.env`.
* **Action Needed**: Ensure your Atlas **Network Access** allows connections from anywhere (`0.0.0.0/0`) so cloud servers (Render / Vercel) can reach it:
  1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com).
  2. Navigate to **Security** -> **Network Access**.
  3. Click **Add IP Address** -> Select **Allow Access From Anywhere (`0.0.0.0/0`)** -> Confirm.

### 1.2 Upstash Redis (Cache & Session)
* **Status**: You already have an Upstash Redis URL in `backend/user/.env` (`rediss://...measured-terrapin...upstash.io:6379`).
* **Free Quota**: 10,000 commands/day, persistent, zero cost forever.
* **Reuse**: Use this exact same `REDIS_URL` for `backend/post` as well.

### 1.3 CloudAMQP (RabbitMQ Message Broker)
Instead of hosting RabbitMQ on Docker in production, use CloudAMQP's free "Little Lemur" instance:
1. Sign up at [cloudamqp.com](https://www.cloudamqp.com/).
2. Click **Create New Instance**.
3. Choose the **Little Lemur** plan (Free / $0/month).
4. Select a region close to your backend servers.
5. Click **Create Instance**, then open the instance details.
6. Copy the **AMQP URL** (format: `amqps://user:password@host/vhost`).
7. Update `backend/user/.env` and `backend/mail/.env` to connect via this cloud URL.

### 1.4 Cloudinary (Media CDN)
* **Status**: Already configured in your `.env` files (`CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`).
* **Free Quota**: 25 credits/month (approx. 25,000 transformations or 25GB storage/bandwidth).

---

## Step 2: Recommended Free Hosting Paths

| Feature | Path A: Vercel + Render (Recommended) | Path B: Oracle Cloud Always Free VM |
| :--- | :--- | :--- |
| **Setup Difficulty** | 🟢 Very Easy (GUI, Git push auto-deploy) | 🟡 Moderate (SSH, Linux CLI, Nginx setup) |
| **Docker Compose** | Built per service automatically | Uses your exact `docker-compose.yml` |
| **Server Cost** | $0 / month | $0 / month |
| **Credit Card Required?** | ❌ No | ⚠️ Yes (For identity verification only, not charged) |
| **WebSockets Support** | ✅ Yes (Render supports Socket.IO) | ✅ Yes |
| **Cold Starts / Sleep** | 15-min idle sleep (solved with free ping cron) | ❌ None (Runs 24/7 continuously) |
| **Hardware Resources** | 512MB RAM per service | Up to 4 vCPUs, 24GB RAM, 200GB SSD |

---

## Step 3: Deploying with Path A (Vercel + Render)

### 3.1 Deploying the Next.js Frontend on Vercel
Vercel is built by the creators of Next.js and provides zero-configuration hosting with automatic global CDN.

1. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New Project** and select your repository (`Chat App` / `have-it`).
3. Configure the project settings:
   - **Project Name**: `haveit-web`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and choose `frontend`.
4. In **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_USER_SERVICE=https://haveit-user-service.onrender.com
   NEXT_PUBLIC_CHAT_SERVICE=https://haveit-chat-service.onrender.com
   NEXT_PUBLIC_POST_SERVICE=https://haveit-post-service.onrender.com
   NEXT_PUBLIC_SOCKET_URL=https://haveit-chat-service.onrender.com
   PORT=3000
   ```
   *(Replace with your actual Render URLs once deployed in Step 3.3)*
5. Click **Deploy**. Vercel will build and assign you a free `https://<your-app>.vercel.app` URL with automatic SSL.

---

### 3.2 Deploying the Next.js Admin Panel on Vercel
Repeat the same steps for the admin panel:
1. In Vercel, click **Add New Project** -> Select the same GitHub repository.
2. **Root Directory**: Select `admin`.
3. In **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_USER_SERVICE=https://haveit-user-service.onrender.com
   NEXT_PUBLIC_CHAT_SERVICE=https://haveit-chat-service.onrender.com
   NEXT_PUBLIC_POST_SERVICE=https://haveit-post-service.onrender.com
   NEXT_PUBLIC_FRONTEND_URL=https://<your-frontend-app>.vercel.app
   PORT=3001
   ```
4. Click **Deploy**.

---

### 3.3 Deploying Backend Microservices to Render
[Render.com](https://render.com/) offers free web services that run directly from your GitHub repository or Dockerfiles.

For each backend service, follow these steps:

#### Service 1: `user-service`
1. Go to [dashboard.render.com](https://dashboard.render.com/) -> **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `haveit-user-service`
   - **Root Directory**: `backend/user`
   - **Runtime**: `Node` (or `Docker`)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Add **Environment Variables**:
   ```env
   PORT=5000
   MONGO_URI=<your-mongodb-atlas-uri>
   REDIS_URL=<your-upstash-redis-url>
   Rabbit_Host=<cloudamqp-host>
   Rabbit_User=<cloudamqp-username>
   Rabbit_Pass=<cloudamqp-password>
   JWT_TOKEN=<your-jwt-secret>
   CLOUD_NAME=<cloudinary-name>
   CLOUD_API_KEY=<cloudinary-key>
   CLOUD_API_SECRET=<cloudinary-secret>
   ```
5. Click **Create Web Service**.

#### Service 2: `chat-service` (WebSockets Enabled)
1. In Render, create **New** -> **Web Service**.
2. **Name**: `haveit-chat-service`
3. **Root Directory**: `backend/chat`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. Add **Environment Variables**:
   ```env
   PORT=5002
   MONGO_URI=<your-mongodb-atlas-uri>
   JWT_TOKEN=<your-jwt-secret>
   USER_SERVICE=https://haveit-user-service.onrender.com
   CLOUD_NAME=<cloudinary-name>
   CLOUD_API_KEY=<cloudinary-key>
   CLOUD_API_SECRET=<cloudinary-secret>
   ```
   > [!IMPORTANT]
   > Notice `USER_SERVICE` is set to the production URL of your `haveit-user-service.onrender.com`! This ensures that contact names resolve properly instead of falling back to "Contact".

#### Service 3: `post-service`
1. Create **New** -> **Web Service**.
2. **Name**: `haveit-post-service`
3. **Root Directory**: `backend/post`
4. Add **Environment Variables**:
   ```env
   PORT=5003
   MONGO_URI=<your-mongodb-atlas-uri>
   JWT_TOKEN=<your-jwt-secret>
   USER_SERVICE=https://haveit-user-service.onrender.com
   CHAT_SERVICE=https://haveit-chat-service.onrender.com
   REDIS_URL=<your-upstash-redis-url>
   CLOUD_NAME=<cloudinary-name>
   CLOUD_API_KEY=<cloudinary-key>
   CLOUD_API_SECRET=<cloudinary-secret>
   ```

#### Service 4: `mail-service` (Background Worker)
1. In Render, create **New** -> **Background Worker** (or Web Service).
2. **Name**: `haveit-mail-service`
3. **Root Directory**: `backend/mail`
4. **Start Command**: `npm start`
5. Add **Environment Variables**:
   ```env
   Rabbit_Host=<cloudamqp-host>
   Rabbit_User=<cloudamqp-username>
   Rabbit_Pass=<cloudamqp-password>
   Nodemailer_User=<your-email>
   Nodemailer_Pass=<your-app-password>
   ```

---

### 3.4 Eliminating Free Tier Spin-Down (Keep-Alive Cron)
Render free services spin down after 15 minutes of inactivity, causing a 30-50 second delay on the first user request. 

To keep them warm 24/7 for free:
1. Go to [cron-job.org](https://cron-job.org/) or [uptimerobot.com](https://uptimerobot.com/) (both are 100% free).
2. Create HTTP ping monitors running every **10 minutes** for:
   - `https://haveit-user-service.onrender.com/api/v1/system/config`
   - `https://haveit-chat-service.onrender.com/`
   - `https://haveit-post-service.onrender.com/`
3. This keeps the containers continuously active without going to sleep.

---

## Step 4: Deploying with Path B (Oracle Cloud Always Free VM)

If you prefer running your **existing `docker-compose.yml`** on a real Linux server without dealing with multiple dashboard UIs:

### 4.1 VM Provisioning
1. Sign up for [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. Create an **Ampere A1 Compute Instance** (Ubuntu 22.04 LTS or 24.04).
3. Choose:
   - **Shape**: `VM.Standard.A1.Flex`
   - **OCPUs**: 2 to 4 (Always Free allows up to 4 OCPUs)
   - **Memory**: 12 to 24 GB RAM (Always Free allows up to 24 GB RAM)
   - **Boot Volume**: 50 GB to 100 GB SSD
4. Save your SSH private key (`ssh-key.key`).

### 4.2 Running Docker Compose on the Server
Connect to your VM via SSH and run:

```bash
# 1. Update packages & install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Clone your Git repository
git clone <YOUR_GITHUB_REPO_URL>
cd "Chat App"

# 3. Create production .env files with your cloud secrets
# (Set USER_SERVICE=http://user-service:5000 in docker-compose.yml)

# 4. Launch entire stack
docker compose up -d --build
```

### 4.3 Nginx Reverse Proxy with SSL (Certbot)
Install Nginx and Let's Encrypt Certbot to handle incoming traffic and terminate SSL:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Configure `/etc/nginx/sites-available/haveit`:
```nginx
server {
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # User Service
    location /api/v1/user {
        proxy_pass http://localhost:5000;
    }

    # Chat Service & WebSockets
    location /socket.io/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Generate free SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## Step 5: Complete Environment Variables Matrix

| Variable | Local (`npm run dev`) | Local (`Docker`) | Production (Render/Vercel) |
| :--- | :--- | :--- | :--- |
| `USER_SERVICE` (Chat) | `http://localhost:5000` | `http://user-service:5000` | `https://haveit-user-service.onrender.com` |
| `CHAT_SERVICE` (Post) | `http://localhost:5002` | `http://chat-service:5002` | `https://haveit-chat-service.onrender.com` |
| `NEXT_PUBLIC_USER_SERVICE` | `http://localhost:5000` | `http://localhost:5000` | `https://haveit-user-service.onrender.com` |
| `NEXT_PUBLIC_CHAT_SERVICE` | `http://localhost:5002` | `http://localhost:5002` | `https://haveit-chat-service.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5002` | `http://localhost:5002` | `https://haveit-chat-service.onrender.com` |
| `Rabbit_Host` | `localhost` | `rabbitmq` or `host.docker.internal` | `your-subdomain.rmq.cloudamqp.com` |

---

## Step 6: Verification & Pre-Flight Testing

Before opening to real users:
1. **User Sign Up & Login**: Verify OTP emails are dispatched through `mail-service` and received in inbox.
2. **Contact Display**: Check that contact cards render actual user names and avatars instead of `"Contact"`.
3. **Real-time Messages**: Open two separate browser tabs (or mobile + desktop). Send a chat message and confirm instantaneous arrival without page reload.
4. **WebSocket Connection**: Open DevTools -> Network -> **WS** tab. Verify the Socket.IO connection status is `101 Switching Protocols` (Green).
5. **Media Uploads**: Send an image in chat or post a story to verify Cloudinary upload and CDN delivery.
