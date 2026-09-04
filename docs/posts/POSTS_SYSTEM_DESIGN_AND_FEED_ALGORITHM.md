# Have-it "Posts & Social Hub" — Large-Scale Feed Algorithm & Distributed System Design

> **Target Scale**: 1 Billion Registered Users, 250 Million Daily Active Users (DAU), 50 Million Posts/Day, 5 Billion Feed Reads/Day  
> **Latency Budget**: $p99 < 150\text{ms}$ Feed Loading, $p99 < 50\text{ms}$ Real-Time Like/View Counting  
> **Availability SLA**: 99.99% High Availability with Multi-Region Data Tiering  

---

## 1. System Requirements & Capacity Estimation (Scale Math)

### 1.1 Traffic & Throughput Estimation
- **Daily Active Users (DAU)**: $250\text{M}$ users.
- **Average Post Creations**: $50\text{M}$ posts/day $\approx \frac{50,000,000}{86,400} \approx 580\text{ writes/sec}$ (Peak: $2,500\text{ writes/sec}$).
- **Feed Generations & Reads**: Each user views feed 10 times/day $\rightarrow 2.5\text{ Billion feed reads/day} \approx \frac{2,500,000,000}{86,400} \approx 29,000\text{ QPS}$ (Peak: $75,000\text{ QPS}$).
- **Story & Reel Views**: $5\text{ Billion views/day} \approx 58,000\text{ QPS}$ (Peak: $150,000\text{ QPS}$).
- **Likes & Comments**: $1\text{ Billion interactions/day} \approx 12,000\text{ QPS}$ (Peak: $40,000\text{ QPS}$).

### 1.2 Storage & Bandwidth Estimation
- **Metadata per Post**: $\approx 1\text{ KB}$ (Author, IDs, Timestamps, Counters, Tags).
- **Post Metadata Storage**: $50\text{M} \times 1\text{ KB} = 50\text{ GB/day} \approx 18.25\text{ TB/year}$.
- **Media Storage (Compressed on CDN)**: Average $1.5\text{ MB/post} \times 50\text{M} = 75\text{ TB/day}$.
- **In-Memory Cache for Active Feeds (Redis)**:
  - Cache top 800 post IDs per active user (8 bytes per Post ID).
  - $250\text{M users} \times 800\text{ posts} \times 8\text{ bytes} \approx 1.6\text{ TB}$ distributed across a Redis Cluster.

---

## 2. The Core Feed Ranking Algorithm

The Have-it Feed Engine operates in **4 sequential stages**:
```
  ┌────────────────────────┐
  │ 1. Candidate Sourcing  │  Retrieve 5,000 candidate posts (Follow graph + Explore pool)
  └───────────┬────────────┘
              │
  ┌───────────▼────────────┐
  │ 2. Feature Extraction  │  Compute User Affinity, Recency, Content Quality, Engagement
  └───────────┬────────────┘
              │
  ┌───────────▼────────────┐
  │ 3. ML Heavy Ranker     │  Score each candidate with Scoring Formula: Score(u, p)
  └───────────┬────────────┘
              │
  ┌───────────▼────────────┐
  │ 4. Diversity & Filter  │  De-duplicate, apply negative feedback, author balance & ads
  └───────────┬────────────┘
              │
        Top 20-50 Items $\rightarrow$ Returned to Client ($< 150\text{ms}$)
```

### 2.1 Mathematical Scoring Formula

For any user $u$ and candidate post $p$ created by author $a$, the composite ranking score is defined as:

$$\text{Score}(u, p) = w_{\text{recency}} \cdot R(p) + w_{\text{affinity}} \cdot A(u, a) + w_{\text{engagement}} \cdot E(p) + w_{\text{type}} \cdot T(u, p) - D(u, p)$$

#### 1. Recency Decay Function $R(p)$
Exponential time decay ensures fresh content stays at the top while high-engagement content remains relevant:

$$R(p) = \exp\left(-\lambda \cdot \Delta t\right) = e^{-\frac{\ln(2)}{t_{\text{half-life}}} \cdot (t_{\text{now}} - t_{\text{created}})}$$
- Standard Half-Life $t_{\text{half-life}} = 12\text{ hours}$.
- Posts older than 48 hours receive a heavily decayed score unless engagement velocity is exceptionally high.

