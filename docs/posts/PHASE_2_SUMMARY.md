# Have-it "Posts & Social Hub" — Phase 2 Technical Summary

> **Scope**: Media Upload Pipeline, Post CRUD, Social Feed Aggregation, Explore Grid, Likers & Viewers Transparency APIs, Bookmarking  
> **Service Port**: `5003` (`http://localhost:5003/api/v1/posts`)  
> **Status**: ✅ **100% Completed & Verified**  
> **Build Verification**: `npx tsc` (Exit Code 0, 0 Errors)  
> **Diagnostic Health Scan**: 🟢 10/10 Passed (`node scripts/system_health_check.js`)  

---

## 1. Overview

In Phase 2, we engineered the complete **Post Creation, Media Upload, Feed Aggregation Engine, and Likers & Viewers Inspection APIs** on the dedicated Post Service (`backend/post` on Port 5003).

All endpoints enforce JWT authentication (`isAuth`), utilize Cloudinary storage with automated video thumbnail extraction, support multi-image carousels (up to 10 files), parse hashtags dynamically, and provide realtime Socket.IO broadcasts for live like updates.

---

## 2. API Endpoints Reference (`http://localhost:5003/api/v1/posts`)

| Method | Endpoint | Description | Auth Required | Multer / Payload |
|---|---|---|---|---|
| `GET` | `/health` | Service health status & Redis state | ❌ Public | None |
| `POST` | `/` | Create post (single image, carousel, video, reel) | ✅ Yes | `multipart/form-data` (`media` max 10 files) |
| `GET` | `/feed` | Paginated social feed (followed users + recommendations) | ✅ Yes | Query: `page`, `limit` |
| `GET` | `/explore` | Explore discovery grid (trending, tags, search) | ✅ Optional | Query: `page`, `limit`, `tag`, `search` |
| `GET` | `/saved` | Get user's saved/bookmarked posts | ✅ Yes | None |
| `GET` | `/user/:userId` | Get posts/reels for a user's profile grid | ✅ Yes | Query: `type` (`reel` or all) |
| `GET` | `/:postId` | Get single post details with interaction flags | ✅ Yes | Path: `postId` |
| `DELETE` | `/:postId` | Delete own post & cleanup Cloudinary assets | ✅ Yes | Path: `postId` |
| `PUT` | `/:postId/like` | Atomic toggle like/unlike + realtime socket event | ✅ Yes | Path: `postId` |
| `GET` | `/:postId/likers` | **Full modal list of users who liked this post** | ✅ Yes | Path: `postId` |
| `POST` | `/:postId/view` | Record a view (deduplicated per user) | ✅ Yes | Path: `postId` |
| `GET` | `/:postId/viewers` | **Creator-only list of viewers with timestamps** | ✅ Yes | Path: `postId` |
| `PUT` | `/:postId/bookmark` | Save or unsave post to collection | ✅ Yes | Body: `{ collectionName?: string }` |

---

## 3. Detailed Endpoint Implementation Breakdown

### 3.1 Post Creation (`POST /api/v1/posts`)
- **Multi-Media Processing**: Accepts up to 10 files via Multer + Cloudinary (`uploadMedia.array("media", 10)`).
- **Auto-Type Detection**:
  - Multiple media files $\rightarrow$ `"carousel"`
  - Single video $\rightarrow$ `"reel"` (if aspect ratio is 9:16) or `"video"`
  - Single image $\rightarrow$ `"image"`
- **Video Thumbnail Extraction**: Cloudinary video files automatically generate high-definition poster image thumbnails (`.jpg`).
- **Dynamic Hashtag Extraction**: Regex parser (`/#([a-zA-Z0-9_]+)/g`) extracts hashtags from the caption and merges them with custom tags.

### 3.2 Social Feed Aggregation Pipeline (`GET /api/v1/posts/feed`)
- Queries the social graph (`Follow` collection) for accounts followed by the current user.
- Fetches posts from followed creators + the user's own posts, sorted chronologically (`{ createdAt: -1 }`).
- **Cold-Start Fallback**: If a new user is not following enough accounts, automatically supplements the feed with trending public posts to ensure an active discovery experience.
- **Batch Interaction State**: Efficiently calculates `isLikedByMe`, `isSavedByMe`, and `isViewedByMe` in a single database round-trip.

### 3.3 Creator Transparency: Likers & Viewers Inspectors
- **Likers Inspector (`GET /:postId/likers`)**:
  - Returns the full list of users who liked the post.
  - Populates author avatars, display names, and `about` bios.
  - Cross-references the `Follow` collection to inject `isFollowing: boolean` for each user in the modal list.
- **Viewers Inspector (`GET /:postId/viewers`)**:
  - Only accessible by the creator of the post.
  - Returns every viewer along with their exact `viewedAt` timestamp.
  - Sorted in reverse chronological order (most recent viewers at the top).

### 3.4 Atomic Likes & Realtime Sockets (`PUT /:postId/like`)
- Utilizes atomic MongoDB updates (`$addToSet` / `$pull` and `$inc`) to prevent race conditions under high concurrency.
- Generates in-app notifications for the post author when liked by another user.
- Emits real-time Socket.IO event `post_likes_updated` to the post room (`post:<postId>`) so all active viewers see like counter increments instantly.

### 3.5 Cloudinary Asset Cleanup on Deletion (`DELETE /:postId`)
- Verifies post ownership (`req.user._id === post.author`).
- Iterates over all media items in the post and calls `cloudinary.uploader.destroy()` with appropriate resource type (`image` vs `video`).
- Cascades deletion to associated comments, bookmarks, and notification records.

---

## 4. Key Files Created / Updated in Phase 2

- [`backend/post/src/controller/post.ts`](file:///D:/Chat%20App/backend/post/src/controller/post.ts): 13 full controller functions for Post CRUD, Feed, Explore, Likers, Viewers, Bookmarks, and Health.
- [`backend/post/src/router/post.ts`](file:///D:/Chat%20App/backend/post/src/router/post.ts): Express router mapping all 13 routes with `isAuth` and `uploadMedia`.
- [`backend/post/src/models/User.ts`](file:///D:/Chat%20App/backend/post/src/models/User.ts): User reference model for Mongoose cross-collection population (`author`, `likes`, `views.user`).
- [`backend/post/src/models/Post.ts`](file:///D:/Chat%20App/backend/post/src/models/Post.ts): Updated interface types with optional properties for strict TypeScript mode.
- [`backend/post/src/socket.ts`](file:///D:/Chat%20App/backend/post/src/socket.ts): Added `emitToUser` and `emitToPostRoom` realtime broadcast helpers.

---

## 5. Verification & Diagnostic Test Results

```bash
cd backend/post && npm run build
# Result: 0 Errors (Exit Code 0)

node scripts/system_health_check.js
# Result: 10 Passed, 0 Warnings, 0 Failed
```

---

## 6. Next Steps (Phase 3: 24h Ephemeral Stories Engine & Direct Chat Bridge)

- Implement `createStory` with Cloudinary video/image upload and 24-hour TTL expiration.
- Implement `getStoriesFeed` (grouped by user with seen/unseen rings).
- Implement `markStoryViewed` and `getStoryViewers` inspector.
- Build **Story & Reel Reaction $\rightarrow$ Direct Chat Bridge** (routing reaction emojis and replies directly into Have-it 1-on-1 chats).
