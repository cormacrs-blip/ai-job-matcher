"use client";
import { useState } from "react";
import {
  evidenceLabels,
  type Assessment,
  type EvidenceKey,
  type Profile,
} from "@/lib/matching/evaluator";
import { evaluateRealJob, type RealJobReview } from "@/lib/matching/real-job";
import type { TrackerJob } from "@/lib/tracker-import";
const initial: RealJobReview = {
  central: [],
  descriptionComplete: false,
  vacancyVerified: false,
  otherGates: "unknown",
  gateReason: "",
  frenchRequirement: "unknown",
};
export function RealJobEvaluator({
  job,
  profile,
  onAssessment,
  initialReview,
  initialAssessment,
}: {
  job: TrackerJob;
  profile: Profile | null;
  onAssessment: (assessment: Assessment | null, review: RealJobReview) => void;
  initialReview?: RealJobReview;
  initialAssessment?: Assessment | null;
}) {
  const [review, setReview] = useState<RealJobReview>(initialReview ?? initial);
  const [result, setResult] = useState<{
    profile: Profile;
    assessment: Assessment;
  } | null>(
    profile && initialAssessment
      ? { profile, assessment: initialAssessment }
      : null,
  );
  function change(update: Partial<RealJobReview>) {
    const nextReview = { ...review, ...update };
    setReview(nextReview);
    setResult(null);
    onAssessment(null, nextReview);
  }
  const assessment = result?.profile === profile ? result.assessment : null;
  return (
    <section className="real-review">
      <h3>Evaluate this job against your resume</h3>
      {!profile ? (
        <p>
          First read your resume in the left panel, review its evidence, then
          choose <strong>Use reviewed resume</strong>.
        </p>
      ) : (
        <>
          <p>
            Review the complete job description and choose the work that
            actually defines this role. This uses your reviewed resume evidence
            and transparent prototype rules; it is not an AI reading of the
            posting.
          </p>
          <fieldset>
            <legend>Which 3 or 4 responsibilities define this job?</legend>
            <div className="review-criteria">
              {(Object.keys(evidenceLabels) as EvidenceKey[]).map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={review.central.includes(key)}
                    onChange={(event) => {
                      const central = event.target.checked
                        ? [...review.central, key]
                        : review.central.filter((item) => item !== key);
                      change({ central });
                    }}
                  />
                  {evidenceLabels[key]}
                </label>
              ))}
            </div>
            <p className="small muted">
              Selected: {review.central.length}. If these options do not
              describe the role, leave the evaluation incomplete.
            </p>
          </fieldset>
          <label className="review-check">
            <input
              type="checkbox"
              checked={review.descriptionComplete}
              onChange={(event) =>
                change({ descriptionComplete: event.target.checked })
              }
            />{" "}
            I have reviewed the complete responsibilities and essential
            requirements for this job.
          </label>
          <label className="review-check">
            <input
              type="checkbox"
              checked={review.vacancyVerified}
              onChange={(event) =>
                change({ vacancyVerified: event.target.checked })
              }
            />{" "}
            I confirmed the original posting is currently open.
          </label>
          <label htmlFor={`other-gates-${job.id}`}>
            Are the other mandatory requirements met?
          </label>
          <p>Check location, work authorization, credentials, travel and pay where stated. Unstated pay remains unknown.</p>
          <select id={`other-gates-${job.id}`} value={review.otherGates} onChange={(event) => change({ otherGates: event.target.value as RealJobReview["otherGates"] })}>
            <option value="unknown">Not yet checked</option>
            <option value="met">Yes, requirements are met</option>
            <option value="not-met">No, a requirement is not met</option>
          </select>
          {review.otherGates === "not-met" && <label>Which requirement is not met?<input value={review.gateReason} onChange={(event) => change({ gateReason: event.target.value })} /></label>}
          <label htmlFor={`french-requirement-${job.id}`}>
            Does this job require professional French?
          </label>
          <select
            id={`french-requirement-${job.id}`}
            value={review.frenchRequirement}
            onChange={(event) =>
              change({
                frenchRequirement: event.target
                  .value as RealJobReview["frenchRequirement"],
              })
            }
          >
            <option value="unknown">Unknown</option>
            <option value="required">Yes, mandatory</option>
            <option value="not-required">No mandatory requirement</option>
          </select>
          <button
            className="button primary"
            onClick={() => {
              const next = evaluateRealJob(review, profile);
              setResult({ profile, assessment: next });
              onAssessment(next, review);
            }}
          >
            Evaluate this job
          </button>
          {assessment && (
            <div className="real-assessment" role="status">
              <strong>{assessment.status}</strong>
              <p>{assessment.reason}</p>
              {assessment.question && <p>{assessment.question}</p>}
              <ul>
                {assessment.rows.map((row) => (
                  <li key={row.key}>
                    <strong>
                      {row.label} — {row.level}:
                    </strong>{" "}
                    {row.quote || "No evidence supplied."}
                  </li>
                ))}
              </ul>
              <p>
                Review outcome is based on your answers and reviewed resume
                evidence. Salary, preferred qualifications, and additional gates
                need separate review. This result remains in this browser
                session.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
