import { describe, it, expect } from "vitest";
import { TrackerStore } from "./store";
import type { TrackerDataset, TrackerJob } from "../tracker-import";
const makeJob = (overrides: Partial<TrackerJob> = {}): TrackerJob => ({
  id: "one",
  title: "Analyst",
  company: "Example",
  location: "Vancouver",
  url: "https://example.com/job/1",
  references: [{ sheet: "BC", row: 2, trackerStatus: "To apply" }],
  descriptions: [],
  fetchStatus: "not_checked",
  ...overrides,
});
const dataset = (jobs: TrackerJob[]): TrackerDataset => ({
  format: "align-tracker-v1",
  generatedAt: "2026-01-01",
  jobs,
});
describe("persistent tracker imports", () => {
  it("merges the same URL without discarding older status, descriptions or saved state", () => {
    const store = new TrackerStore(":memory:");
    const old = makeJob({
      descriptions: [
        { text: "Original text", source: "source", truncated: false },
      ],
    });
    expect(store.merge(dataset([old])).added).toBe(1);
    const id = store.list().jobs[0].id;
    store.setSaved(id, true);
    const changed = makeJob({
      id: "different-format",
      references: [{ sheet: "BC", row: 2, trackerStatus: "Applied" }],
    });
    expect(store.merge(dataset([changed])).updated).toBe(1);
    const data = store.list();
    expect(data.jobs).toHaveLength(1);
    expect(data.saved).toEqual([id]);
    expect(data.jobs[0].references.map((x) => x.trackerStatus)).toEqual([
      "To apply",
      "Applied",
    ]);
    expect(data.jobs[0].descriptions[0].text).toBe("Original text");
    expect(store.merge(dataset([changed])).updated).toBe(0);
    store.close();
  });
  it("keeps unrelated jobs when a later spreadsheet is imported", () => {
    const store = new TrackerStore(":memory:");
    store.merge(dataset([makeJob()]));
    store.merge(
      dataset([
        makeJob({
          id: "two",
          url: "https://example.com/job/2",
          title: "Manager",
        }),
      ]),
    );
    expect(store.list().jobs).toHaveLength(2);
    store.close();
  });
  it("does not overwrite distinct no-URL records when spreadsheet rows change", () => {
    const store = new TrackerStore(":memory:");
    store.merge(
      dataset([makeJob({ url: "", id: "row:BC:2", title: "Analyst" })]),
    );
    store.merge(
      dataset([makeJob({ url: "", id: "row:BC:2", title: "Manager" })]),
    );
    expect(store.list().jobs).toHaveLength(2);
    store.close();
  });
});

it("restores saved bookmarks from a backup without duplicating no-URL jobs", () => {
  const source = new TrackerStore(":memory:");
  source.merge(dataset([makeJob({ url: "", id: "row:BC:9" })]));
  const id = source.list().jobs[0].id;
  source.setSaved(id, true);
  const backup = source.list();
  const target = new TrackerStore(":memory:");
  target.merge(backup);
  expect(target.list().saved).toEqual([id]);
  expect(target.list().jobs).toHaveLength(1);
  target.merge(backup);
  expect(target.list().jobs).toHaveLength(1);
  source.close();
  target.close();
});

it("persists records and bookmarks across a closed and reopened database", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const dir = mkdtempSync(path.join(tmpdir(), "align-store-test-"));
  const file = path.join(dir, "tracker.sqlite");
  try {
    const first = new TrackerStore(file);
    first.merge(dataset([makeJob()]));
    const id = first.list().jobs[0].id;
    first.setSaved(id, true);
    first.close();
    const reopened = new TrackerStore(file);
    expect(reopened.list().jobs).toHaveLength(1);
    expect(reopened.list().saved).toEqual([id]);
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
