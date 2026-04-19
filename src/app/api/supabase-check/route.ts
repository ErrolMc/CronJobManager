import { NextResponse } from "next/server";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/supabase";

// Diagnostic health-check for the Supabase wiring on a deployed environment.
//
// What this proves:
// - Required env vars are present on the server that ran this request.
// - The anon client can talk to Supabase (auth endpoint responds).
// - The service-role client can authenticate against Supabase (PostgREST
//   responds — we probe a nonexistent table and treat "table not found" as
//   success, because that means URL + key were accepted).
//
// This route intentionally never returns key values, only booleans and
// sanitized error strings. It is a diagnostic route — consider removing it
// or putting it behind a secret header before shipping a public build.

// Must run server-side on Node and never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientStatus = string; // "ok" | "ok (no tables yet)" | "error: ..."

function sanitizeError(err: unknown): string {
  if (err instanceof Error) return `error: ${err.message}`;
  if (typeof err === "string") return `error: ${err}`;
  try {
    return `error: ${JSON.stringify(err)}`;
  } catch {
    return "error: unknown";
  }
}

// Postgres error code for "relation does not exist".
const PG_UNDEFINED_TABLE = "42P01";

async function checkAnonClient(): Promise<ClientStatus> {
  try {
    const supabase = getSupabaseAnonClient();
    const { error } = await supabase.auth.getSession();
    if (error) return `error: ${error.message}`;
    return "ok";
  } catch (err) {
    return sanitizeError(err);
  }
}

async function checkServiceClient(): Promise<ClientStatus> {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("_nonexistent_")
      .select("*")
      .limit(1);

    if (!error) {
      // Extremely unlikely: a table literally named `_nonexistent_` exists.
      // Still a successful round-trip, so treat as ok.
      return "ok";
    }

    // "Table does not exist" means URL + service key were accepted by
    // PostgREST — the request reached Supabase and authenticated.
    if (error.code === PG_UNDEFINED_TABLE) {
      return "ok (no tables yet)";
    }

    // Some Supabase/PostgREST versions surface the missing-table case
    // without a pg code. Fall back to a message check.
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("does not exist") || msg.includes("not found")) {
      return "ok (no tables yet)";
    }

    return `error: ${error.message}`;
  } catch (err) {
    return sanitizeError(err);
  }
}

export async function GET() {
  const env = {
    url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  // Only attempt client calls if the corresponding env vars are present —
  // otherwise the lazy `requireEnv` throw would just noisily duplicate the
  // env booleans above.
  const anonClient: ClientStatus =
    env.url && env.anon
      ? await checkAnonClient()
      : "error: missing env (url or anon key)";

  const serviceClient: ClientStatus =
    env.url && env.service
      ? await checkServiceClient()
      : "error: missing env (url or service role key)";

  return NextResponse.json({ env, anonClient, serviceClient });
}
