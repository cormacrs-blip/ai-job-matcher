import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { TrackerDataset, TrackerJob } from "../tracker-import";

/** Single-user private workspace storage. No resume text or uploaded files are stored here. */
export class TrackerStore {
  private db: DatabaseSync;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:")
      mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, data TEXT NOT NULL, saved INTEGER NOT NULL DEFAULT 0, added INTEGER NOT NULL);",
    );
  }
  close() {
    this.db.close();
  }
  list() {
    const rows = this.db
      .prepare("SELECT id,data,saved FROM jobs ORDER BY added, rowid")
      .all() as { id: string; data: string; saved: number }[];
    return {
      format: "align-tracker-v1" as const,
      generatedAt: new Date().toISOString(),
      jobs: rows.map((row) => JSON.parse(row.data) as TrackerJob),
      saved: rows.filter((row) => row.saved).map((row) => row.id),
    };
  }
  merge(dataset: TrackerDataset) {
    const get = this.db.prepare("SELECT data FROM jobs WHERE id=?");
    const insert = this.db.prepare(
      "INSERT INTO jobs(id,data,added) VALUES(?,?,?)",
    );
    const update = this.db.prepare("UPDATE jobs SET data=? WHERE id=?");
    let added = 0,
      updated = 0;
    const backupSaved = new Set(dataset.saved || []);
    const markSaved = this.db.prepare("UPDATE jobs SET saved=1 WHERE id=?");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const incoming of dataset.jobs) {
        // Exact posting URL is the only cross-import identity. No-URL records use their original
        // row ID and a content identity to avoid silently replacing a different row in a later file.
        const identity = createHash("sha256")
          .update(
            JSON.stringify([
              incoming.company,
              incoming.title,
              incoming.location,
            ]),
          )
          .digest("hex")
          .slice(0, 16);
        const id = incoming.url
          ? `url:${incoming.url}`
          : incoming.id.startsWith("no-url:")
            ? incoming.id
            : `no-url:${incoming.id}:${identity}`;
        const current = get.get(id) as { data: string } | undefined;
        if (!current) {
          insert.run(id, JSON.stringify({ ...incoming, id }), Date.now());
          added++;
          if (backupSaved.has(incoming.id)) markSaved.run(id);
          continue;
        }
        if (backupSaved.has(incoming.id)) markSaved.run(id);
        const previous = JSON.parse(current.data) as TrackerJob;
        const unique = <T>(values: T[]) => [
          ...new Map(
            values.map((value) => [JSON.stringify(value), value]),
          ).values(),
        ];
        const merged: TrackerJob = {
          ...previous,
          references: unique([...previous.references, ...incoming.references]),
          descriptions: unique([
            ...previous.descriptions,
            ...incoming.descriptions,
          ]),
          fetchStatus: incoming.descriptions.length
            ? incoming.fetchStatus
            : previous.fetchStatus,
        };
        const next = JSON.stringify(merged);
        if (next !== current.data) {
          update.run(next, id);
          updated++;
        }
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { added, updated, total: this.list().jobs.length };
  }
  setSaved(id: string, saved: boolean) {
    return (
      Number(
        this.db
          .prepare("UPDATE jobs SET saved=? WHERE id=?")
          .run(saved ? 1 : 0, id).changes,
      ) > 0
    );
  }
}
export function getTrackerStore() {
  const singleton = globalThis as typeof globalThis & {
    __alignTrackerStore?: TrackerStore;
  };
  if (!singleton.__alignTrackerStore) {
    const dir =
      process.env.ALIGN_DATA_DIR || path.join(process.cwd(), ".align-data");
    singleton.__alignTrackerStore = new TrackerStore(
      path.join(dir, "tracker.sqlite"),
    );
  }
  return singleton.__alignTrackerStore;
}
