"use client";
import Link from "next/link";
import { Bookmark, MapPin, Sparkles } from "lucide-react";
import type { Preferences } from "@/lib/jobs";
import type { Profile, Assessment } from "@/lib/matching/evaluator";
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
  profile = null,
}: {
  embedded?: boolean;
  preferences?: Preferences;
  profile?: Profile | null;
}) {
  const Container = embedded ? "div" : "main";
  const [dataset, setDataset] = useState<TrackerDataset | null>(null);
  const [error, setError] = useState("");
  const [loadingStore, setLoadingStore] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [onlyText, setOnlyText] = useState(false);
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TrackerJob | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [rating, setRating] = useState("All recorded ratings");
  const [assessments, setAssessments] = useState<
    Record<string, { profile: Profile; assessment: Assessment }>
  >({});
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    running: false,
  });
  const [evaluationError, setEvaluationError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!profile || !dataset) return;
    const resume = profile;
    const jobs = dataset.jobs;
    async function run() {
      setAssessments({});
      setEvaluationError("");
      setProgress({ done: 0, total: jobs.length, running: true });
      for (let i = 0; i < jobs.length; i++) {
        try {
          const response = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: jobs[i].id, resume: resume.text }),
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Evaluation failed.");
          if (controller.signal.aborted) return;
          setAssessments((previous) => ({
            ...previous,
            [jobs[i].id]: { profile: resume, assessment: data.assessment },
          }));
          setProgress({
            done: i + 1,
            total: jobs.length,
            running: i + 1 < jobs.length,
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          setEvaluationError(
            error instanceof Error ? error.message : "Evaluation failed.",
          );
          setProgress({ done: i, total: jobs.length, running: false });
          return;
        }
      }
      if (!controller.signal.aborted)
        setProgress({ done: jobs.length, total: jobs.length, running: false });
    }
    void run();
    return () => controller.abort();
  }, [profile, dataset, retry]);
  const dialog = useRef<HTMLDialogElement>(null);
  const readerSequence = useRef(0);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tracker", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your saved jobs.");
        return response.json();
      })
      .then((data) => {
        const validated = readTrackerDataset(JSON.stringify(data));
        setDataset(validated);
        setSaved(Array.isArray(data.saved) ? data.saved : []);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load saved jobs.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStore(false);
      });
    return () => controller.abort();
  }, []);
  async function persistImport(data: TrackerDataset) {
    const response = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Unable to save the imported jobs.");
    setDataset(readTrackerDataset(JSON.stringify(result)));
    setSaved(result.saved || []);
    setImportMessage(
      `Imported ${result.summary.added} new jobs and updated ${result.summary.updated}. Your previous jobs are still saved.`,
    );
    setOnlySaved(false);
    setRating("All recorded ratings");
    setQuery("");
    setOnlyText(false);
    setPage(0);
  }
  function downloadBackup() {
    if (!dataset) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ ...dataset, saved })], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "align-saved-jobs.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function toggleSaved(job: TrackerJob) {
    if (savingIds.includes(job.id)) return;
    const newValue = !saved.includes(job.id);
    setSavingIds((ids) => [...ids, job.id]);
    setError("");
    try {
      const response = await fetch("/api/tracker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, saved: newValue }),
      });
      if (!response.ok)
        throw new Error("Unable to save this bookmark. Please try again.");
      setSaved((ids) =>
        newValue ? [...ids, job.id] : ids.filter((id) => id !== job.id),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save this bookmark.",
      );
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== job.id));
    }
  }

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
    setImportMessage("");
    if (file.size > 50 * 1024 * 1024) {
      setError("The tracker file exceeds the 50 MB import limit.");
      return;
    }
    setImporting(true);
    try {
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("The spreadsheet exceeds the 10 MB limit.");
        const { readTrackerSpreadsheet } =
          await import("@/lib/tracker-spreadsheet");
        const data = await readTrackerSpreadsheet(await file.arrayBuffer());
        if (current !== readerSequence.current) return;
        await persistImport(data);
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
      await persistImport(data);
    } catch (e) {
      if (current === readerSequence.current)
        setError(e instanceof Error ? e.message : "Unable to read that file.");
    } finally {
      if (current === readerSequence.current) setImporting(false);
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
          <strong>Saved in your Codespace.</strong> Imported jobs and bookmarks
          are stored on this workspace’s disk and return when you reopen the
          app. Keep the Codespace port private: anyone with access to this app
          can see the saved jobs. The original spreadsheet and resume files are
          not saved. Vacancy status and historical ratings are not reverified.
        </p>
      </div>
      <section className="panel tracker-upload">
        {profile && (
          <p role="status" aria-live="polite">
            {progress.running ? "Evaluating with Codex" : "Evaluation progress"}
            : {progress.done} of {progress.total} imported jobs. Resume and job
            text are sent to OpenAI. Vacancy availability is unverified.
          </p>
        )}
        {profile && (
          <progress
            aria-label="Job evaluation progress"
            value={progress.done}
            max={progress.total || 1}
          />
        )}
        {evaluationError && (
          <div role="alert">
            <p>{evaluationError}</p>
            <button
              className="button secondary"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry evaluations
            </button>
          </div>
        )}

        <label htmlFor="tracker-file">
          Choose your tracker spreadsheet or recovered Align file
        </label>
        <input
          id="tracker-file"
          type="file"
          accept=".xlsx,.json,.gz,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,application/gzip"
          disabled={loadingStore || importing}
          onChange={(event) => {
            void load(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <p className="small muted">
          Select your original .xlsx spreadsheet or a recovered JSON file. The
          spreadsheet is read in this browser and is not modified. Its job
          records are sent to this app and saved in your Codespace. Later
          imports add or update records without removing existing jobs. No job
          websites are fetched.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {dataset && dataset.jobs.length > 0 && (
          <button className="button secondary" onClick={downloadBackup}>
            Download jobs backup
          </button>
        )}
        {loadingStore && <p role="status">Loading saved jobs…</p>}
        {importing && <p role="status">Importing and saving jobs…</p>}
        {importMessage && <p aria-live="polite">{importMessage}</p>}
      </section>
      {dataset && dataset.jobs.length > 0 && (
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
              default when those filters are active. New labels use the selected
              resume; recorded labels are historical.
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
                      disabled={savingIds.includes(job.id)}
                      onClick={() => void toggleSaved(job)}
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
                        {assessments[job.id]?.profile === profile &&
                        profile &&
                        assessments[job.id]?.assessment
                          ? `New: ${assessments[job.id].assessment!.status}`
                          : profile
                            ? "Queued for evaluation"
                            : recordedRatings(job).length === 1
                              ? `Recorded: ${recordedRatings(job)[0]}`
                              : recordedRatings(job).length > 1
                                ? "Conflicting recorded ratings"
                                : "Not evaluated"}
                      </strong>
                      <p>
                        {assessments[job.id]?.profile === profile &&
                        profile &&
                        assessments[job.id]?.assessment
                          ? assessments[job.id].assessment!.reason
                          : profile
                            ? "Awaiting Codex evaluation for this resume."
                            : recordedRatings(job).length
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
          {profile && assessments[selected.id]?.profile === profile && (
            <section>
              <h3>{assessments[selected.id].assessment.status}</h3>
              <p>{assessments[selected.id].assessment.reason}</p>
              <p>{assessments[selected.id].assessment.question}</p>
              {assessments[selected.id].assessment.rows.map((row) => (
                <p key={row.key}>
                  <strong>
                    {row.label}: {row.level}
                  </strong>{" "}
                  {row.quote}
                </p>
              ))}
            </section>
          )}
          <button className="button primary" onClick={() => setSelected(null)}>
            Back to jobs
          </button>
        </dialog>
      )}
    </Container>
  );
}
