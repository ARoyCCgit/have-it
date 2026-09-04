# 🛡️ Have-it "Enterprise Admin Command Center" — Architecture & System Specification

> **Product**: Have-it Enterprise Admin Portal & Developer API Platform  
> **Brand & UI**: Dark-mode glassmorphic control console (`#080e12`, `#111b21`, `#03cafc` Cyan accents)  
> **Target Port**: `http://localhost:3001` (Self-contained Full-Stack Application at root `admin/`)  
> **Backend Architecture**: Self-contained Next.js 15 API routes inside `admin/src/app/api/` (Zero clutter in `backend/`)  
> **Target Parity**: Meta Business Suite + WhatsApp Cloud API Management Console + Telegram Admin  

---

## 1. Architectural Philosophy & Physical Isolation

### 1.1 Why Standalone Root Directory (`admin/`)?
1. **Zero Attack Surface in Consumer Bundle**:
   - The public consumer app (`frontend/`) contains **zero** administrative routes, metrics calculations, or elevated API keys.
   - Prevents reverse-engineering of administrative endpoints from public JavaScript bundles.
2. **Pristine Consumer Backend**:
   - The consumer `backend/` directory remains strictly dedicated to consumer microservices (`user`, `chat`, `post`, `mail`).
   - Admin operations and heavy database aggregation pipelines live exclusively inside `admin/src/app/api/` without putting any load on consumer chat or post services.
3. **Independent Deployability & Portability**:
   - The Admin Portal runs on its own port (`3001`) and can be hosted on a dedicated subdomain (e.g. `admin.haveit.com`), protected by IP whitelisting or corporate VPNs.
   - The entire `admin/` directory is self-contained with its own `package.json`, environment configurations, database connectors, and UI components.

---

## 2. System Topology & Access Gateways

```
┌──────────────────────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
│      Have-it Consumer App (:3000)                │       │     👑 Have-it Admin Control Center (:3001)      │
│  - Chats, Feed, Stories, Reels, Explore          │       │   - Standalone Root Full-Stack Application       │
│  - Regular Users Only (JWT: role="user")         │       │   - Admin UI + Built-in API Routes (/api/*)      │
└────────────────────────┬─────────────────────────┘       │   - Admin-Only RBAC (role: "admin")              │
                         │                                 └────────────────────────┬─────────────────────────┘
                         │ REST / WebSockets                                        │ Direct Elevated DB Access
                         ▼                                                          ▼
┌──────────────────────────────────────────────────┐       ┌──────────────────────────────────────────────────┐
│      Consumer Microservices (backend/)           │       │             Infrastructure & Storage             │
│  - User Service (:5000)                          │       │  - MongoDB Atlas (All Shared Collections)        │
│  - Chat & Calls Service (:5002)                  │       │  - Redis In-Memory Cache                         │
│  - Post, Reels & Stories Service (:5003)         │       │  - Cloudinary Storage CDN                        │
│  - Mail Service (RabbitMQ Worker)                │       │  - Webhook Delivery Dispatcher                   │
└────────────────────────┬─────────────────────────┘       └────────────────────────┬─────────────────────────┘
                         │                                                          │
                         └──────────────────────────┬───────────────────────────────┘
                                                    │
                                           🍃 MongoDB Cluster
```

---

## 3. WhatsApp Business & Enterprise Console Capabilities

The Have-it Admin Center brings full parity to the **WhatsApp Cloud API Platform** and **Meta Business Suite**:

### 3.1 WhatsApp Cloud API Parity (Developer & Integration Hub)
* **API Key Management**: Platform admins can generate secure Bearer API Keys with custom permission scopes (`messages:send`, `users:read`, `analytics:read`, `webhooks:manage`) for external software, CRM platforms, and automated bots.
* **Webhooks Engine**:
  * External developers can register a Webhook Callback URL and a Secret Verification Token.
  * Real-time event subscription toggles:
    * `message.received` — User sends a message
    * `message.delivered` — Message delivered (double grey tick)
    * `message.read` — Message read (blue tick)
    * `call.completed` — Audio/video call summary
    * `user.registered` — New user sign up
  * Automated retry queue with exponential backoff on HTTP 5xx failures.
