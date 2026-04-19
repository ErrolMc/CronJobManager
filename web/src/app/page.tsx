"use client";

import { useEffect, useState, FormEvent } from "react";
import type { Job } from "@/lib/types";

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("*/1 * * * *");
  const [type, setType] = useState("logMessage");
  const [paramsText, setParamsText] = useState('{"message": "hello from cron"}');
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = (await res.json()) as Job[];
    setJobs(data);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let params: Record<string, unknown> = {};
    if (paramsText.trim()) {
      try {
        params = JSON.parse(paramsText);
      } catch {
        setError("Params must be valid JSON.");
        return;
      }
    }

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cron, type, params }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create job.");
      return;
    }

    setName("");
    await loadJobs();
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) await loadJobs();
  }

  return (
    <main>
      <h1>CronJobManager</h1>
      <p className="lede">Configure scheduled jobs. The worker polls this app and runs them.</p>

      <h2>New job</h2>
      <form onSubmit={onSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Cron expression
          <input value={cron} onChange={(e) => setCron(e.target.value)} required />
        </label>
        <label>
          Job type
          <input value={type} onChange={(e) => setType(e.target.value)} required />
        </label>
        <label>
          Params (JSON)
          <textarea value={paramsText} onChange={(e) => setParamsText(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">Create job</button>
      </form>

      <h2>Existing jobs</h2>
      {jobs.length === 0 ? (
        <p>No jobs yet.</p>
      ) : (
        <ul className="jobs">
          {jobs.map((j) => (
            <li key={j.id}>
              <div>
                <strong>{j.name}</strong> — <code>{j.type}</code>
              </div>
              <button className="secondary" onClick={() => onDelete(j.id)}>
                Delete
              </button>
              <div className="meta">
                cron: {j.cron} · params: {JSON.stringify(j.params)}
                {j.lastRunAt ? ` · last run: ${j.lastRunAt}` : " · never run"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
