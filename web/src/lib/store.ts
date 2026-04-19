import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Job, CreateJobInput } from "./types";

// Persist jobs to a single JSON file next to the repo root.
// Simple and readable; not safe for concurrent writes, but fine for local dev.
const DATA_DIR = path.join(process.cwd(), "..", "data");
const DATA_FILE = path.join(DATA_DIR, "jobs.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readAll(): Job[] {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Job[]) : [];
  } catch {
    return [];
  }
}

function writeAll(jobs: Job[]): void {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2), "utf8");
}

export function listJobs(): Job[] {
  return readAll();
}

export function createJob(input: CreateJobInput): Job {
  const jobs = readAll();
  const job: Job = {
    id: randomUUID(),
    name: input.name,
    cron: input.cron,
    type: input.type,
    params: input.params ?? {},
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  writeAll(jobs);
  return job;
}

export function deleteJob(id: string): boolean {
  const jobs = readAll();
  const next = jobs.filter((j) => j.id !== id);
  if (next.length === jobs.length) return false;
  writeAll(next);
  return true;
}

export function updateJobLastRun(id: string, when: string): boolean {
  const jobs = readAll();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return false;
  jobs[idx].lastRunAt = when;
  writeAll(jobs);
  return true;
}