* **Message Templates Engine**:
  * Pre-configured, reusable message formats with dynamic variables (e.g. `Hello {{1}}, your verification code is {{2}}`).
  * Approval workflow: `PENDING` ➔ `APPROVED` ➔ `REJECTED`.

### 3.2 Live Telemetry & Analytics Dashboard
* **User Engagement**: Daily Active Users (DAU), Monthly Active Users (MAU), DAU/MAU stickiness ratio.
* **Real-time Live Presence**: Exact count of active WebSocket sessions currently connected to Have-it.
* **Messaging & VoIP Throughput**:
  * Total messages sent today, delivery success rate, average latency (ms).
  * WebRTC voice & video calls initiated, call duration averages, call failure rates.
* **Social Hub Activity**: Posts published, reels uploaded, 24h stories active, like/comment velocity.
* **Cloudinary & Storage Quotas**: Number of images/videos stored, total megabytes consumed, bandwidth utilization.

### 3.3 User & Identity Management
* Searchable and filterable table of all registered accounts.
* **Cyan Checkmark Verification**: 1-click toggle to grant or revoke official verification checkmarks (`isVerified: true`).
* **Ban / Suspension System**:
  * Freeze account access (`isBanned: true`).
  * Real-time socket kick: Immediately terminates all active WebSocket sessions for banned users.
* **Role-Based Access Control (RBAC)**:
  * `super_admin`: Full destructive access, API keys, system controls.
  * `admin`: Manage users, view analytics, broadcast messages.
  * `moderator`: Content moderation (delete posts/reels/comments).
  * `user`: Standard consumer access.

### 3.4 Content Moderation & Purge Engine
* Grid inspector of all recently published posts, stories, and reels.
* Instant **Takedown & Purge**: Atomic deletion from MongoDB + automated background cleanup of the media file from Cloudinary CDN.
* Comment review and keyword-triggered moderation flags.

### 3.5 Mass Broadcast & Announcement Engine
* Ability to craft a platform announcement message from the official "Have-it Team" system account.
* Supports rich cards, external links, and announcement banners.
* Delivers into every user's chat list as a high-priority system thread.

### 3.6 System Controls & Feature Flags
* **Maintenance Mode**: One-switch platform lockout with customizable user message.
* **Feature Switches**:
  * Enable / Disable WebRTC Voice & Video Calling.
  * Enable / Disable Video Reels Upload.
  * Enable / Disable Ephemeral Stories.
* **Rate-Limiting Overrides**: Dynamically adjust OTP email limits and message rates.

---

## 4. Database Models (`backend/admin/src/models/`)

### 4.1 Enhanced User Schema (`role`, `isBanned`, `isVerified`, `theme`)
```typescript
interface IUser {
  name: string;
  email: string;
  avatar?: { url: string; publicId?: string };
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  isBanned: boolean;
  bannedReason?: string;
  isVerified: boolean;
  theme: 'system' | 'dark' | 'light';   // Persistent 3-mode theme preference
  lastActive?: Date;
}
```

### 4.2 `ApiKey` Schema (`admin/src/lib/models/ApiKey.ts`)
```typescript
interface IApiKey {
  name: string;                          // e.g. "Shopify CRM Integration"
  key: string;                           // Hashed token: haveit_live_xxxxxxxx
  prefix: string;                        // Masked display: haveit_live_...4f8a
  createdBy: mongoose.Types.ObjectId;    // Ref: User (Admin)
  permissions: string[];                 // ['messages:send', 'users:read', 'webhooks']
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}
```

### 4.3 `Webhook` Schema (`admin/src/lib/models/Webhook.ts`)
```typescript
interface IWebhook {
  targetUrl: string;                     // External HTTPS URL
  secret: string;                        // HMAC SHA256 signing secret
  events: Array<'message.sent' | 'message.read' | 'user.created' | 'call.ended' | 'post.created'>;
  isActive: boolean;
  failureCount: number;
  lastDeliveryStatus?: number;           // 200, 500, etc.
  createdAt: Date;
}
```

### 4.4 `SystemConfig` Schema (`admin/src/lib/models/SystemConfig.ts`)
```typescript
interface ISystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  features: {
    callingEnabled: boolean;
    reelsEnabled: boolean;
    storiesEnabled: boolean;
  };
  limits: {
    maxGroupMembers: number;
    maxMediaUploadSizeMb: number;
    otpExpiryMinutes: number;
  };
  updatedBy: mongoose.Types.ObjectId;
}
```

