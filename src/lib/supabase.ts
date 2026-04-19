import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Two Supabase clients for the Next.js side:
//
// - Anon client: safe to use from server components or API routes when you
//   only need the public, row-level-security-bound access. Also the one you'd
//   ship to the browser if we ever do that.
// - Service-role client: server-only. Bypasses RLS. Use this from API routes
//   that need to read/write on behalf of the user without auth checks.
//
// Values come from env. We read them lazily so that importing this module
// doesn't crash at build time if one of them is missing — the error only
// fires when a caller actually tries to use the client.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient {
  if (!anonClient) {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const key = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    anonClient = createClient(url, key);
  }
  return anonClient;
}

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    serviceClient = createClient(url, key, {
      auth: {
        // Server-side only: no session persistence or auto-refresh.
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
