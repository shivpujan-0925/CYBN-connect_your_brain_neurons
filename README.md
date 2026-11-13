# CYBN — Connect Your Brain Neurons

<div align="center">

![CYBN Banner](./frontend/public/assets/cybn-logo-full.svg)

**Production Spaced-Repetition & Neural Memory Consolidation System for Data Structures & Algorithms**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.22-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Security](https://img.shields.io/badge/Security-0_CVEs-10B981?logo=shield&logoColor=white)](https://github.com/shivpujan-0925/CYBN-connect_your_brain_neurons)
[![Tests](https://img.shields.io/badge/Tests-41_Passing-10B981?logo=checkmarx&logoColor=white)](https://github.com/shivpujan-0925/CYBN-connect_your_brain_neurons)

</div>

---

## Overview

**CYBN (Connect Your Brain Neurons)** is a high-performance, developer-first spaced-repetition platform designed to permanently imprint Data Structures and Algorithms (DSA) patterns into long-term memory. 

Instead of re-solving problems haphazardly, CYBN leverages the **Ebbinghaus Forgetting Curve** to schedule automated, non-drifting revision intervals. By enforcing active recall before revealing solutions, engineers transition from brute-force memorization to deep algorithmic intuition.

---

## Core Features

- **5-Stage Neural Consolidation**: Structured spaced repetition intervals (`Day 1` $\to$ `Day 3` $\to$ `Day 7` $\to$ `Day 14` $\to$ `Day 30` / `Mastered`). Intervals calculate dynamically from actual completion timestamps to eliminate compounding schedule drift.
- **Active Recall Mode**: Curtained solution masking, practice timer, confidence rating (*Struggled* vs. *Nailed it*), and canvas celebration particle bursts upon mastery confirmation.
- **Progressive Web App (PWA)**: Installable as a native desktop or mobile application on iOS, Android, Windows, and macOS with offline app-shell caching via Service Worker.
- **365-Day Consistency Heatmap**: Full 52-week activity board recording first-time solves and spaced reviews, synchronized with rolling streak analytics.
- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Keyboard-driven navigation across all problems, topics, and actions without leaving the keyboard.
- **LeetCode GraphQL Importer**: Automated title, difficulty, and topic extraction via domain-anchored URL parsing with graceful manual fallbacks.
- **Minimal Aesthetic UI**: High-contrast, theme-adaptive interface (Dark `#070913` / Light `#FAFAFC`) with floating segmented controls and zero flash of unstyled content (FOUC).

---

## Architecture & Technology Stack

| Layer | Technologies | Details |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla ES6+, Tailwind CSS | Zero runtime framework overhead, custom design tokens, responsive pill navigation, PWA service worker. |
| **Backend** | Node.js (v18+), Express | Modular REST API, custom error handling, strict validation layer. |
| **Database** | MongoDB Atlas via Mongoose | Managed cloud database independent of application server lifecycle. |
| **Authentication** | JWT (`httpOnly`, `SameSite`, `Secure` cookies) + bcrypt | 10-round salted password hashing, SHA-256 cryptographic reset tokens. |
| **Media & Mail** | Cloudinary & Resend | Optimized profile photo processing with default fallback vectors; transactional reset emails. |

---

## Security Hardening

- **Zero Vulnerabilities**: Regular dependency audits with 0 reported CVEs across both client and server trees.
- **Global NoSQL Query Sanitization**: `mongoose.set('sanitizeFilter', true)` enabled globally to prevent query selector injection attacks.
- **Strict Type Guards**: Enforced primitive string validation on authentication and reset routes to block nested object payloads.
- **SSRF & Domain Anchoring**: Regex URL validators strictly anchored to verified domains (`leetcode.com`) to prevent SSRF vulnerabilities.
- **DDoS & Resource Exhaustion Protection**:
  - Request body limits strictly bounded to `100kb`.
  - IP-based rate limiting (`express-rate-limit`) on sensitive authentication routes.
  - Strict database schema `maxlength` bounds across all string inputs.
- **Security Headers**: Production Helmet integration configuring `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, and `Cross-Origin-Resource-Policy`.

---

## Repository Structure

```
cybn/
├── backend/
│   ├── src/
│   │   ├── config/          # Database (MongoDB) and Cloudinary initialization
│   │   ├── controllers/     # Auth, User, and Problem business logic
│   │   ├── middleware/      # Auth guard, file upload filter, error handlers, rate limiters
│   │   ├── models/          # User and Problem Mongoose schemas with validation bounds
│   │   ├── routes/          # Express route definitions (/api/auth, /api/users, /api/problems)
│   │   ├── utils/           # Spaced repetition engine, stats algorithms, JWT, mailer
│   │   ├── app.js           # Express application configuration and middleware stack
│   │   └── server.js        # Server listener entry point
│   ├── tests/               # Automated security, auth, and spaced repetition test suites
│   ├── .env.example         # Environment template with placeholder definitions
│   └── package.json
└── frontend/
    ├── src/
    │   └── input.css        # Tailwind design tokens, typography, and theme definitions
    ├── tests/               # Frontend integrity, syntax, and PWA test suites
    ├── tailwind.config.js   # Custom color palettes, shadows, keyframe animations
    └── public/
        ├── manifest.json    # PWA web app manifest
        ├── sw.js            # PWA Service Worker (app-shell & offline caching)
        ├── assets/          # Vector logos, favicons, and generated high-res PWA icons
        ├── css/             # Compiled production Tailwind stylesheet
        ├── js/              # Client API SDK, command palette, PWA controller, theme manager
        └── *.html           # Standalone semantic HTML views
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (Free M0 cluster)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure your `.env` file with your credentials (see `.env.example` for format):

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=your_long_random_entropy_secret_string
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cybn
```

Start the API server:

```bash
npm start
```

### 2. Frontend Setup

The compiled CSS is bundled in `frontend/public/css/output.css`. Serve the static assets locally:

```bash
cd frontend
npm install
npm run serve
```

Visit `http://localhost:3000` in your browser.

To watch and recompile Tailwind styles during development:

```bash
npm run watch
```

---

## Automated Test Suites

The repository contains comprehensive automated test suites using the native Node.js test runner:

```bash
# Run backend security and spaced-repetition logic tests (20 tests)
npm test --prefix backend

# Run frontend integrity, syntax, and PWA compliance tests (21 tests)
npm test --prefix frontend
```

**Test Coverage Summary**:
- **Security**: JWT signing & tampering, bcrypt round verification, SHA-256 token hashing, NoSQL payload rejection, mimetype whitelisting, LeetCode domain anchoring.
- **Spaced Repetition**: Day 0 through Day 30 stage progression, drift-free interval calculations, due/overdue boundary checks, streak computations, and 8-week weekly activity aggregation.
- **Frontend & PWA**: DOCTYPE and viewport tag validation, JS syntax verification (`node --check`), compiled CSS integrity, Web App Manifest verification, and Service Worker precache audits.

---

## Spaced Repetition Protocol

| Stage | Revision Milestone | Scheduling Formula | Purpose |
| :---: | :--- | :--- | :--- |
| **Day 0** | Initial Solve | Immediate | Problem solved and logged into CYBN registry. |
| **Day 1** | 1st Active Recall | $+24\text{ hours}$ after Day 0 | Short-term memory consolidation. |
| **Day 2** | 2nd Active Recall | $+3\text{ days}$ after Day 1 | Reinforcing neural pathways as initial decay begins. |
| **Day 3** | 3rd Active Recall | $+7\text{ days}$ after Day 2 | Intermediate retrieval practice. |
| **Day 4** | 4th Active Recall | $+15\text{ days}$ after Day 3 | Long-term memory transfer. |
| **Day 5** | Mastery Tick | Final confirmation | Marking problem permanently mastered. |

---

## API Reference

All protected endpoints require an authenticated session cookie or `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/signup` — Create account and establish session.
- `POST /api/auth/login` — Authenticate credentials and receive token.
- `POST /api/auth/logout` — Invalidate session and clear auth cookies.
- `GET  /api/auth/me` — Retrieve currently authenticated user context.
- `POST /api/auth/forgot-password` — Dispatch cryptographically hashed reset link.
- `POST /api/auth/reset-password` — Complete password update using one-time token.

### User Metrics & Profile
- `GET    /api/users/overview` — Dashboard KPI metrics, 365-day heatmap data, and streak counters.
- `GET    /api/users/stats` — Topic breakdowns, difficulty spreads, and rolling weekly solve volumes.
- `POST   /api/users/avatar` — Upload and optimize profile avatar (`multipart/form-data`).
- `DELETE /api/users/avatar` — Reset avatar to CYBN default vector graphic.

### Problem Lifecycle
- `GET    /api/problems` — Retrieve tracked problem registry (filters: `due`, `overdue`, `active`, `mastered`).
- `POST   /api/problems` — Register a newly solved problem (Day 0).
- `GET    /api/problems/:id` — Retrieve problem details, active recall notes, and stage timestamps.
- `PATCH  /api/problems/:id` — Update problem notes, pattern tags, or complexity metadata.
- `DELETE /api/problems/:id` — Remove problem from registry.
- `POST   /api/problems/:id/complete-stage` — Log completion of revision stage ($1\le N\le 5$).
- `POST   /api/problems/:id/restart` — Reset problem back to Day 0 spaced repetition.
- `POST   /api/problems/import-leetcode` — Query LeetCode GraphQL API for automated problem import.

---

## Deployment

Refer to **[DEPLOY.md](./DEPLOY.md)** for detailed production deployment instructions covering MongoDB Atlas configuration, Render/Railway backend hosting, and static frontend hosting via Vercel or Cloudflare Pages.

---

## License

Distributed under the MIT License. Built for engineers, by the engineer.