---

## 5. Universal 3-Mode Theme Architecture (System, Dark, Light)

Have-it implements an enterprise-grade 3-mode adaptive theme system across all tiers: **Backend Persistence**, **Consumer Frontend (`frontend/`)**, and **Admin Console (`admin/`)**.

### 5.1 Three Available Modes
1. **☀️ Light Mode**: High-contrast, clean day palette (`#f0f2f5` background, `#ffffff` panels, dark slate typography) maintaining the `#03cafc` electric cyan brand identity.
2. **🌙 Dark Mode**: Deep immersive dark theme (`#0b141a` background, `#111b21` panel, `#202c33` card surface) optimized for OLED displays and battery savings.
3. **💻 System Default**: Dynamic detection using the CSS `prefers-color-scheme` media query. Automatically flips between light and dark when the user's operating system (Windows, macOS, iOS, Android) switches modes.

### 5.2 Backend Schema & API Persistence (`backend/user`)
* **Field**: `theme: { type: String, enum: ["system", "dark", "light"], default: "system" }` added to MongoDB `User` document.
* **Endpoints**:
  * `PUT /api/v1/user/theme` — Updates authenticated user's persistent theme preference.
  * `GET /api/v1/user/me` — Returns the user's active theme setting so any login immediately synchronizes.

### 5.3 Semantic CSS Token Tokens (`globals.css`)
```css
:root {
  /* Light Palette Defaults */
  --bg-main: #f0f2f5;
  --bg-panel: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: #e9edef;
  --border-subtle: #e2e8f0;
  --text-primary: #111b21;
  --text-secondary: #54656f;
  --brand-primary: #03cafc;
}

.dark, [data-theme="dark"] {
  /* Dark Palette Overrides */
  --bg-main: #0b141a;
  --bg-panel: #111b21;
  --bg-card: #202c33;
  --bg-hover: #222e35;
  --border-subtle: #222d34;
  --text-primary: #ffffff;
  --text-secondary: #8696a0;
  --brand-primary: #03cafc;
}
```

### 5.4 Unified 3-Way Theme Switcher Component
* Rendered in:
  * **Admin Console (`admin/`)**: Header bar quick-toggle & Settings dashboard.
  * **Consumer Web (`frontend/`)**: User profile page (`/profile`) and chat settings drawer.
* Features instant zero-flash hydration (`theme-script` inline in `<head>`).

---

## 6. Implementation Roadmap (Phased Execution)

| Phase | Milestone | Focus Areas | Target Artifact |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Backend Theme Engine & User Schema** | Add `theme: 'system' \| 'dark' \| 'light'`, `role`, and `isBanned` to User model; add `PUT /api/v1/user/theme` endpoint in `backend/user` | `backend/user/` |
| **Phase 2** | **Standalone Admin App Scaffolding** | Initialize standalone full-stack Next.js app at `admin/` (:3001), 3-mode theme provider, dark/light/system tokens, Admin Auth guard | `admin/` |
| **Phase 3** | **Analytics & Telemetry APIs** | MongoDB aggregation pipelines for DAU, active WebSocket sessions, total messages, calls, Cloudinary media storage | `admin/src/app/api/analytics` |
| **Phase 4** | **User Management & Moderation Studio** | Searchable user listing, Ban/Unban with real-time session kick, verified checkmark toggle, content moderation queue | `admin/src/app/users` |
| **Phase 5** | **WhatsApp Cloud API & Webhooks Engine** | API key generation & verification, Webhook URL registrations, HMAC SHA256 signing, event dispatch worker | `admin/src/app/api/webhooks` |
| **Phase 6** | **Broadcast Studio & System Controls** | Build mass-announcement composer, maintenance mode toggle, platform feature flags | `admin/src/app/broadcast` |
| **Phase 7** | **End-to-End Verification & Health Scan** | Build verification (`npm run build` on `admin/` & `frontend`), security audit, diagnostic health scan | Verification suite |

---

*Specification authored for Have-it Enterprise Infrastructure.*
