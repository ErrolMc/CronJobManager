export type Job = {
  id: string;
  name: string;
  cron: string;
  type: string;
  params: Record<string, unknown>;
  createdAt: string;
  lastRunAt?: string;
};

// Every handler module in worker/src/jobs/ exports this shape.
export type JobHandler = {
  jobType: string;
  handler: (params: Record<string, unknown>, ctx: HandlerContext) => Promise<void> | void;
};

export type HandlerContext = {
  job: Job;
  now: Date;
};
