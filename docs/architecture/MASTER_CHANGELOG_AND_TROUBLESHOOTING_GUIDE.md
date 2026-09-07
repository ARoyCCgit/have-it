# 📘 Have-it Super-App — Master Changelog & Troubleshooting Directory

> **Centralized Knowledge Base & Error Diagnostic Manual**  
> Primary Account: `arnabroy466@gmail.com`  
> Repository: `ARoyCCgit/have-it`  
> Last Updated: **September 2026**

---

## 📑 Quick Navigation

1. [Architectural Changes & Log of Modifications](#1-architectural-changes--log-of-modifications)
2. [Master File Modification Registry](#2-master-file-modification-registry)
3. [Troubleshooting Guide: Known Errors & Exact Fixes](#3-troubleshooting-guide-known-errors--exact-fixes)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Emergency Quick Recovery Steps](#5-emergency-quick-recovery-steps)

---

## 1. Architectural Changes & Log of Modifications

### 1.1 Cloud Email Dispatch (Render Port Blocking & Brevo Solution)
* **The Problem**: Render's free tier firewall blocks outbound raw TCP connections on SMTP ports 25, 465, and 587 to prevent spam, causing Nodemailer to fail with `ETIMEDOUT: Connection timeout`. Testing with Resend failed with `403 validation_error` because Resend sandbox only sends to the registered account owner unless a custom domain is purchased.
* **The Solution**:
  - Implemented **Brevo HTTPS API (Port 443)** in `backend/mail/src/consumer.ts`.
  - Brevo provides **300 free emails per day** to **ANY recipient email address** without requiring custom domain ownership.
  - Retained Nodemailer SMTP as local development fallback.
  - Completely cleaned out Resend dependencies per user request.

### 1.2 Professional Have-it Branded HTML Email Template
* **The Problem**: OTP emails were sent as plain unformatted text, lacking branding and professionalism.
* **The Solution**:
  - Created `backend/mail/src/emailTemplate.ts` with email-client-safe inline CSS and tables.
  - Includes Have-it electric cyan gradient badge, "Have-it Messenger" title, large monospace OTP digits card (`1 2 3  4 5 6`), 5-minute expiry pill, and security disclaimer.
  - Tested across Gmail, Apple Mail, Outlook, and Yahoo.

### 1.3 Social Single Sign-On (Google & Microsoft OAuth 2.0)
* **User Requirement**: *"continue with google, continue with microsoft and normal login which already have. only on frontend not in admin."*
* **The Solution**:
  - Built `backend/user/src/controller/oauth.ts` supporting standard OAuth 2.0 / OpenID Connect token exchange over Port 443.
  - Registered `/api/v1/auth/google`, `/api/v1/auth/google/callback`, `/api/v1/auth/microsoft`, and `/api/v1/auth/microsoft/callback`.
  - Added `frontend/src/app/oauth-callback/page.tsx` and `OAuthCallbackHandler.tsx` to set auth cookies and load profile.
  - Added branded buttons with official SVG logos on `frontend/src/app/login/page.tsx`.
  - Admin portal is completely untouched and isolated.

### 1.4 Mobile-First Responsive Layout Overhaul
* **The Problem**:
  - Opening on mobile showed an empty chat panel with the sidebar hidden off-screen.
  - No back button existed to return to the chat list.
  - OTP 6-digit input boxes overflowed narrow phone screens.
  - Mobile browser address bars clipped the bottom of the screen.
  - Form inputs triggered iOS Safari auto-zooming.
* **The Solution**:
  - **Native Mobile Chat Flow**: When `!selectedUser`, the **Chat List takes 100% full screen**. When a contact is selected, the **Chat View opens full screen**.
  - **Mobile Back Button**: Header displays a cyan `<ChevronLeft />` button on mobile that resets `selectedUser(null)` to return to the chat list.
  - **Dynamic Viewport Height (`100dvh`)**: Prevents mobile browser address bar clipping.
  - **Mobile-Safe OTP Inputs**: Responsive box dimensions (`w-10 sm:w-12 h-12 sm:h-14`) fit all screen sizes down to 320px.
  - **Auto-Zoom Prevention**: Inputs styled with `text-base sm:text-sm` (16px) to prevent Safari zoom.
  - **Full-Screen Drawers**: `ContactInfoDrawer` and `GroupInfoDrawer` expand full-screen on mobile with a top close button.

### 1.5 Mobile Emoji Picker Fix
* **The Problem**: Emoji picker did not open or was unusable on mobile.
* **Root Causes**:
  1. `<input autoFocus />` inside `EmojiPicker` automatically grabbed focus, forcing the phone's native virtual keyboard to open and cover the emojis.
  2. `mousedown` listener lacked `touchstart` and had no ref to the emoji trigger button, causing premature closing.
  3. `absolute bottom-16 left-2` inside an overflow-hidden container clipped off-screen on phones.
* **The Solution**:
  - Removed `autoFocus`.
  - Added `emojiButtonRef` and supported both `mousedown` and `touchstart`.
  - On mobile (`< sm`), `EmojiPicker` opens as a **docked bottom sheet** with a dim dismiss backdrop and close `X` button.

### 1.6 Progressive Web App (PWA) Implementation
* **The Solution**:
  - Created `frontend/public/sw.js` (Service Worker with navigation fallback and static asset caching).
  - Generated high-resolution PWA icons with `sharp`: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
  - Updated `manifest.ts` and `layout.tsx` with Web App Manifest, Apple Web App settings, and touch icons.
  - Built `frontend/src/components/PWARegister.tsx` providing an automated install prompt banner for Android/Chrome and home screen instructions for iOS Safari.

---

## 2. Master File Modification Registry

| File Path | Component | Purpose of Change |
| :--- | :--- | :--- |
| `backend/mail/src/consumer.ts` | Mail Service | Added Brevo HTTPS API (Port 443), HTML template rendering, removed Resend. |
| `backend/mail/src/emailTemplate.ts` | Mail Service | Professional Have-it branded HTML email template generator. |
| `backend/mail/.env.example` | Mail Service | Documented `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. |
| `backend/user/src/controller/oauth.ts` | User Service | OAuth 2.0 controller for Google & Microsoft login and user provisioning. |
| `backend/user/src/controller/user.ts` | User Service | Added `otp` field explicitly to RabbitMQ message payload. |
| `backend/user/src/model/User.ts` | User Service | Extended schema with `authProvider`, `googleId`, and `microsoftId`. |
| `backend/user/src/routes/user.ts` | User Service | Mounted `/auth/google`, `/auth/microsoft`, and `/auth/providers`. |
| `backend/user/src/index.ts` | User Service | Enabled `app.set("trust proxy", 1)` for cloud reverse proxies. |
| `backend/user/.env.example` | User Service | Documented Google & Microsoft OAuth environment variables. |
| `frontend/src/app/layout.tsx` | Frontend | Added PWA metadata, manifest link, appleWebApp, and `PWARegister`. |
| `frontend/src/app/login/page.tsx` | Frontend | Added "Continue with Google" and "Continue with Microsoft", mobile padding, 100dvh. |
| `frontend/src/app/chat/page.tsx` | Frontend | Implemented conditional mobile full-screen view for sidebar vs chat, 100dvh. |
| `frontend/src/app/oauth-callback/page.tsx` | Frontend | Next.js 15 Suspense wrapper for OAuth callback. |
| `frontend/src/components/OAuthCallbackHandler.tsx` | Frontend | Token extraction, cookie setting, profile loading, and redirect to `/chat`. |
| `frontend/src/components/ChatHeaders.tsx` | Frontend | Added mobile back button (`<ChevronLeft />`) that calls `setSelectedUser(null)`. |
| `frontend/src/components/ChatSidebar.tsx` | Frontend | Clean full-width mobile aside layout, branding visible on all screens. |
| `frontend/src/components/ChatInput.tsx` | Frontend | Mobile bottom sheet for emojis, dismiss backdrop, textarea font size, button ref. |
| `frontend/src/components/EmojiPicker.tsx` | Frontend | Removed `autoFocus`, added `onClose` button, responsive sheet width. |
| `frontend/src/components/verifyOtp.tsx` | Frontend | Mobile-safe digit box sizing (`w-10 sm:w-12`), responsive padding, 100dvh. |
| `frontend/src/components/ContactInfoDrawer.tsx` | Frontend | Full-screen modal overlay on mobile (`fixed inset-0 z-50`). |
| `frontend/src/components/GroupInfoDrawer.tsx` | Frontend | Full-screen modal overlay on mobile (`fixed inset-0 z-50`). |
| `frontend/src/components/PWARegister.tsx` | Frontend | Service worker registration and "Install App" / "Add to Home Screen" banner. |
| `frontend/public/sw.js` | Frontend | Service Worker caching script. |
| `frontend/public/icon-192.png` | Frontend | 192x192 PWA Icon generated from vector source. |
| `frontend/public/icon-512.png` | Frontend | 512x512 PWA Icon generated from vector source. |
| `frontend/public/apple-touch-icon.png` | Frontend | 180x180 Apple iOS Home Screen icon. |

---

## 3. Troubleshooting Guide: Known Errors & Exact Fixes

### Error 1: `ETIMEDOUT: Connection timeout` when sending emails on Render
* **Symptoms**: Mail service logs show:
  ```
  Failed to send otp Error: Connection timeout at SMTPConnection._formatError code: 'ETIMEDOUT', command: 'CONN'
  ```
* **Why it happens**: Render free tier blocks outbound TCP connections on ports 25, 465, and 587.
* **Exact Fix**:
  1. Open [Brevo Console](https://app.brevo.com/settings/keys/api) with `arnabroy466@gmail.com`.
  2. Generate an API Key (starts with `xkeysib-...`).
  3. In Render Dashboard for `mail-service` -> **Environment**:
     - Set `BREVO_API_KEY = xkeysib-...`
     - Set `BREVO_SENDER_EMAIL = arnabroy466@gmail.com`
  4. Save changes. Brevo sends over HTTPS Port 443, which is never blocked.

---

### Error 2: `Resend API error 403: validation_error`
* **Symptoms**:
  ```json
  {"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own email address (arnabroy466@gmail.com)."}
  ```
* **Why it happens**: Resend free sandbox restricts recipients strictly to the account owner email unless you verify your own domain.
* **Exact Fix**: Resend has been completely removed. Use Brevo (`BREVO_API_KEY`) instead, which delivers to all emails without needing a domain.

---

### Error 3: Google / Microsoft OAuth shows "Not configured" toast
* **Symptoms**: User clicks "Continue with Google" or "Continue with Microsoft" and sees:
  ```
  Google Sign-In is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.
  ```
* **Why it happens**: The backend endpoints check if `GOOGLE_CLIENT_ID` / `MICROSOFT_CLIENT_ID` are set. If not, they safely redirect with an informative error rather than crashing.
* **Exact Fix**: Add the client IDs and secrets to `backend/user/.env` and Render `user-service` environment.

---

### Error 4: Mobile screen zooms in when typing in chat
* **Symptoms**: On iPhone (iOS Safari), tapping the input causes the entire web page to zoom in awkwardly.
* **Why it happens**: iOS Safari automatically zooms in on any form input with a `font-size` smaller than `16px`.
* **Exact Fix**: All mobile inputs in `ChatInput.tsx`, `login/page.tsx`, and `verifyOtp.tsx` are styled with `text-base sm:text-sm` (16px on mobile, 14px on desktop).

---

### Error 5: CloudAMQP connection drops after Render cold-start
* **Symptoms**: `mail-service` or `user-service` fails to publish or consume after sleeping.
* **Why it happens**: Render free tier sleeps after 15 minutes of inactivity, terminating open sockets.
* **Exact Fix**:
  - Auto-reconnect listeners in `backend/mail/src/consumer.ts` and `backend/user/src/config/rabbitmq.ts` automatically re-establish the connection.
  - Automated pings via [cron-job.org](https://cron-job.org) every 10 minutes to `GET /api/v1/system/config` prevent sleeping.

---

## 4. Environment Variables Reference

### `backend/mail`
```env
PORT=5001
RABBITMQ_URL=amqps://khjhccgj:F30IcJ8XUaJJUFlv8rs7YzGcrPUrXpi1@puffin.rmq2.cloudamqp.com/khjhccgj
BREVO_API_KEY=xkeysib-your_brevo_api_key_here
BREVO_SENDER_EMAIL=arnabroy466@gmail.com
# Local fallback:
Nodemailer_User=arnabroy466@gmail.com
Nodemailer_Pass=your_gmail_app_password
```

### `backend/user`
```env
PORT=5000
MONGO_URI=mongodb+srv://arnabroy466:<password>@cluster0.aybbqwk.mongodb.net/?retryWrites=true&w=majority
REDIS_URL=rediss://default:<key>@measured-terrapin-164799.upstash.io:6379
RABBITMQ_URL=amqps://khjhccgj:F30IcJ8XUaJJUFlv8rs7YzGcrPUrXpi1@puffin.rmq2.cloudamqp.com/khjhccgj
JWT_TOKEN=your_jwt_secret
FRONTEND_URL=https://have-it-super-app.vercel.app
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret
MICROSOFT_CLIENT_ID=your_id
MICROSOFT_CLIENT_SECRET=your_secret
```

---

## 5. Emergency Quick Recovery Steps

1. **If Mail stops**: Verify `BREVO_API_KEY` on Render `mail-service`.
2. **If DB stops**: Check MongoDB Atlas cluster status (ensure Network Access has `0.0.0.0/0`).
3. **If Queue stops**: Check CloudAMQP Little Lemur instance `khjhccgj` state.
4. **To test everything locally**:
   ```powershell
   npm run build
   ```
   Run in `backend/user`, `backend/mail`, and `frontend`.
