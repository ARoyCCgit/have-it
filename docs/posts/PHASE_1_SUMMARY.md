# Have-it "Posts & Social Hub" — Phase 1 Technical Summary

> **Scope**: Backend Post Microservice Initialization, Database Schemas, Middlewares & Service Integration  
> **Service Port**: `5003` (`http://localhost:5003`)  
> **Status**: ✅ **100% Completed & Verified**  
> **Build Verification**: `npx tsc` (Exit Code 0, 0 Errors)  
> **Automated Health Check**: 🟢 10/10 Passed (`node scripts/system_health_check.js`)  

---

## 1. Overview & Architectural Baseline

Phase 1 established the foundation for the **Posts & Social Hub** microservice (`backend/post`) in the Have-it Super-App ecosystem. The microservice is fully decoupled, runs independently on **Port 5003**, and connects to the centralized MongoDB database (`Chatapp`) while maintaining event hooks for cross-service communication with the **User Service (Port 5000)** and **Chat Service (Port 5002)**.

### Active Service Port Allocations

| Service | Port | Directory | Core Functionality |
| :--- | :--- | :--- | :--- |
| **User Service** | `5000` | `backend/user` | Authentication, OTP generation, Profile, Follow-graph |
| **Mail Service** | `5001` | `backend/mail` | RabbitMQ consumer worker & transactional OTP emails |
| **Chat Service** | `5002` | `backend/chat` | 1-on-1 / Group Chat, WebRTC Calling, Socket.IO |
| **Post Service** | `5003` | `backend/post` | Posts, 24h Stories, Reels, Threaded Comments, Likers & Viewers Engine |
| **Frontend App** | `3000` | `frontend` | Next.js 15 Client App |

---

## 2. Directory Layout (`backend/post`)

```
backend/post/
├── dist/                          # Compiled JavaScript & TypeScript declarations (.d.ts)
├── src/
│   ├── config/
│   │   ├── cloudinary.ts          # Cloudinary v2 SDK configuration for media assets
│   │   ├── db.ts                  # MongoDB connection with Mongoose 8
│   │   ├── redis.ts               # Redis client with graceful offline fallback
│   │   └── TryCatch.ts            # High-order error wrapper for Express controllers
│   ├── controller/
│   │   └── post.ts                # Post controllers (getHealth + future CRUD)
│   ├── middlewares/
│   │   ├── isAuth.ts              # JWT Bearer token authentication & user context
│   │   └── multer.ts              # Multer + Cloudinary storage (images & 100MB videos)
│   ├── models/
│   │   ├── Bookmark.ts            # Saved posts collections schema
│   │   ├── Comment.ts             # 1-level threaded discussion schema
│   │   ├── Follow.ts              # Social follow-graph schema with unique constraints
│   │   ├── Notification.ts        # Social inbox activity schema
│   │   ├── Post.ts                # Posts, carousels, reels, likers & viewers schema
│   │   └── Story.ts               # 24h ephemeral stories with MongoDB TTL index
│   ├── router/
│   │   └── post.ts                # REST API route definitions
│   ├── index.ts                   # Express app, CORS, JSON parsers, & HTTP/Socket server
│   └── socket.ts                  # Realtime Socket.IO dispatching & post rooms
├── .env                           # Local environment variables (Port 5003)
├── .env.example                   # Environment configuration template
├── package.json                   # ESM module definition & dependencies
└── tsconfig.json                  # Strict TypeScript compiler options
```

---

## 3. Database Models & Schema Specifications

### 3.1 `Post` Schema (`backend/post/src/models/Post.ts`)
- **Fields**:
  - `author`: `Types.ObjectId` (Ref: `User`, indexed)
  - `type`: `'image' | 'carousel' | 'video' | 'reel'`
  - `media`: Array (1 to 10 items) of `{ url, public_id, type, aspectRatio, thumbnailUrl }`
  - `caption`: String (up to 2,200 characters)
  - `tags`: String array of parsed hashtags (`['haveit', 'tech']`)
  - `location`: Optional string
  - `likes`: Array of user `ObjectId`s
  - `likesCount`: Atomic integer counter
  - `views`: Detailed viewer audit array `{ user: ObjectId, viewedAt: Date }`
  - `viewsCount`: Atomic total view counter
  - `commentsCount`: Total top-level + nested replies
  - `isCommentsDisabled`: Boolean toggle
  - `isArchived`: Boolean toggle
- **Indexes**: `{ author: 1, createdAt: -1 }`, `{ createdAt: -1 }`, `{ tags: 1, createdAt: -1 }`, `{ type: 1, createdAt: -1 }`, `{ "views.user": 1 }`.

