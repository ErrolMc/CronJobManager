export type Job = {
  id: string;
  name: string;
  cron: string;
  type: string;
  params: Record<string, unknown>;
  createdAt: string;
  // Last time the worker fired this job (ISO string). Used to avoid double-firing.
  lastRunAt?: string;
  // If true, the worker deletes this job after a single successful fire.
  runOnce?: boolean;
};

export type CreateJobInput = {
  name: string;
  cron: string;
  type: string;
  params: Record<string, unknown>;
  runOnce?: boolean;
};
