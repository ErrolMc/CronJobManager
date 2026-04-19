import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { JobHandler } from "./types.js";

// Load every .ts/.js file in worker/src/jobs/ and build a map from jobType → handler.
// Add a new job type by dropping a file in that directory — nothing else to edit.
export async function loadRegistry(jobsDir: string): Promise<Map<string, JobHandler>> {
  const registry = new Map<string, JobHandler>();

  if (!fs.existsSync(jobsDir)) {
    console.warn(`[registry] jobs directory not found: ${jobsDir}`);
    return registry;
  }

  const entries = fs.readdirSync(jobsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".js")) continue;
    const full = path.join(jobsDir, entry);
    const mod = (await import(pathToFileURL(full).href)) as Partial<JobHandler>;

    if (typeof mod.jobType !== "string" || typeof mod.handler !== "function") {
      console.warn(`[registry] skipping ${entry}: missing jobType or handler export`);
      continue;
    }

    if (registry.has(mod.jobType)) {
      console.warn(`[registry] duplicate jobType "${mod.jobType}" in ${entry}, overwriting`);
    }

    registry.set(mod.jobType, { jobType: mod.jobType, handler: mod.handler });
    console.log(`[registry] loaded job type "${mod.jobType}" from ${entry}`);
  }

  return registry;
}
