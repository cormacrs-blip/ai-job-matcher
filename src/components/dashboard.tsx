"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  defaultPreferences,
  filterJobs,
  jobs,
  salary,
  workArrangements,
  type Job,
} from "@/lib/jobs";
import { ResumeWorkbench } from "./resume-workbench";
import { TrackerBrowser } from "./tracker-browser";
import { evaluateRole, type Profile } from "@/lib/matching/evaluator";
import { createEvaluationReport, nextAction } from "@/lib/matching/report";
export function Dashboard() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [jobSource, setJobSource] = useState<"tracker" | "sample">("tracker");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selected, setSelected] = useState<Job | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
  }, [selected]);
  const results = useMemo(
    () =>
      filterJobs(jobs, preferences).filter(
        (job) =>
          (!onlySaved || saved.includes(job.id)) &&
          (!profile ||
            statusFilter === "All statuses" ||
            evaluateRole(job, profile).status === statusFilter),
      ),
    [preferences, onlySaved, saved, profile, statusFilter],
  );
  function downloadReport() {
    if (!selected || !profile) return;
    const url = URL.createObjectURL(
      new Blob([createEvaluationReport(selected, profile)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `align-evaluation-${selected.id}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectedAssessment =
    selected && profile ? evaluateRole(selected, profile) : null;
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
          <strong>Evidence, not percentages.</strong> Import your tracker to
          explore real jobs. Sample jobs demonstrate a limited rules-based
          evaluation; imported jobs retain their historical tracker assessments
          and are not newly evaluated.
        </p>
      </div>
      <div
        className={`dashboard-grid ${jobSource === "tracker" ? "tracker-mode" : ""}`}
      >
        <aside className="sidebar" hidden={jobSource !== "sample"}>
          <ResumeWorkbench onEvaluate={setProfile} />
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
                placeholder="e.g. Business Analyst"
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
            <fieldset className="arrangement-options">
              <legend>Work arrangement</legend>
              <p className="small muted">
                Choose any combination. None selected means all arrangements.
              </p>
              {workArrangements.map((option) => (
                <label className="arrangement-option" key={option}>
                  <input
                    type="checkbox"
                    checked={preferences.arrangements.includes(option)}
                    onChange={(event) => {
                      setPreferences({
                        ...preferences,
                        arrangements: event.target.checked
                          ? [...preferences.arrangements, option]
                          : preferences.arrangements.filter(
                              (item) => item !== option,
                            ),
                      });
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
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
          <div className="source-selector" aria-label="Choose job source">
            <button
              type="button"
              aria-pressed={jobSource === "tracker"}
              onClick={() => setJobSource("tracker")}
            >
              Your tracker jobs
            </button>
            <button
              type="button"
              aria-pressed={jobSource === "sample"}
              onClick={() => setJobSource("sample")}
            >
              Sample opportunities
            </button>
          </div>
          <div hidden={jobSource !== "tracker"}>
            <TrackerBrowser embedded />
          </div>
          {jobSource === "sample" && (
            <>
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
                <span className="sort-label">Sample listing order</span>
              </div>
              {profile && (
                <div className="status-filter">
                  <label htmlFor="fit-status">Show category</label>
                  <select
                    id="fit-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    {[
                      "All statuses",
                      "Fit",
                      "Consider",
                      "Investigate",
                      "Weak Fit",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="results-caption">
                <span>
                  {results.length}{" "}
                  {results.length === 1 ? "opportunity" : "opportunities"} to
                  explore
                </span>
                <span>All salaries in CAD</span>
              </div>
              <div className="job-list">
                {results.map((job) => {
                  const assessment = profile
                    ? evaluateRole(job, profile)
                    : null;
                  return (
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
                            fill={
                              saved.includes(job.id) ? "currentColor" : "none"
                            }
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
                        <div>
                          <strong
                            className={`fit-status status-${assessment?.status.toLowerCase().replace(" ", "-") || "pending"}`}
                          >
                            <Sparkles size={16} />
                            {assessment?.status || "Not evaluated"}
                          </strong>
                          <p>
                            {assessment?.reason ||
                              "Read a sample resume, review its evidence, then evaluate the jobs."}
                          </p>
                          {assessment?.question && (
                            <p>
                              <strong>Investigate:</strong>{" "}
                              {assessment.question}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="job-bottom">
                        <span>Demonstration listing</span>
                        <button onClick={() => setSelected(job)}>
                          Explore role <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
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
                      setStatusFilter("All statuses");
                    }}
                  >
                    Show all opportunities
                  </button>
                </div>
              )}
              <p className="results-end">
                A starting point for your next chapter. More possibilities to
                come.
              </p>
            </>
          )}
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
            <h3>Defining responsibilities</h3>
            <ul>
              {selected.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Essential requirements</h3>
            <ul>
              {selected.essentials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>Preferred qualifications</h3>
            <ul>
              {selected.preferred.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3>{selectedAssessment?.status || "Not evaluated"}</h3>
            {selectedAssessment && (
              <>
                <p>{selectedAssessment.reason}</p>
                {selectedAssessment.compensationNote && (
                  <p>{selectedAssessment.compensationNote}</p>
                )}
                <h3>Next action</h3>
                <p>{nextAction(selectedAssessment)}</p>
                <button className="button secondary" onClick={downloadReport}>
                  Download evaluation summary
                </button>
                {selectedAssessment.question && (
                  <p>{selectedAssessment.question}</p>
                )}
                <div className="evidence-table-wrap">
                  <table>
                    <caption>
                      Defining work and reviewed resume evidence
                    </caption>
                    <thead>
                      <tr>
                        <th>Responsibility</th>
                        <th>Assessment</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssessment.rows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>{row.level}</td>
                          <td>
                            {row.quote || "Unknown — no evidence supplied"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="modal-note">
              Fictional listing. These categories come from explicit prototype
              rules applied to reviewed evidence, not AI inference. Supporting
              keyword matches cannot override central gaps. Applications are
              unavailable.
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
