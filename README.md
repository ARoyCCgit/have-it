<div align="center">

# ⚡ Have-it Super-App

**Unified Real-Time Messenger + Instagram-Grade Social Ecosystem**  
*Built for Web, Desktop, Android, and iOS.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)

</div>

---

## 📌 1. About the Project

**Have-it** is an enterprise-grade, event-driven communication and social media super-app inspired by the real-time speed of WhatsApp and Telegram combined with the visual engagement of Instagram.

It provides end-to-end real-time chat, multimedia messaging, voice notes with waveform scrubbing, WebRTC voice and video calls, 24-hour disappearing stories, a social feed with affinity-based ranking, and an enterprise Admin Command Center.

---

## 🏛️ 2. System Architecture

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        Frontend["💻 Web / Mobile Frontend (:3000)<br>Next.js 15 (React 19 + Tailwind v4)"]
        AdminApp["🛡️ Admin Command Center (:3001)<br>Next.js 15 Standalone Portal"]
        MobileApp["📱 Native Mobile App (Capacitor)<br>Android (.aab) & iOS (.ipa)"]
    end

    subgraph Gateway ["Reverse Proxy & Routing"]
        Nginx["🌐 Nginx Reverse Proxy / SSL<br>WebSocket Keep-Alive & Rate Limiting"]
    end

    subgraph Services ["Microservices Backend"]
        UserService["👤 User Service (:5000)<br>OTP Auth, Profile, JWT, Redis"]
        ChatService["💬 Chat Service (:5002)<br>Socket.IO, Rooms, Receipts, WebRTC"]
        PostService["📸 Post Service (:5003)<br>Feed, Reels, Stories, Social Graph"]
        MailService["✉️ Mail Service (:5001)<br>RabbitMQ Consumer, Nodemailer"]
    end

    subgraph Infra ["Cloud Storage & Databases"]
        Mongo[("🍃 MongoDB Atlas")]
        RedisDB[("⚡ Redis (Upstash / Local)")]
        RabbitMQ[("🐇 RabbitMQ Message Broker")]
        Cloudinary[("☁️ Cloudinary CDN (Media)")]
        Coturn["📡 Coturn STUN/TURN (WebRTC)"]
    end

    Frontend --> Nginx
    AdminApp --> Nginx
    MobileApp --> Nginx

    Nginx --> UserService
    Nginx --> ChatService
    Nginx --> PostService

    UserService --> Mongo
    UserService --> RedisDB
    UserService --> RabbitMQ
    RabbitMQ --> MailService

    ChatService --> Mongo
    ChatService --> Cloudinary
    ChatService <--> Coturn

    PostService --> Mongo
    PostService --> RedisDB
    PostService --> Cloudinary