#### 2. User-Author Affinity Score $A(u, a)$
Measures how close user $u$ is to author $a$ based on historical interaction signals:

$$A(u, a) = \alpha_1 \cdot \text{DM}_{\text{frequency}}(u, a) + \alpha_2 \cdot \text{Like}_{\text{rate}}(u, a) + \alpha_3 \cdot \text{Comment}_{\text{rate}}(u, a) + \alpha_4 \cdot \text{StoryReply}_{\text{rate}}(u, a) + \alpha_5 \cdot \text{ProfileVisits}(u, a)$$
- Weights: Direct Message exchange ($\alpha_1 = 0.35$) has the highest weight because Have-it bridges messenger with social feed.

#### 3. Content Engagement Velocity $E(p)$
Measures global virality and early engagement velocity:

$$E(p) = \log_{10}\left(1 + \frac{\text{Likes} \cdot 1.0 + \text{Comments} \cdot 3.0 + \text{Saves} \cdot 4.0 + \text{Shares} \cdot 5.0}{\max(1, \Delta t_{\text{hours}})}\right)$$
- Saves and Shares have higher weights than simple Likes because they reflect deep content value.

#### 4. Content Type Match $T(u, p)$
User preference for specific media formats (Carousels vs Single Image vs Short Video Reels):

$$T(u, p) = \frac{\text{Historical Dwell Time on format}(u, \text{type}(p))}{\text{Total Dwell Time}(u)}$$

#### 5. Diversity & Fatigue Penalty $D(u, p)$
Prevents single authors from dominating the feed consecutively:
- Consecutive post from same author: $-30\%$ score penalty.
- Already viewed/scrolled past post: $-80\%$ score penalty.

---

## 3. Hybrid Fan-Out Architecture (Push vs. Pull)

Handling both regular users (100 followers) and mega-influencers/celebrities (50M+ followers) requires a **Hybrid Fan-Out Architecture**:

```
                                 ┌───────────────────────────┐
                                 │   User Creates New Post   │
                                 └─────────────┬─────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │ Check Author Follower Count│
                                 └──────┬─────────────┬──────┘
                                        │             │
                Followers < 25,000      │             │ Followers >= 25,000 (Celebrity)
         ┌──────────────────────────────┘             └──────────────────────────────┐
         │ (Fan-out on Write / Push)                                                 │ (Fan-out on Read / Pull)
┌────────▼─────────────────────────┐                                        ┌────────▼─────────────────────────┐
│ Async Worker pushes Post ID to   │                                        │ Write Post to Author's Timeline  │
│ all followers' Redis Feed ZSETs  │                                        │ only (No massive fanout writes)  │
└──────────────────────────────────┘                                        └──────────────────────────────────┘
                                                                                             │
                                    ┌────────────────────────────────────────────────────────┘
                                    │ At Query Time: Merge Followed Celebrity Timelines
                                    ▼ into User Feed ZSET using Redis ZUNIONSTORE
```

### 3.1 Regular Users: Fan-Out on Write (Push Model)
1. User publishes a post.
2. Background worker retrieves follower list.
3. For all followers ($< 25,000$), pushes `postId` into their personal Redis Feed Sorted Set:
   ```redis
   ZADD user:feed:{followerId} {score} {postId}
   ZREMRANGEBYRANK user:feed:{followerId} 0 -801  # Keep latest 800 items
   ```
4. **Benefit**: Reading user feed is $O(1)$ fast $\rightarrow$ simply read `ZREVRANGEBYSCORE` with $< 5\text{ms}$ latency.

### 3.2 Celebrities / High-Follower Accounts: Fan-Out on Read (Pull Model)
1. If author has $\ge 25,000$ followers (e.g. 10M followers), do **NOT** perform 10M write operations.
2. Save the post only to `user:timeline:{authorId}`.
3. When a follower requests their feed:
   - Fetch follower's cached Redis Feed ZSET.
   - Fetch the top posts from followed celebrity timelines.
   - Merge and rank the candidate pool in-memory.

---

## 4. Scalable Likes, Views & Creator Inspection Architecture

Unlike Instagram (which restricts viewer/liker history), Have-it provides **Full Creator Transparency** to inspect who viewed and liked posts, reels, and stories at massive scale.

