"use client";
import Link from "next/link";
import { Bookmark, MapPin, Sparkles } from "lucide-react";
import type { Preferences } from "@/lib/jobs";
import {
  matchesTrackerPreferences,
  recordedRatings,
  trackerArrangements,
} from "@/lib/tracker-filters";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  readTrackerDataset,
  safePostingLink,
  type TrackerDataset,
  type TrackerJob,
} from "@/lib/tracker-import";
const PAGE_SIZE = 25;
export function TrackerBrowser({
  embedded = false,
  preferences,
}: {
  embedded?: boolean;
  preferences?: Preferences;
}) {
  const Container = embedded ? "div" : "main";
  const [dataset, setDataset] = useState<TrackerDataset | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyText, setOnlyText] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TrackerJob | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [rating, setRating] = useState("All recorded ratings");
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
        (!onlySaved || saved.includes(job.id)) &&
        (rating === "All recorded ratings" ||
          recordedRatings(job).some(
            (value) => value.toLowerCase() === rating.toLowerCase(),
          )) &&
        (!preferences ||
          matchesTrackerPreferences(job, preferences, includeUnknown)) &&
        [
          job.company,
          job.title,
          job.location,
          ...job.references.map((ref) => ref.location || ""),
        ].some((x) => x.toLowerCase().includes(term)),
    );
  }, [
    dataset,
    query,
    onlyText,
    onlySaved,
    saved,
    rating,
    preferences,
    includeUnknown,
  ]);
  const filterKey = JSON.stringify({
    preferences,
    query,
    onlyText,
    onlySaved,
    rating,
    includeUnknown,
  });
  const [pageKey, setPageKey] = useState("");
  const activePage =
    pageKey === filterKey
      ? Math.min(page, Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1))
      : 0;
  function goPage(next: number) {
    setPageKey(filterKey);
    setPage(next);
  }
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
        setSaved([]);
        setOnlySaved(false);
        setRating("All recorded ratings");
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
      setSaved([]);
      setOnlySaved(false);
      setRating("All recorded ratings");
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
              setSaved([]);
              setOnlySaved(false);
              setRating("All recorded ratings");
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
          <div className="results-toolbar">
            <div className="result-tabs">
              <button
                className={!onlySaved ? "active" : ""}
                onClick={() => {
                  setOnlySaved(false);
                  setPage(0);
                }}
              >
                All opportunities <span>{dataset.jobs.length}</span>
              </button>
              <button
                className={onlySaved ? "active" : ""}
                onClick={() => {
                  setOnlySaved(true);
                  setPage(0);
                }}
              >
                Saved <span>{saved.length}</span>
              </button>
            </div>
            <span className="sort-label">Tracker order</span>
          </div>
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
            <label>
              Recorded fit{" "}
              <select
                aria-label="Recorded fit"
                value={rating}
                onChange={(event) => {
                  setRating(event.target.value);
                  setPage(0);
                }}
              >
                {[
                  "All recorded ratings",
                  "Fit",
                  "Consider",
                  "Investigate",
                  "Weak Fit",
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
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
          {embedded && (
            <label className="tracker-check">
              <input
                type="checkbox"
                checked={includeUnknown}
                onChange={(event) => setIncludeUnknown(event.target.checked)}
              />{" "}
              Include unknown work arrangement or salary
            </label>
          )}
          <p className="tracker-count" role="status">
            {results.length} entries ·{" "}
            {dataset.jobs.filter((j) => j.descriptions.length > 0).length} with
            recovered or cached text · imported{" "}
            {new Date(dataset.generatedAt).toLocaleDateString()}
          </p>
          {embedded && (
            <p className="small muted">
              The preferences on the left filter these jobs. Unknown work
              arrangements and unclear annual CAD salaries are included by
              default when those filters are active. Fit labels are past tracker
              ratings, not new resume evaluations.
            </p>
          )}
          <p className="small muted">
            Entries are grouped only by identical posting URLs. Links without a
            URL remain separate; different URLs may still represent the same
            vacancy. Tracker statuses are historical and may differ across
            copies.
          </p>
          <div className="job-list">
            {results
              .slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE)
              .map((job) => (
                <article className="job-card tracker-card" key={job.id}>
                  <div className="job-top">
                    <span className="company-logo mint">
                      {job.company.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="job-identity">
                      <span>{job.company}</span>
                      <h2>
                        <button onClick={() => setSelected(job)}>
                          {job.title}
                        </button>
                      </h2>
                    </div>
                    <button
                      className={`bookmark ${saved.includes(job.id) ? "is-saved" : ""}`}
                      aria-label={`${saved.includes(job.id) ? "Unsave" : "Save"} ${job.title}`}
                      aria-pressed={saved.includes(job.id)}
                      onClick={() =>
                        setSaved(
                          saved.includes(job.id)
                            ? saved.filter((id) => id !== job.id)
                            : [...saved, job.id],
                        )
                      }
                    >
                      <Bookmark
                        size={19}
                        fill={saved.includes(job.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <div className="job-meta">
                    <span>
                      <MapPin size={14} />
                      {job.location || "Location unknown"}
                    </span>
                    <span>
                      {trackerArrangements(job).join(" / ") ||
                        "Work arrangement unknown"}
                    </span>
                    <span>
                      {[
                        ...new Set(
                          job.references
                            .map((ref) => ref.salary)
                            .filter(Boolean),
                        ),
                      ].join(" / ") || "Salary unknown"}
                    </span>
                  </div>
                  <div className="job-fit">
                    <div>
                      <strong>
                        <Sparkles size={16} />
                        {recordedRatings(job).length === 1
                          ? `Recorded: ${recordedRatings(job)[0]}`
                          : recordedRatings(job).length > 1
                            ? "Conflicting recorded ratings"
                            : "Not evaluated"}
                      </strong>
                      <p>
                        {recordedRatings(job).length
                          ? "Historical tracker rating; not a new resume evaluation."
                          : "No historical fit rating recorded."}
                      </p>
                    </div>
                  </div>
                  {job.references.find((ref) => ref.notes)?.notes && (
                    <p className="tracker-note">
                      <strong>Recorded note:</strong>{" "}
                      {job.references
                        .find((ref) => ref.notes)!
                        .notes!.slice(0, 300)}
                      {job.references.find((ref) => ref.notes)!.notes!.length >
                      300
                        ? "…"
                        : ""}
                    </p>
                  )}
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
              disabled={activePage === 0}
              onClick={() => goPage(activePage - 1)}
            >
              Previous
            </button>
            <span>
              Page {results.length ? activePage + 1 : 0} of{" "}
              {Math.ceil(results.length / PAGE_SIZE)}
            </span>
            <button
              className="button secondary"
              disabled={(activePage + 1) * PAGE_SIZE >= results.length}
              onClick={() => goPage(activePage + 1)}
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
              {ref.notes && (
                <>
                  <br />
                  Recorded note: {ref.notes}
                </>
              )}
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
