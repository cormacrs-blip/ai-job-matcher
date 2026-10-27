# Align — evidence-led job matching prototype

A responsive portfolio MVP built with Next.js App Router, TypeScript and Tailwind CSS. The dashboard demonstrates a complete fictional resume-to-job evaluation flow using **Fit, Consider, Investigate, and Weak Fit**. There are no percentage match scores.

## Setup

Use Node.js 22.12+ (validated on Node 24) and npm.

```sh
npm ci
npm run dev
```

In GitHub Codespaces, open the forwarded port 3000 in your browser and retain **private** port visibility. No API keys, external AI service, account system or database are required. In a cloud environment with an unwritable default npm cache, use `npm ci --cache /workspace/.npm-cache`.

```sh
npm run build
npm start
```

## Try the working example

1. Open `/dashboard` and download the fictional **business analyst** PDF or DOCX from the resume panel.
2. Select that downloaded file. Selection alone does not upload or evaluate anything.
3. Click **Read resume**. The app uploads the file to its own server, extracts text and identifies explicit prototype evidence annotations.
4. Review the extracted text and evidence; adjust assessments or add specific evidence when needed.
5. Click **Evaluate sample jobs**. Expect Fit for Digital Business Analyst, Consider for Product Owner and Senior Business Analyst, Investigate for Digital Project Manager (French eligibility unknown), and Weak Fit for Analytics Engineer.
6. Replace it with the fictional **data engineer** resume and repeat: Analytics Engineer becomes Fit. The incomplete profile produces Investigate rather than invented evidence.

Changing a file, removing it, reading it again or editing reviewed evidence clears prior evaluations. Replacing/removing a file or leaving the dashboard cancels the browser’s outstanding read request; this does not guarantee interruption of parsing already underway on the server. Download names are never used to choose an assessment. Both PDF and DOCX content is actually extracted. Filters accept any combination of Remote, Hybrid and On-site; none selected means all. Salaries are annual base CAD amounts. Saved jobs and reviewed evidence are in-memory only and reset when the dashboard unmounts or refreshes.

## What the evaluator does—and does not do

This is an explicit **rules prototype**, not AI analysis or a faithful implementation of every qualitative judgment in Cormac's ChatGPT work agent. Fictional resumes contain readable annotations such as `Evidence [requirements]: Demonstrated | Led discovery workshops...`. The parser reads these declarations; it does not independently infer or verify career achievements. Ordinary resumes can be extracted, but unrecognized evidence remains Unknown until the user reviews it. Simply mentioning a skill does not establish capability. These annotations deliberately make controlled examples reproducible; they are not a production resume format requirement.

Each fictional role has three defining responsibilities, detailed essential/preferred requirements and structured central-work criteria. Results show evidence, gaps and specific investigation questions. Supporting keyword counts never compensate for central gaps. Categories are computed from reviewed evidence, not preassigned to files or listings.

Prototype rules, in order:

- A confirmed modeled gate failure (maximum annual CAD pay below $60,000 or explicitly unmet mandatory French) produces Weak Fit, used here as the fourth exclusion category.
- Two or more defining responsibilities with Limited or No evidence produce Weak Fit; this describes an evidence gap, not proof of inability.
- Unknown mandatory French, unknown defining evidence, or one substantial central gap produces Investigate with a specific question.
- An explicit adjacent transfer produces Consider.
- Otherwise direct central-work evidence produces Fit; minimum annual CAD base pay above $100,000 changes it to Consider as a competition cue. Exactly $100,000 does not; a Senior title by itself does not change it.

This intentionally limited prototype does **not** model all geography, authorization, credentials, industry preferences, preferred-profile caps, alternative qualifications or nuanced comparisons of scope, depth and authority. The displayed full description supports human review; only the structured criteria drive rules. Missing salary neutrality, other currencies and hourly rates need explicit modeling before adding those fixtures. A later semantic evaluator needs its own evidence extraction, validation and regression evaluation before replacing these rules.

## Document handling

PDF and DOCX files up to 10 MB are accepted. Document parsers load on demand for the selected format, so DOCX reads do not initialize the PDF parser. The app enforces an 11 MB total request limit while reading the actual upload stream (including requests without a size header), then a 10 MB per-file limit. It checks extension and a basic file signature, then extracts plain text using pdf-parse or Mammoth. Corrupt/encrypted documents and PDFs without readable text return errors. OCR is not provided. The application processes files in server memory, does not write uploaded files to disk or a database, does not log resume contents and does not forward them to an external service. Responses use `Cache-Control: no-store`. Browser selection is separate from the explicit upload action. No claim is made about infrastructure-level retention.

Use fictional files in this development prototype. It lacks authentication, rate limiting, malware scanning, robust decompression/resource limits and a production retention/consent policy. Keep the development port private; do not expose this upload endpoint publicly as-is.

## Architecture

```text
src/app/                       Pages, shared styles, resume extraction API
src/components/dashboard.tsx   Filters, saved roles, evaluation results and details
src/components/resume-workbench.tsx  File selection, upload, review and evaluation action
src/lib/jobs.ts                Typed detailed fictional roles and preference filters
src/lib/matching/evaluator.ts  Explicit evidence parsing and pure category rules
public/sample-resumes/         Three fictional resumes, each as PDF and DOCX
scripts/generate_sample_resumes.py  Reproducible fixture generator
```

Regenerating fixtures requires Python packages `python-docx` and `reportlab`; the committed files require no Python to run the app. No personal career evidence has been copied into these samples.

## Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests require a production build and Chromium (`/usr/bin/chromium` by default; override `CHROMIUM_PATH` for your installed browser). Tests cover real PDF/DOCX uploads and text extraction, all four categories, changed outcomes after replacing the resume, missing evidence, file errors, multi-select filters, saved jobs, dialogs and mobile/desktop overflow. Unit tests cover extraction boundaries, explicit/unknown/duplicate evidence, central gaps, competition cues, salary/language gates and preference combinations.

## Next priorities

Calibrate the structured rubric against actual work-agent decisions; build a reviewed semantic extraction adapter rather than keyword scoring; add the unmodeled gates and qualification rules; harden upload processing before public use; then introduce permitted live job sources and persistence. No paid service or public deployment has been configured.
