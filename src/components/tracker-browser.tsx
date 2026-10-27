"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  readTrackerDataset,
  safePostingLink,
  type TrackerDataset,
  type TrackerJob,
} from "@/lib/tracker-import";
const PAGE_SIZE = 25;
export function TrackerBrowser({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? "div" : "main";
  const [dataset, setDataset] = useState<TrackerDataset | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyText, setOnlyText] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TrackerJob | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const readerSequence = useRef(0);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (dataset?.jobs || []).filter(
      (job) =>
        (!onlyText || job.descriptions.length > 0) &&
        [job.company, job.title, job.location].some((x) =>
          x.toLowerCase().includes(term),
        ),
    );
  }, [dataset, query, onlyText]);
  async function load(file?: File) {
    if (!file) return;
    const current = ++readerSequence.current;
    setError("");
    if (file.size > 50 * 1024 * 1024) {
      setError("The tracker file exceeds the 50 MB import limit.");
      return;
    }
    try {
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("The spreadsheet exceeds the 10 MB limit.");
        const { readTrackerSpreadsheet } =
          await import("@/lib/tracker-spreadsheet");
        const data = await readTrackerSpreadsheet(await file.arrayBuffer());
        if (current !== readerSequence.current) return;
        setDataset(data);
        setQuery("");
        setOnlyText(false);
        setPage(0);
        return;
      }
      let text: string;
      if (file.name.toLowerCase().endsWith(".gz")) {
        const stream = file
          .stream()
          .pipeThrough(new DecompressionStream("gzip"));
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 50 * 1024 * 1024) {
            await reader.cancel();
            throw new Error(
              "The decompressed tracker file exceeds the 50 MB import limit.",
            );
          }
          chunks.push(value);
        }
        text = await new Blob(chunks as BlobPart[]).text();
      } else text = await file.text();
      const data = readTrackerDataset(text);
      if (current !== readerSequence.current) return;
      setDataset(data);
      setQuery("");
      setOnlyText(false);
      setPage(0);
    } catch (e) {
      if (current === readerSequence.current)
        setError(e instanceof Error ? e.message : "Unable to read that file.");
    }
  }
  return (
    <Container className={embedded ? "tracker-embedded" : "dashboard shell"}>
      {!embedded && (
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">YOUR TRACKER</span>
            <h1>Explore your saved jobs.</h1>
            <p>Browse imported tracker entries and recovered posting text.</p>
          </div>
          <Link className="button secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      )}
      <div className="dashboard-disclaimer">
        <p>
          <strong>Private browser import.</strong> Your file is read in this
          browser, not uploaded to Align or committed to GitHub. Closing or
          refreshing this tab clears it. Availability, completeness, and older
          tracker assessments have not been reverified.
        </p>
      </div>
      <section className="panel tracker-upload">
        <label htmlFor="tracker-file">
          Choose your tracker spreadsheet or recovered Align file
        </label>
        <input
          id="tracker-file"
          type="file"
          accept=".xlsx,.json,.gz,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,application/gzip"
          onChange={(event) => {
            void load(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <p className="small muted">
          Select your original .xlsx spreadsheet or a recovered JSON file. The
          spreadsheet is read in this browser and is not modified. This import
          includes only text already saved inside the spreadsheet; it does not
          fetch job websites.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {dataset && (
          <button
            className="button secondary"
            onClick={() => {
              readerSequence.current++;
              setDataset(null);
              setSelected(null);
              setError("");
            }}
          >
            Clear imported data
          </button>
        )}
      </section>
      {dataset && (
        <section className="tracker-results">
          <div className="tracker-controls">
            <label>
              Search company, title or location
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="e.g. Product Manager"
              />
            </label>
            <label className="tracker-check">
              <input
                type="checkbox"
                checked={onlyText}
                onChange={(e) => {
                  setOnlyText(e.target.checked);
                  setPage(0);
                }}
              />{" "}
              Only jobs with recovered text
            </label>
          </div>
          <p className="tracker-count" role="status">
            {results.length} entries ·{" "}
            {dataset.jobs.filter((j) => j.descriptions.length > 0).length} with
            recovered or cached text · imported{" "}
            {new Date(dataset.generatedAt).toLocaleDateString()}
          </p>
          <p className="small muted">
            Entries are grouped only by identical posting URLs. Links without a
            URL remain separate; different URLs may still represent the same
            vacancy. Tracker statuses are historical and may differ across
            copies.
          </p>
          <div className="job-list">
            {results
              .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
              .map((job) => (
                <article className="job-card tracker-card" key={job.id}>
                  <h2>{job.title}</h2>
                  <p>
                    {job.company} · {job.location || "Location unknown"}
                  </p>
                  <p>
                    {job.descriptions.length
                      ? `${job.descriptions.length} text source${job.descriptions.length === 1 ? "" : "s"} available — completeness unverified`
                      : "Full text not recovered"}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => setSelected(job)}
                  >
                    View job and sources
                  </button>
                </article>
              ))}
          </div>
          {results.length === 0 && <p>No jobs match these filters.</p>}
          <div className="tracker-pagination">
            <button
              className="button secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {results.length ? page + 1 : 0} of{" "}
              {Math.ceil(results.length / PAGE_SIZE)}
            </span>
            <button
              className="button secondary"
              disabled={(page + 1) * PAGE_SIZE >= results.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
      {selected && (
        <dialog
          ref={dialog}
          className="role-modal tracker-dialog"
          aria-labelledby="tracker-title"
          onCancel={() => setSelected(null)}
        >
          <button
            autoFocus
            className="modal-close"
            aria-label="Close job details"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <span className="eyebrow">IMPORTED TRACKER RECORD</span>
          <h2 id="tracker-title">{selected.title}</h2>
          <p>
            {selected.company} · {selected.location || "Location unknown"}
          </p>
          {safePostingLink(selected.url) && (
            <p>
              <a
                className="tracker-link"
                href={safePostingLink(selected.url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original posting ↗
              </a>
            </p>
          )}
          <h3>Tracker history</h3>
          {selected.references.map((ref, i) => (
            <p key={`${ref.sheet}-${ref.row}-${i}`}>
              {ref.sheet}, row {ref.row}
              {ref.trackerStatus ? ` · Status: ${ref.trackerStatus}` : ""}
              {ref.recordedFit ? ` · Recorded fit: ${ref.recordedFit}` : ""}
            </p>
          ))}
          <p>
            These are past tracker records, not fresh evaluations or proof that
            this vacancy remains open.
          </p>
          <h3>Recovered text</h3>
          {selected.descriptions.length ? (
            selected.descriptions.map((desc, i) => (
              <section key={i} className="recovered-source">
                <p>
                  <strong>Source:</strong> {desc.source}
                  {desc.retrievedAt ? ` · ${desc.retrievedAt}` : ""}
                  {desc.truncated ? " · Truncated" : ""}
                </p>
                <p>
                  Completeness and current vacancy status are unverified. Page
                  text may contain unrelated material.
                </p>
                <pre>{desc.text}</pre>
              </section>
            ))
          ) : (
            <p>
              Posting text could not be recovered. Fetch result:{" "}
              {selected.fetchStatus.replaceAll("_", " ")}.
            </p>
          )}
          <button className="button primary" onClick={() => setSelected(null)}>
            Back to jobs
          </button>
        </dialog>
      )}
    </Container>
  );
}