```

---

## ✨ 3. Key Feature Modules

### 💬 Real-Time Messenger (`frontend` & `backend/chat`)
- **Sub-50ms Messaging**: Persistent WebSockets with Socket.IO.
- **Message States**: Clock (sending) &rarr; Single grey tick (sent) &rarr; Double grey tick (delivered) &rarr; Double blue tick (seen).
- **Voice Notes**: In-browser audio recording using MediaRecorder API with interactive waveform scrubbing.
- **Quote Replies & Emoji Reactions**: Swipe/hover to reply, instant reaction badges.
- **Group Conversations**: Group creation, admin promotion/demotion, member management.
- **Message Editing & Deletion**: "Delete for me" and "Delete for everyone", with 15-minute edit windows.

### 📞 WebRTC Audio & Video Calling
- 1-on-1 P2P encrypted voice and video calls directly within the browser/app.
- Socket.IO signaling gateway with STUN/TURN NAT traversal.
- Screen sharing, camera switching, mute/unmute, and picture-in-picture call overlay.

### 📸 Social Hub & Stories (`backend/post`)
- **24-Hour Ephemeral Stories**: Instagram-style circular story tray with auto-expiry.
- **Media Feed**: Image and video posts with carousel layouts, caption formatting, and tags.
- **Engagement**: Double-tap like animations, nested comments, and personal bookmarks.
- **Social Graph**: Follow/Unfollow system with live follower and following counters.

### 🛡️ Enterprise Admin Command Center (`admin`)
- Standalone portal on Port 3001 with physical network isolation.
- Real-time DB analytics and platform health telemetry.
- User management and content moderation queue.
- Cloud API & Webhooks Studio for B2B programmatic messaging.

---

## 📁 4. Repository Structure

```
Chat App/
├── admin/                         # 🛡️ Admin Command Center (Next.js 15, Port 3001)
├── backend/
│   ├── chat/                      # 💬 Chat & WebRTC Signaling Service (Port 5002)
│   ├── mail/                      # ✉️ Mail Dispatch Worker (RabbitMQ Consumer, Port 5001)
│   ├── post/                      # 📸 Posts, Stories & Social Graph Service (Port 5003)
│   └── user/                      # 👤 User & OTP Authentication Service (Port 5000)
├── docs/                          # 📚 Comprehensive Architecture & Deployment Docs
│   ├── README.md                  # Master Documentation Index
│   ├── admin/                     # Admin specs, RBAC & Cloud API documentation
│   ├── architecture/              # System design, feed algorithm & monetization
│   ├── chats/                     # Historical chat phase summaries
│   ├── deployment/                # 🚀 VPS hosting, Docker, Play Store & App Store guide
│   ├── logs/                      # Error tracking & repair logs
│   └── posts/                     # Posts roadmap & feed algorithm math
├── frontend/                      # 💻 User Web Client (Next.js 15, React 19, Port 3000)
├── scripts/                       # 🛠️ Maintenance & Automated Health Check Scripts
├── .gitignore                     # 🛡️ Root Git ignore rules (protects all secrets)
├── CONTRIBUTING.md                # 🤝 Contributing guidelines
└── README.md                      # 📖 Project Master Readme (This file)
```

---

## 🚀 5. Quick Start (Local Development)

### Prerequisites
- **Node.js**: v20.x or higher
- **npm** or **yarn** / **pnpm**
- **MongoDB**: Local MongoDB or free [MongoDB Atlas](https://www.mongodb.com/) cluster
- **Redis**: Local Redis or free [Upstash Redis](https://upstash.com/)
- **RabbitMQ**: Local RabbitMQ or free [CloudAMQP](https://www.cloudamqp.com/)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/<your-username>/have-it.git
cd have-it
```

---

### Step 2: Environment Variables
Copy the `.env.example` template in each service:

```bash
# Backend services
cp backend/user/.env.example backend/user/.env
cp backend/chat/.env.example backend/chat/.env
cp backend/post/.env.example backend/post/.env
cp backend/mail/.env.example backend/mail/.env

# Frontends
cp admin/.env.example admin/.env.local
cp frontend/.env.example frontend/.env.local
```
Fill in your database URIs, JWT secret, Cloudinary keys, and SMTP email credentials.

---

### Step 3: Install Dependencies & Run

Run each service in separate terminals (or configure your preferred process orchestrator):

| Service | Directory | Command | Default URL |
| :--- | :--- | :--- | :--- |
| **User Service** | `backend/user` | `npm install && npm run dev` | `http://localhost:5000` |
| **Mail Service** | `backend/mail` | `npm install && npm run dev` | `http://localhost:5001` |
| **Chat Service** | `backend/chat` | `npm install && npm run dev` | `http://localhost:5002` |
| **Post Service** | `backend/post` | `npm install && npm run dev` | `http://localhost:5003` |
| **Frontend Web** | `frontend` | `npm install && npm run dev` | `http://localhost:3000` |
| **Admin Console** | `admin` | `npm install && npm run dev` | `http://localhost:3001` |

---

## 🛠️ 6. Automated Diagnostics

To verify the health and integrity of all services, configs, and dependencies, run:

```bash
node scripts/system_health_check.js
```
The report will be automatically logged to `docs/logs/ERROR_TRACKING_AND_REPAIR_LOG.md`.

---

## 🌐 7. Production Hosting & Mobile App Stores

Complete step-by-step guides for:
- Deploying to a Linux VPS with Docker Compose & Nginx
- Configuring WebSockets and WebRTC TURN media traversal
- Packaging the Next.js frontend with **Capacitor** for Android & iOS
- Submitting to **Google Play Store** (20-tester rule compliance)
- Submitting to **Apple App Store** (review guidelines compliance)

👉 Read the full manual: **[Production Server Hosting & Mobile App Store Publishing Guide](docs/deployment/PRODUCTION_HOSTING_AND_APP_STORE_GUIDE.md)**

---

## 📄 8. License

This project is licensed under the ISC License.
