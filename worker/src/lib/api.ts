import type { Job } from "./types.js";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${WEB_URL}/api/jobs`, { cache: "no-store" as RequestCache });
  if (!res.ok) {
    throw new Error(`GET /api/jobs failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Job[];
}

// Tells the web app "I just ran this job" so it can persist lastRunAt.
// We reuse POST /api/jobs with a magic body shape; see web/src/app/api/jobs/route.ts.
export async function markJobRun(id: string, when: Date): Promise<void> {
  const res = await fetch(`${WEB_URL}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markRunId: id, markRunAt: when.toISOString() }),
  });
  if (!res.ok) {
    throw new Error(`markJobRun failed: ${res.status} ${res.statusText}`);
  }
}
