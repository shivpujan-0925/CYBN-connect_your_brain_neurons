# CYBN — Connect Your Brain Neurons

A spaced-repetition tracker for engineers grinding DSA problems. Solve a problem once,
and CYBN schedules four follow-up revisions (Day 1 → +1 day, Day 2 → +3 days, Day 3 → +7 days,
Day 4 → +15 days) so the pattern actually sticks before it's tested for real — capped off
by a Day 5 mastery confirmation.

Built directly from the provided website-architecture diagram: public landing page,
authenticated dashboard with a real-time progress bar and consistency graph, a due-today /
skipped-revisions queue, a full problem list, and a per-problem detail page with the
Day 0→5 stepper, restart, edit, and delete.

---

## Stack

- **Frontend**: HTML + vanilla JS + Tailwind CSS (production build via the Tailwind CLI, not the CDN)
- **Backend**: Node.js + Express
- **Database**: MongoDB via Mongoose. Uses [MongoDB Atlas](https://www.mongodb.com/atlas)'s
  free-forever M0 tier — a managed database that lives independently of wherever you host the
  backend, so redeploying or restarting the backend never touches your data (unlike a SQLite
  file sitting on the backend's own disk, which some free hosting tiers wipe on restart).
- **Auth**: JWT in an httpOnly cookie, passwords hashed with bcrypt
- **Photo upload**: Cloudinary (optional — falls back to a default anonymous avatar if not configured)

## Project structure

```
cybn/
├── backend/
│   ├── src/
│   │   ├── config/        # db.js (MongoDB connection), cloudinary.js
│   │   ├── models/        # User.js, Problem.js (Mongoose schemas)
│   │   ├── middleware/    # auth, error handling, file upload
│   │   ├── controllers/   # auth, user, problem business logic
│   │   ├── routes/        # Express routers
│   │   ├── utils/         # spacedRepetition.js (the scheduling engine), jwt, asyncHandler
│   │   ├── app.js
│   │   └── server.js      # entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/input.css       # Tailwind source + design tokens
    ├── tailwind.config.js  # colors, fonts, animations
    └── public/
        ├── index.html          # landing page (public)
        ├── login.html / signup.html
        ├── dashboard.html      # authenticated home
        ├── add-problem.html    # log a new Day-0 solve
        ├── problems.html       # full list with filters
        ├── problem.html        # detail page + Day 0-5 stepper
        ├── js/                 # api.js (shared client), dashboard.js, problem.js
        └── css/output.css      # built Tailwind CSS (already built, ready to use)
```

## Deploying publicly

If you want this live — for yourself from another device, or for other people to sign up on
— see **[DEPLOY.md](./DEPLOY.md)**. It covers MongoDB Atlas setup (free, and safe from data
loss even on free hosting tiers, unlike a database file sitting on the backend's own disk),
what's already handled security-wise (rate limiting, security headers, locked-down CORS), and
a step-by-step path to a real URL.

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGODB_URI` — a MongoDB Atlas connection string. Free forever, no card required — see
  [DEPLOY.md](./DEPLOY.md) for the 5-minute setup if you don't have one yet.
- `JWT_SECRET` — any long random string (e.g. run
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output in).

```bash
npm start
```

**Optional — profile photo uploads:** create a free account at [cloudinary.com](https://cloudinary.com)
and fill in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`.
Without these, avatar upload returns a friendly error and everyone just gets the default
anonymous avatar — the rest of the app works fine either way.

```bash
npm start
```

The API runs on `http://localhost:5000` and connects to your MongoDB Atlas cluster — no
separate database server to install locally.

### 2. Frontend

The CSS is already built and committed, so you can serve `frontend/public` as-is with any
static server, e.g.:

```bash
cd frontend/public
npx http-server . -p 3000 -c-1
```

Then visit `http://localhost:3000`.

If you change `src/input.css` or `tailwind.config.js`, rebuild with:

```bash
cd frontend
npm install
npm run build      # one-off build
npm run watch       # rebuild on save while you work
```

By default the frontend calls the API at `http://localhost:5000/api`. To point it elsewhere
(e.g. a deployed backend), set `window.CYBN_API_BASE` before `api.js` loads — e.g. add
`<script>window.CYBN_API_BASE = 'https://your-api.example.com/api';</script>` right before
the `<script src="./js/api.js">` tag on each page.

## Features

Beyond the core problem-tracking loop from the original spec:

- **Streaks** — current and longest streak, based on any day you either logged a new
  problem or completed a scheduled revision. Shown on the dashboard header and the stats page.
- **LeetCode import** — paste a `leetcode.com/problems/...` URL on the Add Problem page and
  it fetches the real title, difficulty, and topic tags via LeetCode's own (unofficial, public)
  GraphQL endpoint, pre-filling the form. Fails gracefully to manual entry if LeetCode's endpoint
  is unreachable or changes shape.
- **Stats page** (`stats.html`) — topic breakdown, difficulty spread, and a weekly-activity bar
  chart, all computed from your existing problem data (`backend/src/utils/stats.js`).

## The spaced-repetition schedule

Implemented in `backend/src/utils/spacedRepetition.js`:

| Stage | Meaning | Scheduled |
|---|---|---|
| Day 0 | Problem solved for the first time, logged in CYBN | immediately |
| Day 1 | First revision | 1 day after Day 0 |
| Day 2 | Second revision | 3 days after Day 1 is completed |
| Day 3 | Third revision | 7 days after Day 2 is completed |
| Day 4 | Fourth revision | 15 days after Day 3 is completed |
| Day 5 | Mastery confirmation | manual tick, marks the problem "mastered" |

Stages must be completed in order. Each interval is calculated from the moment the previous
stage was actually completed (not its original due date), so occasional early or late
completions don't compound drift. Hitting **Restart** on a problem resets it to Day 0 and
keeps a `restart_count` so you can see how many passes a problem has needed.

## Design notes

The whole UI is built around one recurring visual: a **synapse-pathway** — a chain of nodes
connected by lines — used in the landing-page hero, the dashboard's progress card, and the
problem-detail stepper. It's not decorative; it's a literal rendering of the Day 0→5 schedule
that is the actual mechanic of the app, tying back to "Connect Your Brain Neurons."

Palette: deep indigo background, warm amber "synapse spark" accent for primary actions and
active/due states, periwinkle for links/secondary accents, teal for mastered problems, soft
coral for overdue. Typography: Space Grotesk for headings, Inter for body/UI, JetBrains Mono
for complexity labels and day counters.

## API reference

All problem/user routes require the auth cookie (set automatically on login/signup).

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/overview` | Dashboard stats, streaks, and consistency graph |
| GET | `/api/users/stats` | Topic/difficulty breakdown, weekly activity, streaks |
| POST | `/api/users/avatar` | Upload profile photo (multipart `avatar` field) |
| DELETE | `/api/users/avatar` | Remove profile photo |
| POST | `/api/problems/import-leetcode` | Body `{ "url": "..." }` — fetch name/difficulty/topics from a LeetCode URL |
| GET | `/api/problems?filter=` | List problems (`due`, `overdue`, `active`, `mastered`, or omit for all) |
| POST | `/api/problems` | Add a newly solved problem (Day 0) |
| GET | `/api/problems/:id` | Problem detail |
| PATCH | `/api/problems/:id` | Edit problem metadata |
| DELETE | `/api/problems/:id` | Delete a problem |
| POST | `/api/problems/:id/complete-stage` | Body `{ "stage": 1-5 }` — mark a revision day done |
| POST | `/api/problems/:id/restart` | Reset a problem back to Day 0 |

## What to build next

This is a working full-stack app, not a finished product. Already in place: rate limiting on
auth routes, security headers, locked-down CORS, password hashing. Worth adding next:

- Email verification and a password-reset flow (needs an email service — Resend, Postmark)
- Pagination on `/api/problems` once a user has hundreds of entries
- Automated tests (the spaced-repetition scheduler in particular is worth unit-testing thoroughly)
- Error monitoring (Sentry's free tier) and automated Atlas backups once real users depend on it

-- Build for Engineers, by the engineer.
