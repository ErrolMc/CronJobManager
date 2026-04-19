import { NextResponse } from "next/server";
import { listJobs, createJob, updateJobLastRun } from "@/lib/store";

// Run on the Node.js runtime (service-role key, Supabase client) and never
// statically cache — the job list is always per-request fresh.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json(jobs);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
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
    try {
      const ok = await updateJobLastRun(markRunId, markRunAt);
      if (!ok) return NextResponse.json({ error: "Job not found." }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
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

  try {
    const job = await createJob({
      name,
      cron,
      type,
      params: (params as Record<string, unknown>) ?? {},
      runOnce: runOnce === true,
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