### 3.2 `Story` Schema (`backend/post/src/models/Story.ts`)
- **Fields**:
  - `author`: `Types.ObjectId` (Ref: `User`, indexed)
  - `media`: `{ url, public_id, type, thumbnailUrl, duration }`
  - `caption`: Optional string (up to 500 characters)
  - `viewers`: Array of `{ user: ObjectId, viewedAt: Date, reactionEmoji?: string }`
  - `viewsCount`: Total views counter
  - `expiresAt`: Date with **MongoDB TTL Index** (`expireAfterSeconds: 0`) for automatic 24-hour expiration
- **Indexes**: `{ author: 1, createdAt: -1 }`, `{ expiresAt: 1 }` (TTL).

### 3.3 `Comment` Schema (`backend/post/src/models/Comment.ts`)
- **Fields**:
  - `post`: `Types.ObjectId` (Ref: `Post`, indexed)
  - `author`: `Types.ObjectId` (Ref: `User`, indexed)
  - `text`: String (up to 1,000 characters)
  - `parentComment`: Optional `Types.ObjectId` (Ref: `Comment`) enabling nested reply threads
  - `likes`: Array of user `ObjectId`s
  - `likesCount`: Atomic integer counter
  - `repliesCount`: Integer counter for nested replies
  - `isEdited`: Boolean toggle
- **Indexes**: `{ post: 1, parentComment: 1, createdAt: 1 }`, `{ author: 1, createdAt: -1 }`.

### 3.4 `Follow` Schema (`backend/post/src/models/Follow.ts` & `backend/user/src/model/Follow.ts`)
- **Fields**:
  - `follower`: `Types.ObjectId` (Ref: `User`)
  - `following`: `Types.ObjectId` (Ref: `User`)
  - `status`: `'accepted' | 'pending'` (default: `'accepted'`)
- **Compound Unique Constraints**: `{ follower: 1, following: 1 }` to guarantee idempotent follow relationships.

### 3.5 `Bookmark` Schema (`backend/post/src/models/Bookmark.ts`)
- **Fields**:
  - `user`: `Types.ObjectId` (Ref: `User`)
  - `post`: `Types.ObjectId` (Ref: `Post`)
  - `collectionName`: String (default: `'All Posts'`)
- **Compound Unique Constraints**: `{ user: 1, post: 1 }`.

### 3.6 `Notification` Schema (`backend/post/src/models/Notification.ts`)
- **Fields**:
  - `recipient`: `Types.ObjectId` (Ref: `User`, indexed)
  - `sender`: `Types.ObjectId` (Ref: `User`)
  - `type`: `'like_post' | 'like_comment' | 'comment' | 'reply' | 'follow' | 'mention' | 'story_reaction'`
  - `post`: Optional `Types.ObjectId` (Ref: `Post`)
  - `comment`: Optional `Types.ObjectId` (Ref: `Comment`)
  - `story`: Optional `Types.ObjectId` (Ref: `Story`)
  - `text`: Optional preview text
  - `isRead`: Boolean flag
- **Indexes**: `{ recipient: 1, createdAt: -1 }`, `{ recipient: 1, isRead: 1 }`.

---

## 4. Middleware & Core Services

1. **`isAuth.ts`**: Decodes JWT Bearer tokens from incoming HTTP headers, validates against secret `JWT_TOKEN`, and injects authenticated user payload into `req.user`.
2. **`multer.ts`**: Configured with `multer-storage-cloudinary` for automated upload to folder `haveit-posts`, supporting multi-media carousels (up to 10 files) and high-bitrate video clips up to 100MB.
3. **`redis.ts`**: Provides Redis client with non-blocking error interception, allowing smooth degraded memory operation if Redis is offline locally.
4. **`socket.ts`**: Sets up Socket.IO with CORS authentication, real-time user-socket maps, and dynamic room management (`post:<postId>`) for live comments, likes, and story interactions.
5. **Frontend Client Integration**: Added `export const post_service = "http://localhost:5003";` in `frontend/src/context/Appcontext.tsx`.

---

## 5. Verification & Diagnostic Health Scan

- **TypeScript Compilation**:
  ```bash
  cd backend/post && npm run build
  # Result: 0 Errors (Exit code 0)
  ```
- **Automated Health Check Scan**:
  ```bash
  node scripts/system_health_check.js
  # Result: 10 Passed, 0 Warnings, 0 Failed
  # Log written to: docs/logs/ERROR_TRACKING_AND_REPAIR_LOG.md
  ```

---

## 6. Next Steps (Phase 2: Post CRUD & Feed Engine)

- Implement `createPost` controller with multi-media carousel upload to Cloudinary.
- Implement `getFeedPosts` aggregation pipeline (followed accounts + ML ranking).
- Implement `getExplorePosts` with trending algorithm.
- Implement `toggleLikePost` with atomic counter + `getPostLikers` inspector.
- Implement `recordPostView` with deduplication + `getPostViewers` inspector.
- Implement `toggleBookmarkPost` and `getUserSavedPosts`.
