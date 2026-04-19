import { NextResponse } from "next/server";
import { listJobs, createJob, updateJobLastRun } from "@/lib/store";

// Force the route to run on the Node.js runtime so fs access works.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = listJobs();
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, cron, type, params, runOnce, markRunId, markRunAt } =
    (body as Record<string, unknown>) ?? {};

  // The worker uses POST with { markRunId, markRunAt } to record that a job ran.
  // Keeping this on POST /api/jobs (rather than a new route) keeps the surface
  // small for a teaching project. Not the most REST-ful — noted in README TODOs.
  if (typeof markRunId === "string" && typeof markRunAt === "string") {
    const ok = updateJobLastRun(markRunId, markRunAt);
    if (!ok) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (
    typeof name !== "string" ||
    typeof cron !== "string" ||
    typeof type !== "string" ||
    !name.trim() ||
    !cron.trim() ||
    !type.trim()
  ) {
    return NextResponse.json(
      { error: "name, cron, and type are required strings." },
      { status: 400 }
    );
  }

  const job = createJob({
    name,
    cron,
    type,
    params: (params as Record<string, unknown>) ?? {},
    runOnce: runOnce === true,
  });
  return NextResponse.json(job, { status: 201 });
}