```
                   ┌────────────────────────────────────────────────────────┐
                   │             User Views / Likes a Post                  │
                   └──────────────────────────┬─────────────────────────────┘
                                              │
                   ┌──────────────────────────▼─────────────────────────────┐
                   │           Redis In-Memory Buffer (Write-Back)          │
                   │  - Counters: HINCRBY post:{id}:counters views/likes    │
                   │  - Viewers ZSET: ZADD post:{id}:viewers {now} {userId} │
                   │  - Likers ZSET: ZADD post:{id}:likers {now} {userId}   │
                   └──────────────────────────┬─────────────────────────────┘
                                              │
                                 ┌────────────▼────────────┐
                                 │ Kafka / RabbitMQ Queue  │  (Batched Write Events)
                                 └────────────┬────────────┘
                                              │
                                 ┌────────────▼────────────┐
                                 │  Persistent Storage     │  MongoDB / Distributed DB
                                 │  - Bulk Upsert / Write  │  (Flushed every 2-5 seconds)
                                 └─────────────────────────┘
```

### 4.1 Real-Time Atomic Counters & Viewers List
- **Counter Operations**: Buffered in Redis with `HINCRBY post:{postId}:stats views 1` and `likes 1`.
- **Viewers / Likers Indexing**:
  - `post:{postId}:viewers` (Redis Sorted Set, Score = timestamp, Member = `userId`).
  - Allows creators to query paginated viewers in $O(\log N + M)$ time:
    ```redis
    ZREVRANGEBYSCORE post:{postId}:viewers +inf -inf WITHSCORES LIMIT 0 20
    ```
- **Asynchronous Persistence**: A background worker consumes batches from the event stream every 3 seconds to update MongoDB with atomic `$inc` and `$addToSet` operations.

---

## 5. Global Distributed System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Global Anycast Cloudflare   │
                                  │  - Edge Static CDN / Assets   │
                                  │  - DDoS Protection & SSL      │
                                  └───────────────┬───────────────┘
                                                  │
                                  ┌───────────────▼───────────────┐
                                  │    API Gateway & Load Balancer│
                                  │   - Rate Limiting (Token Bkt) │
                                  │   - JWT Auth Verification     │
                                  └───────┬───────────────┬───────┘
                                          │               │
                     ┌────────────────────┴───┐       ┌───┴───────────────────┐
                     │                        │       │                       │
           ┌─────────▼───────────┐  ┌─────────▼───────▼───┐         ┌─────────▼───────────┐
           │   User Service      │  │    Chat Service     │         │    Post Service     │
           │   (Port 5000)       │  │    (Port 5002)      │         │    (Port 5003)      │
           │  - Auth & Profile   │  │  - Sockets & WebRTC │         │  - Feed & Stories   │
           │  - Follow Graph     │  │  - Story DM Router  │         │  - Heavy Ranker     │
           └─────────┬───────────┘  └─────────┬───────────┘         └─────────┬───────────┘
                     │                        │                               │
        ┌────────────┴────────────────────────┼───────────────────────────────┴────────────┐
        │                                     │                                            │
┌───────▼─────────────────┐       ┌───────────▼─────────────┐                  ┌───────────▼─────────────┐
│ MongoDB Cluster         │       │ Distributed Redis Clust │                  │ Apache Kafka / RabbitMQ │
│ (Sharded by UserID)     │       │ - User Feed ZSETs       │                  │ - Event Fan-Out Pipeline│
│ - Users, Posts, Stories │       │ - Hot Metadata Cache    │                  │ - Story $\rightarrow$ DM│
└─────────────────────────┘       └─────────────────────────┘                  └─────────────────────────┘
```

---

## 6. Implementation Roadmap Integration

| Component | Technical Strategy | Primary Microservice | Target Latency |
|---|---|---|---|
| **Feed Ranking** | Recency decay + Affinity graph + Engagement score | `backend/post` | $< 120\text{ms}$ |
| **Push/Pull Fan-Out** | Redis Sorted Sets with background worker fan-out | `backend/post` | $< 5\text{ms}$ (Cache) |
| **Likers / Viewers** | Redis ZSET buffer + batched MongoDB bulk-write | `backend/post` | $< 15\text{ms}$ |
| **Story $\rightarrow$ Chat Bridge** | Inter-service event routing to direct message thread | `backend/post` $\rightarrow$ `backend/chat` | $< 80\text{ms}$ |
| **Follow Graph** | Fast relationship indexing with Redis Set membership | `backend/user` | $< 10\text{ms}$ |
