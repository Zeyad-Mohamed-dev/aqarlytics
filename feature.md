# Aqarlytics — Feature Roadmap

> Real-time social media lead generation for real estate agents. Monitors Facebook post comments, analyzes buyer intent via LLM, and pushes alerts to WhatsApp/Telegram.

---

## ✅ Implemented

### 1. Authentication & User Management
- **POST** `/auth/register` — Register (email, password, name, Egyptian phone)
- **POST** `/auth/login` — Login, returns JWT (1h expiry)
- **GET** `/auth/profile` — Current user profile (JWT-protected)
- Role system: `AGENCY_OWNER`, `AGENCY_ADMIN`, `SELLER`
- Email domain whitelist validation (gmail, yahoo, outlook, etc.)
- bcrypt password hashing

### 2. Post Tracking (Facebook URLs)
- **GET** `/posts` — List tracked posts for authenticated user
- **POST** `/posts` — Add a Facebook post URL to track (M2M relation via `post_trackers`)
- **DELETE** `/posts/:id` — Remove a tracker from a post
- Deduplication: re-adding the same URL just links the user as tracker

### 3. Facebook Scraping (Puppeteer)
- Full browser automation with `puppeteer-extra` + stealth plugin
- Facebook login with human-like typing delays
- Session cookie persistence/restore across restarts
- Smart comment extraction: scroll-to-load, expand "See more" & reply threads
- Extracts: author, profile URL, content, timestamp, replies
- In-memory deduplication per post URL

### 4. Comment Analysis (LLM)
- **GroqProvider** — `llama-3.3-70b-versatile` model
- Analyzes comments for genuine buyer/renter intent
- Filters out: generic reactions, spam, tags, other agent promotions
- Returns `interestScore` (0–100) + `reason` per comment
- Threshold: only comments with score ≥ 60 qualify as leads

### 5. Background Jobs (BullMQ + Redis)
- **Scraping queue** — processes scrape jobs (retry: 3 attempts, 5s backoff)
- **Notifying queue** — dispatches notifications for interested comments
- **Cron schedule** — every 30 min, queues scrape jobs for all tracked posts
- Redis-based deduplication: 7-day TTL per tracker per post

### 6. Notifications
- **WhatsApp** — Baileys library (WhatsApp Web protocol), QR auth, session persistence, auto-reconnect
- **Telegram** — `node-telegram-bot-api`, message to configured chat IDs

### 7. Global Infrastructure
- Standardized API response: `{ success, data?, error?, meta? }` via global interceptor
- PostgreSQL + TypeORM (auto-sync in dev)
- Docker Compose for PostgreSQL 16 + Redis 7
- Pino logging, class-validator, class-transformer
- Jest + Supertest (unit, integration, and E2E tests)
- ESLint + Prettier

---

## 🚧 Next Steps

### 1. Lead Management (`src/leads`)
- [ ] Register `Lead` as a proper TypeORM entity (`@Entity`)
- [ ] Implement `LeadsService` CRUD (create, list, update status, assign to seller)
- [ ] Lead status workflow (new → contacted → qualified → converted → lost)
- [ ] REST endpoints: `GET /leads`, `POST /leads`, `PATCH /leads/:id`, `DELETE /leads/:id`

### 2. Agency Module (`src/agency`)
- [ ] Register `Agency` as a proper TypeORM entity
- [ ] Implement `AgencyService` — create agency, invite admins/sellers
- [ ] Link users to agencies with role-based access control
- [ ] REST endpoints: agency CRUD, member management

### 3. Multi-Platform Support
- [ ] `SocialMediaPlatform` enum already defined (Twitter, Instagram, LinkedIn, etc.)
- [ ] Build scrapers for additional platforms (Instagram, TikTok, etc.)
- [ ] Abstract scraper interface already in place — implement per platform

### 4. Analytics / Dashboard ("Aqarlytics")
- [ ] Analytics endpoints: lead volume over time, conversion rates, platform breakdown
- [ ] Per-agent/per-agency performance metrics
- [ ] Response time tracking
- [ ] Dashboard API for frontend consumption

### 5. API Hardening & Quality
- [ ] Rate limiting on auth & public endpoints
- [ ] Input sanitization & URL validation improvements
- [ ] Proper error handling across all modules
- [ ] JWT secret rotation & env hardening
- [ ] Add `.env` to `.gitignore` (currently committed with live credentials)

### 6. API Documentation
- [ ] Swagger / OpenAPI integration (`@nestjs/swagger`)
- [ ] Document all request/response schemas

### 7. Notification Enhancements
- [ ] Implement `JobsService.addNotificationJob()` (currently empty stub)
- [ ] Add notification preferences per user (WhatsApp vs Telegram vs both)
- [ ] Notification templates + formatting improvements
- [ ] Manual notification trigger endpoint

### 8. Testing Coverage
- [ ] Expand unit tests for all services
- [ ] Controller E2E tests for all endpoints
- [ ] Mock-based analyzer/scraper tests (reduce live API dependency)

### 9. DevOps & Deployment
- [ ] Dockerfile for the NestJS app
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production-grade Docker Compose (non-root, secrets management)
- [ ] Session/cookie encryption at rest

### 10. Security
- [ ] Encrypt Facebook session cookies and WhatsApp auth sessions
- [ ] Rate limiting (brute force protection on login)
- [ ] 2FA support for agency admin actions
- [ ] Audit logging for sensitive operations
