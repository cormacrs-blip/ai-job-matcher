"use client";
import Link from "next/link";
import {
  Bookmark,
  BriefcaseBusiness,
  CircleDollarSign,
  House,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { Preferences } from "@/lib/jobs";
import type { Profile, Assessment } from "@/lib/matching/evaluator";
import {
  matchesTrackerPreferences,
  recordedRatings,
} from "@/lib/tracker-filters";
import { trackerCardDetails } from "@/lib/tracker-card";
import { formatJobDescription } from "@/lib/job-description";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  model = "standard",
}: {
  embedded?: boolean;
  preferences?: Preferences;
  profile?: Profile | null;
  model?: "fast" | "standard";
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
  const completedRef = useRef<{
    profile: Profile;
    dataset: TrackerDataset;
    model: "fast" | "standard";
    results: Record<string, Assessment>;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (!profile || !dataset) {
      completedRef.current = null;
      return;
    }
    const resume = profile;
    const jobs = dataset.jobs;
    if (
      completedRef.current?.profile !== profile ||
      completedRef.current?.dataset !== dataset ||
      completedRef.current?.model !== model
    ) {
      completedRef.current = { profile, dataset, model, results: {} };
      setAssessments({});
    }
    const completed = completedRef.current;
    async function run() {
      setEvaluationError("");
      setProgress({
        done: Object.keys(completed.results).length,
        total: jobs.length,
        running: true,
      });
      for (let i = 0; i < jobs.length; i++) {
        if (completed.results[jobs[i].id]) continue;
        try {
          const response = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: jobs[i].id,
              resume: resume.text,
              model,
            }),
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Evaluation failed.");
          if (controller.signal.aborted) return;
          completed.results[jobs[i].id] = data.assessment;
          setAssessments((previous) => ({
            ...previous,
            [jobs[i].id]: { profile: resume, assessment: data.assessment },
          }));
          setProgress({
            done: Object.keys(completed.results).length,
            total: jobs.length,
            running: i + 1 < jobs.length,
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          setEvaluationError(
            error instanceof Error ? error.message : "Evaluation failed.",
          );
          setProgress({
            done: Object.keys(completed.results).length,
            total: jobs.length,
            running: false,
          });
          return;
        }
      }
      if (!controller.signal.aborted)
        setProgress({ done: jobs.length, total: jobs.length, running: false });
    }
    void run();
    return () => controller.abort();
  }, [profile, dataset, retry, model]);
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
  const trackerManagement = (
    <details
      className="tracker-management"
      open={!dataset?.jobs.length || undefined}
    >
      <summary>Import or back up jobs</summary>
      <section className="panel tracker-upload">
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
    </details>
  );
  const trackerFilters = (
    <div className="tracker-filter-panel">
      <div className="tracker-controls">
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
    </div>
  );
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
      {!embedded && (
        <div className="dashboard-disclaimer">
          <p>
            <strong>Saved in your Codespace.</strong> Imported jobs and
            bookmarks are stored on this workspace’s disk and return when you
            reopen the app. Keep the Codespace port private: anyone with access
            to this app can see the saved jobs. The original spreadsheet and
            resume files are not saved. Vacancy status and historical ratings
            are not reverified.
          </p>
        </div>
      )}
      {profile &&
        (embedded &&
        typeof document !== "undefined" &&
        document.getElementById("evaluation-progress") ? (
          createPortal(
            <div className="evaluation-progress">
              <p role="status" aria-live="polite">
                {progress.running
                  ? "Evaluating with Codex"
                  : "Evaluation progress"}
                : {progress.done} of {progress.total} jobs
              </p>
              <progress
                aria-label="Job evaluation progress"
                value={progress.done}
                max={progress.total || 1}
              />
              {evaluationError && (
                <div role="alert">
                  <p>{evaluationError}</p>
                  <button
                    className="reset-button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry evaluations
                  </button>
                </div>
              )}
            </div>,
            document.getElementById("evaluation-progress")!,
          )
        ) : !embedded ? (
          <div className="evaluation-progress">
            <p role="status">
              {progress.done} of {progress.total} jobs evaluated
            </p>
            <progress
              aria-label="Job evaluation progress"
              value={progress.done}
              max={progress.total || 1}
            />
          </div>
        ) : null)}
      {embedded &&
      typeof document !== "undefined" &&
      document.getElementById("tracker-management")
        ? createPortal(
            trackerManagement,
            document.getElementById("tracker-management")!,
          )
        : !embedded
          ? trackerManagement
          : null}
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
            <label className="job-search">
              <span className="sr-only">Search company, title or location</span>
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
          </div>
          {embedded &&
          typeof document !== "undefined" &&
          document.getElementById("tracker-filters")
            ? createPortal(
                trackerFilters,
                document.getElementById("tracker-filters")!,
              )
            : !embedded
              ? trackerFilters
              : null}
          <p className="tracker-count" role="status">
            {results.length} {results.length === 1 ? "job" : "jobs"}
          </p>
          <div className="job-list">
            {results
              .slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE)
              .map((job) => {
                const assessment =
                  profile && assessments[job.id]?.profile === profile
                    ? assessments[job.id].assessment
                    : null;
                const details = trackerCardDetails(job);
                const history = recordedRatings(job);
                return (
                  <article className="job-card tracker-card" key={job.id}>
                    <div className="job-card-main">
                      <div className="job-top">
                        <span className="company-logo mint">
                          {job.company.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="job-identity">
                          <h2>
                            <button onClick={() => setSelected(job)}>
                              {job.title}
                            </button>
                          </h2>
                          <span>{job.company || "Company unknown"}</span>
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
                            fill={
                              saved.includes(job.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                      </div>
                      <div className="job-meta card-facts">
                        <span>
                          <MapPin size={17} />
                          <span>
                            {details.location}
                            {details.locationNeedsReview && (
                              <span className="fact-caution">
                                {" "}
                                · Check details
                              </span>
                            )}
                          </span>
                        </span>
                        <span>
                          <House size={17} />
                          <span>{details.arrangement}</span>
                        </span>
                        <span>
                          <BriefcaseBusiness size={17} />
                          <span>{details.employment}</span>
                        </span>
                        <span>
                          <CircleDollarSign size={17} />
                          <span>{details.pay}</span>
                        </span>
                      </div>
                      <div className="job-card-actions">
                        <button
                          className="button secondary"
                          onClick={() => setSelected(job)}
                        >
                          View job and sources
                        </button>
                        {history.length > 0 && !assessment && (
                          <span>Historical rating in details</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`fit-panel ${assessment ? `fit-${assessment.status.toLowerCase().replaceAll(" ", "-")}` : ""}`}
                    >
                      <Sparkles size={18} />
                      <strong>
                        {assessment
                          ? `New: ${assessment.status}`
                          : profile
                            ? "Queued for evaluation"
                            : "Not evaluated"}
                      </strong>
                      <p>
                        {assessment
                          ? assessment.reason
                          : profile
                            ? "Awaiting evaluation for this resume."
                            : "Upload a resume to evaluate."}
                      </p>
                    </div>
                  </article>
                );
              })}
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
          <header className="detail-header">
            <span className="detail-kicker">Job details</span>
            <h2 id="tracker-title">{selected.title}</h2>
            <p>
              {selected.company} · {selected.location || "Location unknown"}
            </p>
            {safePostingLink(selected.url) && (
              <a
                className="detail-original"
                href={safePostingLink(selected.url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original posting ↗
              </a>
            )}
          </header>
          <div className="detail-body">
            {profile && assessments[selected.id]?.profile === profile && (
              <section className="detail-assessment">
                <span className="detail-label">YOUR EVALUATION</span>
                <h3>{assessments[selected.id].assessment.status}</h3>
                <p>{assessments[selected.id].assessment.reason}</p>
                {assessments[selected.id].assessment.question && (
                  <p>{assessments[selected.id].assessment.question}</p>
                )}
                {assessments[selected.id].assessment.rows.length > 0 && (
                  <details>
                    <summary>See supporting evidence</summary>
                    {assessments[selected.id].assessment.rows.map((row) => (
                      <p key={row.key}>
                        <strong>
                          {row.label}: {row.level}
                        </strong>{" "}
                        {row.quote}
                      </p>
                    ))}
                  </details>
                )}
              </section>
            )}
            <section className="detail-description">
              <div className="detail-section-heading">
                <h3>About this job</h3>
                <span>Imported source</span>
              </div>
              <p className="detail-notice">
                Source text may be incomplete or outdated. Vacancy status has
                not been verified.
              </p>
              {selected.descriptions.length ? (
                selected.descriptions.map((desc, i) => (
                  <section key={i} className="recovered-source">
                    <div className="detail-source">
                      <strong>Source:</strong> {desc.source}
                      {desc.retrievedAt ? ` · ${desc.retrievedAt}` : ""}
                      {desc.truncated ? " · Truncated" : ""}
                    </div>
                    <div className="description-text">
                      {formatJobDescription(desc.text).blocks.map(
                        (block, index) =>
                          block.type === "heading" ? (
                            <h4 key={index}>{block.text}</h4>
                          ) : block.type === "list" ? (
                            <ul key={index}>
                              {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p key={index}>{block.text}</p>
                          ),
                      )}
                    </div>
                    {formatJobDescription(desc.text).unwrapped && (
                      <details className="original-capture">
                        <summary>View original captured source</summary>
                        <pre>{desc.text}</pre>
                      </details>
                    )}
                  </section>
                ))
              ) : (
                <p>
                  Posting text could not be recovered. Fetch result:{" "}
                  {selected.fetchStatus.replaceAll("_", " ")}.
                </p>
              )}
            </section>
            <details className="detail-history">
              <summary>
                Tracker history <span>{selected.references.length}</span>
              </summary>
              <p>
                These are past tracker records, not fresh evaluations or proof
                that this vacancy remains open.
              </p>
              {selected.references.map((ref, i) => (
                <section key={`${ref.sheet}-${ref.row}-${i}`}>
                  <p>
                    <strong>
                      {ref.sheet}, row {ref.row}
                    </strong>
                    {ref.trackerStatus ? ` · Status: ${ref.trackerStatus}` : ""}
                    {ref.recordedFit
                      ? ` · Recorded fit: ${ref.recordedFit}`
                      : ""}
                  </p>
                  {ref.location && <p>Original location: {ref.location}</p>}
                  {ref.salary && (
                    <p>Original pay and employment information: {ref.salary}</p>
                  )}
                  {ref.notes && (
                    <p className="history-note">Recorded note: {ref.notes}</p>
                  )}
                </section>
              ))}
            </details>
          </div>
        </dialog>
      )}
    </Container>
  );
}
