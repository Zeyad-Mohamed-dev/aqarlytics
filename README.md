# Aqarlytics

Aqarlytics is a NestJS backend service for monitoring social media responses to real estate listings. It tracks Facebook post URLs, scrapes comments, extracts structured listing data, analyzes interest with an LLM provider, and delivers alerts through WhatsApp and Telegram.

## What is developed in this project

- JWT authentication and user registration with email provider validation.
- PostgreSQL database integration using TypeORM.
- User-managed tracking of social media posts.
- Facebook comment scraping using Puppeteer and session cookie reuse.
- Structured listing extraction into market observations for analytics and pricing use cases.
- Background job orchestration with BullMQ and Redis.
- Recurring scraping scheduling via NestJS Cron.
- Comment analysis using a configurable LLM provider (`GroqProvider`).
- Notification channels for WhatsApp and Telegram.

## Architecture overview

- `src/app.module.ts` imports and configures all modules, BullMQ, Redis, and global interceptors.
- `src/auth` handles auth, login, registration, JWT issuance, and user profile retrieval.
- `src/users` manages user persistence and password hashing.
- `src/posts` stores tracked post URLs, links users as trackers, and manages tracking state.
- `src/scrapper` contains Facebook scraping logic and login/session handling.
- `src/analyzer` evaluates comments with an LLM to identify interested leads.
- `src/analytics` stores normalized location data and market observations extracted from scraped post content.
- `src/jobs` schedules scraping jobs and adds work to queues.
- `src/processor` runs worker processors for scraping, market-observation extraction, and notification distribution.
- `src/notification` coordinates notification sending using WhatsApp and Telegram.

## Features

- Register and log in users.
- Track Facebook posts by URL.
- Periodic scraping jobs for all tracked posts.
- Automatic `MarketObservation` extraction from scraped post content.
- Comment deduplication and new-comment detection.
- Interest analysis for buyer/renter intent.
- Notification sending via WhatsApp and Telegram.

## Environment variables

Create a `.env` file in the repository root with values like:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=aqarlytics
JWT_SECRET=your_jwt_secret
REDIS_HOST=localhost
REDIS_PORT=6379
FACEBOOK_EMAIL=your_fb_email
FACEBOOK_PASSWORD=your_fb_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GROQ_API_KEY=your_groq_api_key
```

## Requirements

- Node.js 20+
- PostgreSQL
- Redis
- Facebook account credentials for scraping
- Telegram bot token
- Groq API key for LLM analysis

## Installation

```bash
npm install
```

## Run locally

```bash
npm run start:dev
```

## Scripts

- `npm run start` - start the application
- `npm run start:dev` - start in watch mode
- `npm run build` - compile TypeScript
- `npm run lint` - run ESLint
- `npm run test` - run unit tests
- `npm run test:e2e` - run e2e tests
- `npm run test:cov` - generate coverage

## API endpoints

### Authentication

- `POST /auth/register` - create a new user
- `POST /auth/login` - authenticate and receive JWT
- `GET /auth/profile` - get current user profile (requires JWT)

### Post tracking

- `GET /posts` - list posts tracked by the authenticated user
- `POST /posts` - create a tracked post URL
- `DELETE /posts/:id` - remove a tracked post for the current user

## Notes

- The current scraper is Facebook-specific.
- Structured listing extraction runs inside the scraping processor and persists `MarketObservation` records when a tracked post includes extractable listing details.
- `src/leads` exists but does not contain active lead-processing logic yet.
- WhatsApp sessions are stored in `auth_sessions/`.
- Notifications are delivered through configured notifier implementations.

## Next steps

- Add full lead management under `src/leads`.
- Expand scraper support to additional platforms.
- Harden error handling and retry logic in workers.
- Add API documentation and endpoint validation.
