import { NextResponse } from "next/server";
import { deleteJob } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = deleteJob(params.id);
  if (!ok) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
