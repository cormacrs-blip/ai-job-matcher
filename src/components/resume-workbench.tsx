"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { validateResume } from "@/lib/jobs";
import {
  parseProfile,
  evidenceLabels,
  levels,
  type EvidenceKey,
  type Profile,
} from "@/lib/matching/evaluator";
import { suggestEvidence } from "@/lib/matching/suggestions";
export function ResumeWorkbench({
  onEvaluate,
  target = "sample",
}: {
  onEvaluate: (profile: Profile | null) => void;
  target?: "sample" | "tracker";
}) {
  const [file, setFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [reviewFocus, setReviewFocus] = useState("Business analysis");
  const reviewGroups: Record<string, EvidenceKey[]> = {
    "Business analysis": ["requirements", "process", "uat"],
    "Product ownership": ["roadmap", "discovery", "backlog"],
    "Project delivery": ["planning", "stakeholders", "delivery"],
    "Data engineering": ["sql", "pipelines", "warehouse"],
    "All responsibilities": Object.keys(evidenceLabels) as EvidenceKey[],
  };
  const suggestions = useMemo(
    () => suggestEvidence(profile?.text || ""),
    [profile?.text],
  );
  const input = useRef<HTMLInputElement>(null);
  const requestNumber = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      requestNumber.current++;
      activeRequest.current?.abort();
    },
    [],
  );
  function choose(candidate?: File) {
    if (!candidate) return;
    const problem = validateResume(candidate);
    setError(problem || "");
    if (problem) return;
    requestNumber.current++;
    activeRequest.current?.abort();
    setBusy(false);
    setFile(candidate);
    if (target === "tracker") void read(candidate);
    setProfile(null);
    onEvaluate(null);
  }
  function clear() {
    requestNumber.current++;
    activeRequest.current?.abort();
    setBusy(false);
    setFile(null);
    setPastedText("");
    setProfile(null);
    setError("");
    onEvaluate(null);
  }
  async function read(selectedFile = file) {
    if (!selectedFile) return;
    const current = ++requestNumber.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError("");
    setProfile(null);
    onEvaluate(null);
    const form = new FormData();
    form.set("resume", selectedFile);
    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data = await response.json();
      if (current !== requestNumber.current) return;
      if (!response.ok)
        throw new Error(data.error || "Unable to read this document.");
      setProfile(data.profile);
      if (target === "tracker") onEvaluate(data.profile);
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
  function readPastedText() {
    if (!pastedText.trim()) {
      setError("Paste some resume text first.");
      return;
    }
    if (pastedText.length > 100000) {
      setError("Please keep pasted text under 100,000 characters.");
      return;
    }
    requestNumber.current++;
    activeRequest.current?.abort();
    setBusy(false);
    setFile(null);
    setError("");
    onEvaluate(null);
    setProfile(parseProfile(pastedText));
    if (target === "tracker") onEvaluate(parseProfile(pastedText));
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
      <p className="privacy-note">
        Selecting a resume automatically evaluates all stored imported jobs,
        including jobs outside the current filters. Resume and job text are sent
        to OpenAI through signed-in Codex and use your plan limits. Results stay
        in this browser session. No API billing is configured.
      </p>
      <div className="sample-downloads">
        {[
          "ordinary-business-analyst",
          "ordinary-data-engineer",
          "business-analyst",
          "incomplete-profile",
        ].map((name) => (
          <div key={name}>
            <strong>{name.replaceAll("-", " ")}</strong>
            <a href={`/sample-resumes/${name}.pdf`} download>
              PDF
            </a>
            <a href={`/sample-resumes/${name}.docx`} download>
              DOCX
            </a>
          </div>
        ))}
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
      <details className="paste-resume">
        <summary>Or paste resume text</summary>
        <label htmlFor="resume-text">Resume text</label>
        <textarea
          id="resume-text"
          value={pastedText}
          maxLength={100000}
          onChange={(event) => {
            setPastedText(event.target.value);
            setProfile(null);
            onEvaluate(null);
            requestNumber.current++;
            activeRequest.current?.abort();
            setBusy(false);
          }}
          placeholder="Paste the experience and project sections of a resume"
        />
        <button className="button secondary" onClick={readPastedText}>
          {target === "tracker" ? "Use pasted resume" : "Review pasted resume"}
        </button>
      </details>
      {file && (
        <>
          <p className="privacy-note">
            The document is sent to this app for text extraction. For imported
            jobs, extracted resume and job text are sent to OpenAI using your
            signed-in Codex access.
          </p>
          <div className="resume-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void read()}
            >
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
      {profile && target === "tracker" && !file && (
        <button className="reset-button" onClick={clear}>
          Clear resume and results
        </button>
      )}
      {profile && target === "sample" && (
        <div className="evidence-review">
          <h3>Review evidence before evaluating</h3>
          {!file && (
            <button className="reset-button" onClick={clear}>
              Clear resume and results
            </button>
          )}
          <p className="small muted">
            For each responsibility, review the original text and choose the
            level of evidence. Suggested passages are located by vocabulary, not
            AI judgment; selecting a passage leaves its assessment Unknown. Keep
            scope, ownership and limitations intact. Sample files with evidence
            annotations are prefilled claims, not independently verified facts.
          </p>
          <details>
            <summary>Extracted resume text</summary>
            <pre>{profile.text}</pre>
          </details>
          <details open>
            <summary>
              Review or adjust evidence (
              {
                Object.values(profile.evidence).filter(
                  (item) => item.level !== "Unknown",
                ).length
              }{" "}
              recognized)
            </summary>
            <label htmlFor="review-focus">Focus your review</label>
            <select
              id="review-focus"
              value={reviewFocus}
              onChange={(event) => setReviewFocus(event.target.value)}
            >
              {Object.keys(reviewGroups).map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
            <p className="evidence-help">
              Review one role family at a time. Switching families keeps your
              edits. Unreviewed evidence stays Unknown.
            </p>
            {reviewGroups[reviewFocus].map((key) => (
              <div className="evidence-field" key={key}>
                <label htmlFor={`evidence-${key}`}>{evidenceLabels[key]}</label>
                <p className="evidence-help">
                  Demonstrated: comparable work you owned or performed.
                  Adjacent: explain the transfer. Limited: preserve the limits.
                  Unknown: more evidence is needed.
                </p>
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
                {suggestions[key].length > 0 && (
                  <details className="passage-suggestions">
                    <summary>
                      Possible passages ({suggestions[key].length})
                    </summary>
                    {suggestions[key].map((passage, index) => (
                      <div className="passage" key={index}>
                        <small>Preceding context: {passage.context}</small>
                        <blockquote>{passage.quote}</blockquote>
                        {passage.caution && (
                          <p className="passage-caution">{passage.caution}</p>
                        )}
                        <button
                          className="button secondary"
                          onClick={() => update(key, "Unknown", passage.quote)}
                        >
                          Use passage for {evidenceLabels[key]}
                        </button>
                      </div>
                    ))}
                  </details>
                )}
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
