import type { JobHandler } from "../lib/types.js";

// Canonical example job type. Copy this file to add a new one:
//   1. Pick a new jobType string.
//   2. Read whatever params your handler needs off `params`.
//   3. Do the work inside `handler`.
// The registry picks it up on worker restart — no other file needs to change.

export const jobType = "logMessage";

export const handler: JobHandler["handler"] = async (params, ctx) => {
  const message = typeof params.message === "string" ? params.message : "(no message)";
  console.log(`[${ctx.job.name}] ${ctx.now.toISOString()} — ${message}`);
};
