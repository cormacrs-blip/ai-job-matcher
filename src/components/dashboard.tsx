"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  defaultPreferences,
  filterJobs,
  jobs,
  salary,
  validateResume,
  type Job,
} from "@/lib/jobs";
export function Dashboard() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<number[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
  }, [selected]);
  const results = useMemo(
    () =>
      filterJobs(jobs, preferences).filter(
        (job) => !onlySaved || saved.includes(job.id),
      ),
    [preferences, onlySaved, saved],
  );
  function acceptFile(candidate?: File) {
    if (!candidate) return;
    const message = validateResume(candidate);
    setError(message || "");
    if (!message) setFile(candidate);
  }
  return (
    <main className="dashboard shell">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>A little closer to what’s next.</h1>
          <p>Your priorities. A few possibilities. A clearer way forward.</p>
        </div>
        <span className="dashboard-badge">
          <Sparkles size={15} /> Demo workspace
        </span>
      </div>
      <div className="dashboard-disclaimer">
        <Sparkles size={17} />
        <p>
          <strong>Explore the experience.</strong> These fictional jobs and
          fixed fit scores are sample data, not AI recommendations. Your resume
          is never uploaded or analyzed.
        </p>
      </div>
      <div className="dashboard-grid">
        <aside className="sidebar">
          <section className="panel">
            <div className="panel-title">
              <h2>Your resume</h2>
              <FileText size={18} />
            </div>
            <p className="muted small">Start with the experience you bring.</p>
            <div
              className="upload-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                acceptFile(event.dataTransfer.files[0]);
              }}
            >
              <Upload size={25} />
              <strong>
                {file ? "Resume selected" : "Drop your resume here"}
              </strong>
              <span>
                {file ? file.name : "or choose a file to get started"}
              </span>
              <button
                className="button secondary"
                onClick={() => input.current?.click()}
              >
                {file ? "Replace file" : "Choose a file"}
              </button>
              <small>PDF or DOCX · Up to 10 MB</small>
              <input
                ref={input}
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                aria-label="Choose resume PDF or DOCX"
                onChange={(event) => {
                  acceptFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {file && (
              <div className="file-status">
                <Check size={15} />
                <span>Selected locally · No analysis performed</span>
                <button
                  aria-label="Remove selected resume"
                  onClick={() => setFile(null)}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <p className="privacy-note">
              Your file stays in this browser tab and is cleared when you leave
              or refresh.
            </p>
          </section>
          <section className="panel preferences">
            <div className="panel-title">
              <h2>Your preferences</h2>
              <SlidersHorizontal size={17} />
            </div>
            <label htmlFor="role">Role or job title</label>
            <div className="input-icon">
              <Search size={16} />
              <input
                id="role"
                placeholder="e.g. Product Designer"
                value={preferences.role}
                onChange={(event) =>
                  setPreferences({ ...preferences, role: event.target.value })
                }
              />
            </div>
            <label htmlFor="location">Location</label>
            <div className="input-icon">
              <MapPin size={16} />
              <input
                id="location"
                placeholder="City or province"
                value={preferences.location}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    location: event.target.value,
                  })
                }
              />
            </div>
            <label htmlFor="remote">Work arrangement</label>
            <select
              id="remote"
              value={preferences.remote}
              onChange={(event) =>
                setPreferences({ ...preferences, remote: event.target.value })
              }
            >
              {["Any arrangement", "Remote", "Hybrid", "On-site"].map(
                (option) => (
                  <option key={option}>{option}</option>
                ),
              )}
            </select>
            <label htmlFor="salary">
              Minimum annual salary{" "}
              <span>
                {preferences.salary ? salary(preferences.salary) : "Any"}
              </span>
            </label>
            <input
              id="salary"
              type="range"
              min="0"
              max="150000"
              step="5000"
              value={preferences.salary}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  salary: Number(event.target.value),
                })
              }
            />
            <p className="small muted">
              CAD · Includes roles whose salary range reaches your minimum.
            </p>
            <button
              className="reset-button"
              onClick={() => setPreferences(defaultPreferences)}
            >
              Reset preferences
            </button>
          </section>
        </aside>
        <section className="results">
          <div className="results-toolbar">
            <div className="result-tabs">
              <button
                className={!onlySaved ? "active" : ""}
                onClick={() => setOnlySaved(false)}
              >
                All opportunities <span>{jobs.length}</span>
              </button>
              <button
                className={onlySaved ? "active" : ""}
                onClick={() => setOnlySaved(true)}
              >
                Saved <span>{saved.length}</span>
              </button>
            </div>
            <span className="sort-label">Sample fit: high to low</span>
          </div>
          <div className="results-caption">
            <span>
              {results.length}{" "}
              {results.length === 1 ? "opportunity" : "opportunities"} to
              explore
            </span>
            <span>All salaries in CAD</span>
          </div>
          <div className="job-list">
            {results.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-top">
                  <span className={`company-logo ${job.color}`}>
                    {job.initials}
                  </span>
                  <div className="job-identity">
                    <span>
                      {job.company}{" "}
                      <span className="posted">· {job.posted}</span>
                    </span>
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
                    {job.location}
                  </span>
                  <span>{job.remote}</span>
                  <span>
                    {salary(job.salaryMin)}–{salary(job.salaryMax)} / year
                  </span>
                </div>
                <div className="job-tags">
                  {job.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="job-fit">
                  <div className="fit-value">
                    {job.score}
                    <span>%</span>
                    <small>Sample fit</small>
                  </div>
                  <div>
                    <strong>
                      <Sparkles size={13} /> Why this example fits
                    </strong>
                    <p>{job.explanation}</p>
                  </div>
                </div>
                <div className="job-bottom">
                  <span>Demonstration listing</span>
                  <button onClick={() => setSelected(job)}>
                    Explore role <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {results.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h2>No opportunities here yet.</h2>
              <p>
                {onlySaved
                  ? "Save an opportunity from the All opportunities tab."
                  : "Try a broader role, location, or salary preference."}
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setPreferences(defaultPreferences);
                  setOnlySaved(false);
                }}
              >
                Show all opportunities
              </button>
            </div>
          )}
          <p className="results-end">
            A starting point for your next chapter. More possibilities to come.
          </p>
        </section>
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <dialog
            ref={dialogRef}
            className="role-modal"
            aria-labelledby="role-title"
            onClick={(event) => event.stopPropagation()}
            onCancel={() => setSelected(null)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSelected(null);
            }}
          >
            <button
              autoFocus
              className="modal-close"
              aria-label="Close role details"
              onClick={() => setSelected(null)}
            >
              <X size={21} />
            </button>
            <span className="eyebrow">FICTIONAL DEMONSTRATION ROLE</span>
            <h2 id="role-title">{selected.title}</h2>
            <p>
              {selected.company} · {selected.location} · {selected.remote}
            </p>
            <p className="modal-salary">
              {salary(selected.salaryMin)}–{salary(selected.salaryMax)} CAD /
              year
            </p>
            <h3>The opportunity</h3>
            <p>{selected.description}</p>
            <h3>Illustrative alignment · {selected.score}%</h3>
            <p>{selected.explanation}</p>
            <h3>A potential area to develop</h3>
            <p>{selected.gap}</p>
            <div className="modal-note">
              This is a fictional listing with a fixed demonstration score. It
              has not been matched to your resume. Applications are unavailable
              in this prototype.
            </div>
            <button
              className="button primary"
              onClick={() => setSelected(null)}
            >
              Back to opportunities
            </button>
          </dialog>
        </div>
      )}
    </main>
  );
}
