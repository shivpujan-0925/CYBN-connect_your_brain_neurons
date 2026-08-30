# Deploying CYBN

This covers taking CYBN from your machine to a real URL — whether that's just for you (so
you can check it from your phone) or for other people to sign up on too. The database change
below (MongoDB Atlas) means the same setup works safely for either case, at $0.

## Why MongoDB Atlas specifically

CYBN's database is now MongoDB via Mongoose, connected through **Atlas's M0 tier — free
forever, no card required, 512 MB storage.** The important part: Atlas is a separate managed
service from wherever you host the backend. That means redeploying or restarting your backend
(which free hosting tiers do often — spinning down when idle, resetting on redeploy) **never
touches your data**, unlike a database file that lives on the backend's own disk. For an app
whose entire point is tracking progress over 15+ days, that reliability matters even for
personal use.

## Step 1 — Set up MongoDB Atlas (5 minutes, free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign up (email, or Google/GitHub).
2. Create a free **M0** cluster — pick any cloud provider/region, the defaults are fine.
3. Create a database user (username + password) under Database Access — save these, you'll
   need them in the connection string.
4. Under Network Access, add `0.0.0.0/0` (allow access from anywhere) — simplest option for a
   small project; you can restrict this to your hosting provider's IP ranges later if you want.
5. Click "Connect" on your cluster → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add a database name to the path (Atlas doesn't require this, but it keeps things tidy):
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cybn?retryWrites=true&w=majority
   ```
   That full string is your `MONGODB_URI`.

## Step 2 — Deploy the backend

Any Node host works; **Render** is a straightforward free option now that the database isn't
tied to the backend's own disk:

1. Push this repo to GitHub (if it isn't already).
2. On Render: New → Web Service → connect the repo, root directory `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. The **free tier is fine now** — no persistent disk needed, since your data lives in Atlas.
   (If this is a public launch and you want to avoid the free tier's cold-start delay for new
   visitors — about 30-50 seconds after 15 minutes of inactivity — the Starter plan at
   ~$7/month removes that. Not required, just nicer.)
5. Set environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI` — from Step 1
   - `JWT_SECRET` — a real random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `CLIENT_ORIGIN` — you'll fill this in after Step 3, once you know your frontend's URL
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — optional, only
     if you want profile photo uploads to work
6. Deploy. Note the URL Render gives you (e.g. `https://cybn-api.onrender.com`).

## Step 3 — Deploy the frontend

The frontend is static files — Render Static Site, Vercel, Netlify, or Cloudflare Pages all
work and are free.

1. New Static Site → same repo → root directory `frontend/public`, no build command needed
   (the CSS is already committed pre-built).
2. Deploy. Note the URL (e.g. `https://cybn.vercel.app`).
3. Edit `frontend/public/js/config.js` and set `window.CYBN_API_BASE` to your backend's URL
   from Step 2, e.g. `'https://cybn-api.onrender.com/api'`. Commit and redeploy — this is the
   **only file** you touch for the frontend to know where the backend lives.

## Step 4 — Connect them

Back in your backend's environment variables, set:

```
CLIENT_ORIGIN=https://cybn.vercel.app
```

using your real frontend URL from Step 3. Redeploy the backend. This is what makes CORS
accept requests from your actual frontend instead of only `localhost:3000`.

## Step 5 — Verify it works

- Sign up on the live URL
- Add a problem, complete a revision stage, check the stats page and streak
- Confirm the consistency graph populates
- Restart the backend service manually (Render lets you do this from the dashboard) and
  confirm your data is still there afterward — this is the exact scenario Atlas protects
  against, worth actually testing once

## If you're going public (not just personal use)

Everything above works the same either way, but if strangers will be signing up, also read
through what's still missing before treating this as a real public launch:

- **No password reset flow yet** — if a real user forgets their password, there's currently
  no way back in. Needs an email service (Resend, Postmark) to send a reset link.
- **No email verification** — anyone can currently sign up with any email address.
- Rate limiting (10 attempts/15 min on login/signup), security headers, and locked-down CORS
  are already in place — these apply regardless of personal vs. public use.

Ask if you want help building password reset or email verification — both are natural next
steps once real people depend on the app.

## Ongoing costs

$0 if you stay on Render's free tier + Atlas's free tier + a free static frontend host. Add
~$7/month only if you want to remove the backend's cold-start delay, and ~$10-15/year if you
want a custom domain instead of the free `.onrender.com` / `.vercel.app` URL.
