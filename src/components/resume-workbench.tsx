"use client";
import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { validateResume } from "@/lib/jobs";
import {
  evidenceLabels,
  levels,
  type EvidenceKey,
  type Profile,
} from "@/lib/matching/evaluator";
export function ResumeWorkbench({
  onEvaluate,
}: {
  onEvaluate: (profile: Profile | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const requestNumber = useRef(0);
  function choose(candidate?: File) {
    if (!candidate) return;
    const problem = validateResume(candidate);
    setError(problem || "");
    if (problem) return;
    requestNumber.current++;
    setBusy(false);
    setFile(candidate);
    setProfile(null);
    onEvaluate(null);
  }
  function clear() {
    requestNumber.current++;
    setBusy(false);
    setFile(null);
    setProfile(null);
    setError("");
    onEvaluate(null);
  }
  async function read() {
    if (!file) return;
    const current = ++requestNumber.current;
    setBusy(true);
    setError("");
    setProfile(null);
    onEvaluate(null);
    const form = new FormData();
    form.set("resume", file);
    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (current !== requestNumber.current) return;
      if (!response.ok)
        throw new Error(data.error || "Unable to read this document.");
      setProfile(data.profile);
    } catch (error) {
      if (current === requestNumber.current)
        setError(
          error instanceof Error ? error.message : "Could not read the resume.",
        );
    } finally {
      if (current === requestNumber.current) setBusy(false);
    }
  }
  function update(
    key: EvidenceKey,
    level: Profile["evidence"][EvidenceKey]["level"],
    quote: string,
  ) {
    if (!profile) return;
    onEvaluate(null);
    setProfile({
      ...profile,
      evidence: { ...profile.evidence, [key]: { level, quote } },
    });
  }
  const unsupported =
    profile &&
    Object.values(profile.evidence).some(
      (item) => item.level !== "Unknown" && !item.quote.trim(),
    );
  return (
    <section className="panel resume-workbench">
      <div className="panel-title">
        <h2>Your resume</h2>
        <FileText size={20} />
      </div>
      <p className="small muted">
        Try a fictional resume first. Download, then select it below.
      </p>
      <div className="sample-downloads">
        {["business-analyst", "data-engineer", "incomplete-profile"].map(
          (name) => (
            <div key={name}>
              <strong>{name.replaceAll("-", " ")}</strong>
              <a href={`/sample-resumes/${name}.pdf`} download>
                PDF
              </a>
              <a href={`/sample-resumes/${name}.docx`} download>
                DOCX
              </a>
            </div>
          ),
        )}
      </div>
      <div
        className="upload-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files[0]);
        }}
      >
        <Upload size={24} />
        <strong>{file ? "Resume selected" : "Drop your resume here"}</strong>
        <span>{file?.name || "PDF or DOCX · Up to 10 MB"}</span>
        <button
          className="button secondary"
          onClick={() => input.current?.click()}
        >
          {file ? "Replace file" : "Choose a file"}
        </button>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept=".pdf,.docx"
          aria-label="Choose resume PDF or DOCX"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {file && (
        <>
          <p className="privacy-note">
            “Read resume” sends this document to this app’s cloud server for
            text extraction. The application does not save the file or use an
            external AI service. Use fictional files for this prototype.
          </p>
          <div className="resume-actions">
            <button className="button primary" disabled={busy} onClick={read}>
              {busy ? "Reading…" : "Read resume"}
            </button>
            <button className="reset-button" onClick={clear}>
              Remove selected resume
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {profile && (
        <div className="evidence-review">
          <h3>Review evidence before evaluating</h3>
          <p className="small muted">
            The sample files include explicit evidence annotations for this
            prototype. Ordinary resumes are not semantically assessed:
            unrecognized evidence stays Unknown. Review the extracted text and
            supply specific evidence if needed. These are claims, not verified
            career facts.
          </p>
          <details>
            <summary>Extracted resume text</summary>
            <pre>{profile.text}</pre>
          </details>
          <details>
            <summary>
              Review or adjust evidence (
              {
                Object.values(profile.evidence).filter(
                  (item) => item.level !== "Unknown",
                ).length
              }{" "}
              recognized)
            </summary>
            {(Object.keys(evidenceLabels) as EvidenceKey[]).map((key) => (
              <div className="evidence-field" key={key}>
                <label htmlFor={`evidence-${key}`}>{evidenceLabels[key]}</label>
                <select
                  id={`evidence-${key}`}
                  value={profile.evidence[key].level}
                  onChange={(event) =>
                    update(
                      key,
                      event.target
                        .value as Profile["evidence"][EvidenceKey]["level"],
                      profile.evidence[key].quote,
                    )
                  }
                >
                  {levels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`quote-${key}`}>
                  Evidence for {evidenceLabels[key]}
                </label>
                <textarea
                  id={`quote-${key}`}
                  placeholder="Specific resume evidence or your clarification"
                  value={profile.evidence[key].quote}
                  onChange={(event) =>
                    update(key, profile.evidence[key].level, event.target.value)
                  }
                />
              </div>
            ))}
            <label htmlFor="french">
              Professional French (mandatory for the sample project role)
            </label>
            <select
              id="french"
              value={profile.french}
              onChange={(event) => {
                onEvaluate(null);
                setProfile({
                  ...profile,
                  french: event.target.value as Profile["french"],
                });
              }}
            >
              {["Unknown", "Yes", "No"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </details>
          {unsupported && (
            <p className="error">
              Add specific evidence for every non-Unknown assessment before
              evaluating.
            </p>
          )}
          <button
            className="button primary evaluate-button"
            disabled={!!unsupported}
            onClick={() => onEvaluate(profile)}
          >
            Evaluate sample jobs
          </button>
        </div>
      )}
    </section>
  );
}
