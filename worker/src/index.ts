import path from "node:path";
import { fileURLToPath } from "node:url";
import cronParser from "cron-parser";
import { fetchJobs, markJobRun } from "./lib/api.js";
import { loadRegistry } from "./lib/registry.js";
import type { Job, JobHandler } from "./lib/types.js";

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JOBS_DIR = path.join(__dirname, "jobs");

// A job is "due" if its previous scheduled fire time (per the cron expression)
// is >= the last time we ran it. This avoids both double-firing and drift from
// using wall-clock ticks.
function isDue(job: Job, now: Date): boolean {
  let prev: Date;
  try {
    const interval = cronParser.parseExpression(job.cron, { currentDate: now });
    prev = interval.prev().toDate();
  } catch (err) {
    console.warn(`[scheduler] bad cron "${job.cron}" on job ${job.name}: ${(err as Error).message}`);
    return false;
  }

  if (!job.lastRunAt) {
    // Never run before — fire if the previous scheduled fire is within this tick window.
    // This prevents firing a one-time backlog the moment the worker boots up.
    return now.getTime() - prev.getTime() <= POLL_INTERVAL_MS;
  }

  const lastRun = new Date(job.lastRunAt);
  return prev.getTime() > lastRun.getTime();
}

async function runJob(job: Job, handler: JobHandler, now: Date): Promise<void> {
  try {
    await handler.handler(job.params, { job, now });
    await markJobRun(job.id, now);
  } catch (err) {
    console.error(`[scheduler] job "${job.name}" (${job.type}) threw:`, err);
  }
}

async function tick(registry: Map<string, JobHandler>): Promise<void> {
  let jobs: Job[];
  try {
    jobs = await fetchJobs();
  } catch (err) {
    console.error(`[scheduler] failed to fetch jobs:`, (err as Error).message);
    return;
  }

  const now = new Date();
  for (const job of jobs) {
    const handler = registry.get(job.type);
    if (!handler) {
      console.warn(`[scheduler] no handler for job type "${job.type}" (job: ${job.name})`);
      continue;
    }
    if (isDue(job, now)) {
      await runJob(job, handler, now);
    }
  }
}

async function main(): Promise<void> {
  console.log(`[worker] starting — polling every ${POLL_INTERVAL_MS}ms`);
  const registry = await loadRegistry(JOBS_DIR);
  if (registry.size === 0) {
    console.warn("[worker] no job handlers loaded; all jobs will be skipped");
  }

  // Fire one tick immediately, then on an interval.
  await tick(registry);
  setInterval(() => {
    void tick(registry);
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
