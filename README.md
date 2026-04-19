# CronJobManager

A small teaching project for learning how cron-style scheduled jobs work.

- **Frontend** (repo root): A Next.js app where you configure jobs (name, cron expression, job type, params) and view/delete them. Also exposes a JSON API the worker polls.
- **Worker** (`worker/`): A long-lived Node.js process that polls the frontend API, parses cron expressions, and fires due jobs. Has a pluggable job-type registry — drop a file into `worker/src/jobs/` to add a new type.

The project is intentionally minimal. No auth, no database server, no fancy abstractions. The goal is to read the code and understand what's happening.

## Directory layout

```
CronJobManager/
  src/               Next.js (App Router, TypeScript) frontend + API
    app/
      page.tsx         Job list + create form
      api/jobs/        CRUD API routes
    lib/
      store.ts         JSON-file persistence
  package.json       Next.js app manifest (repo root)
  next.config.mjs
  tsconfig.json
  worker/            Node.js (TypeScript) worker process
    src/
      index.ts         Main loop
      lib/
        registry.ts    Loads handlers from jobs/
        api.ts         HTTP client for the frontend
      jobs/
        logMessage.ts  Example job handler
  data/              Persisted jobs (JSON file lives here in dev)
```

## Key choices (and why)

- **Persistence**: a single JSON file at `data/jobs.json`, read/written by the web app. Chose this over SQLite to keep the scaffold dependency-free and obvious. Swap to SQLite later if concurrent writes or querying matter.
- **Cron library**: `cron-parser` in the worker. Gives explicit `nextDate()`/`prevDate()` for each expression, which makes the "is this job due?" check easy to read and debug. `node-cron` was an alternative but it hides scheduling inside its own event loop, which is less useful as a teaching example.
- **Styling**: plain CSS module in `src/app/page.module.css`. No Tailwind — one less thing to explain.
- **Polling over webhooks**: the worker polls `GET /api/jobs` every few seconds. Simpler than push; fine for teaching.
- **ID generation**: `crypto.randomUUID()` in the API route. Good enough, no extra dep.

## Run locally

You'll need Node 20+ installed.

### 1. Install dependencies

```bash
npm install
cd worker && npm install
```

### 2. Start the frontend

```bash
npm run dev
```

Visit http://localhost:3000 — you'll see the job list and create form.

### 3. Start the worker (in another terminal)

```bash
cd worker
npm run dev
```

The worker will poll `http://localhost:3000/api/jobs` every 5 seconds, figure out which jobs are due, and run them. Configure the target URL with `WEB_URL` env var if needed.

### 4. Try it

Create a job in the UI:
- Name: `hello`
- Cron: `*/1 * * * *` (every minute)
- Type: `logMessage`
- Params: `{"message": "hello from cron"}`

Watch the worker terminal — within a minute you'll see the message logged.

## How to add a new job type

The worker auto-loads every `.ts` file in `worker/src/jobs/`. Each file exports a `jobType` string and a `handler` function. To add a new type, copy `logMessage.ts`:

1. Create `worker/src/jobs/myNewType.ts`.
2. Export `jobType = 'myNewType'` and a `handler(params)` function that does the work.
3. Restart the worker. The registry picks it up on startup.
4. In the UI, set the job's "type" field to `myNewType` and provide matching `params` JSON.

See `worker/src/jobs/logMessage.ts` for the canonical shape.

## Deploying

### Frontend (Vercel)

The Next.js app lives at the repo root, so Vercel detects it out of the box:

1. Import the repo into Vercel.
2. Accept the defaults — Vercel auto-detects the Next.js framework preset from the root `package.json`.
3. Deploy.

No Root Directory override is needed.

### Worker

The worker is a long-lived process, so it can't run on Vercel. Host it somewhere that supports long-running Node processes — Fly.io, Railway, Render, or a VPS. Point it at the deployed frontend with the `WEB_URL` env var. No deploy config is checked in yet.

## Known TODOs / not done

- No auth on the API routes. Anyone who can reach `/api/jobs` can create/delete jobs. Fine for local dev, not for deploy.
- No job run history. The worker fires and forgets; it doesn't record success/failure.
- No per-job enable/disable toggle. To stop a job, delete it.
- No timezone handling. All cron expressions evaluate in the worker's local TZ.
- JSON file persistence isn't safe under concurrent writes. For a single local user that's fine.
- No worker deploy config checked in. See the Deploying section above for host options.
- No tests. Intentionally skipped for the initial scaffold.
