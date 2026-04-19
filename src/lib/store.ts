import { getSupabaseServiceClient } from "./supabase";
import type { Job, CreateJobInput } from "./types";

// Persist jobs in Supabase (Postgres).
//
// All reads/writes go through the service-role client, which bypasses RLS.
// See `supabase/migrations/0001_jobs.sql` for the schema. Postgres generates
// the `id` (uuid) and `created_at` defaults, so we only send the user-supplied
// fields on insert.

const TABLE = "jobs";

// DB row shape (snake_case, as stored in Postgres).
type JobRow = {
  id: string;
  name: string;
  cron: string;
  type: string;
  params: Record<string, unknown>;
  run_once: boolean;
  last_run_at: string | null;
  created_at: string;
};

function rowToJob(row: JobRow): Job {
  const job: Job = {
    id: row.id,
    name: row.name,
    cron: row.cron,
    type: row.type,
    params: row.params ?? {},
    createdAt: row.created_at,
    runOnce: row.run_once,
  };
  if (row.last_run_at) job.lastRunAt = row.last_run_at;
  return job;
}

export async function listJobs(): Promise<Job[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listJobs failed: ${error.message}`);
  return (data as JobRow[]).map(rowToJob);
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: input.name,
      cron: input.cron,
      type: input.type,
      params: input.params ?? {},
      run_once: input.runOnce === true,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createJob failed: ${error.message}`);
  return rowToJob(data as JobRow);
}

export async function deleteJob(id: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`deleteJob failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

export async function updateJobLastRun(id: string, when: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ last_run_at: when })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`updateJobLastRun failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}
