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

## Try an ordinary resume

1. Open `/dashboard` and download **ordinary business analyst**, as PDF or DOCX. It contains conventional experience bullets without special evidence tags. Alternatively, open **Or paste resume text** and paste experience text; that path stays in the browser.
2. For a file, select it and click **Read resume** to upload it to this app for text extraction.
3. In **Review or adjust evidence**, choose a role family. Expand **Possible passages**, inspect the original quote and context, and choose a passage. Its assessment remains **Unknown** until you choose a level.
4. Review Requirements discovery, Process improvement and UAT as Demonstrated for the fictional ordinary business analyst. Keep its qualified claims about roadmap support and basic SQL at their actual scope.
5. Click **Evaluate sample jobs**. Filter results by category, open role details to inspect the evidence, and download a plain-text evaluation summary.

No model independently interprets an ordinary resume. Suggestions locate vocabulary in original passages; they can miss relevant synonyms or surface irrelevant text. User review remains necessary. No passage, filename or skill keyword silently establishes capability.

## Try the controlled examples

The original business analyst and incomplete profile downloads contain explicit prototype evidence annotations. They demonstrate prefilled mappings and regression cases. The annotated business analyst produces Fit for Digital Business Analyst, Consider for Product Owner and Senior Business Analyst, Investigate for Digital Project Manager (French eligibility unknown), and Weak Fit for Analytics Engineer. The annotated data engineer fixture is retained under `public/sample-resumes/` for regression tests. All are fictional.

Changing a file, removing it, reading it again or editing reviewed evidence clears prior evaluations. Replacing/removing a file or leaving the dashboard cancels the browser’s outstanding read request; this does not guarantee interruption of parsing already underway on the server. Download names never choose an assessment. Both PDF and DOCX contents are extracted. Filters accept any combination of Remote, Hybrid and On-site; none selected means all. Visible sample salaries are annual base CAD amounts. Saved jobs and reviewed evidence are in-memory only and reset when the dashboard unmounts or refreshes.

## Import a recovered job tracker

Open the dashboard, select **Your tracker jobs**, and choose the original `.xlsx` tracker or an `align-tracker-v1` JSON/JSON.GZ file. The Excel import preserves rows, statuses and relevant cached comments, but it does not retrieve job sites; a previously recovered JSON includes additional text where available. Import is entirely browser-side: the data is not sent to the app server, persisted, or added to the Git repository. It is cleared on refresh or when you choose **Clear imported data**. The file can include private tracker statuses and notes, so keep the file private.

The Excel parser runs in the browser. The prototype is for trusted user-provided spreadsheets and is not hardened for arbitrary untrusted files. The dashboard’s role, location, work arrangement and minimum annual salary controls also filter tracker jobs. Ambiguous work arrangements and salaries remain visible by default; uncheck **Include unknown work arrangement or salary** to require known values when those filters are active. Salary filtering only interprets explicit CAD annual values; hourly, foreign-currency and ambiguous amounts remain unknown. Saved jobs and recorded-fit filters work for tracker entries in the current tab. Recorded fit labels are historical and are not fresh resume evaluations. The browser groups only identical posting URLs, preserving each source tab, row, tracker status, and past fit rating separately. Records with no URL remain separate and different URLs can represent the same vacancy. Search by company, title or location; filter for records with recovered text; open a record to inspect source text and provenance. Historical tracker decisions are not a fresh fit assessment. A captured page or structured description does not establish completeness, an open vacancy, or a current application link. Pages that disallow automated access, fail or do not yield substantial text remain listed with no recovered text; cached notes can contain excerpts or analysis.

The tracker browser is separate from the fictional evaluator. Imported postings do not receive a generated status or ranking: evaluation of arbitrary real job descriptions is a future feature. Extraction and review of the user's tracker data are performed outside the repository. Only synthetic tracker fixtures are included in the tests.

## What the evaluator does—and does not do

This is an explicit **rules prototype**, not AI analysis or a faithful implementation of every qualitative judgment in Cormac's ChatGPT work agent. Fictional resumes contain readable annotations such as `Evidence [requirements]: Demonstrated | Led discovery workshops...`. The parser reads these declarations; it does not independently infer or verify career achievements. Ordinary resumes can be extracted, but unrecognized evidence remains Unknown until the user reviews it. Simply mentioning a skill does not establish capability. These annotations deliberately make controlled examples reproducible; they are not a production resume format requirement.

Each fictional role has three defining responsibilities, detailed essential/preferred requirements and structured central-work criteria. Results show evidence, gaps and specific investigation questions. Supporting keyword counts never compensate for central gaps. Categories are computed from reviewed evidence, not preassigned to files or listings.

Prototype rules, in order:

- A confirmed modeled gate failure (maximum annual CAD pay below $60,000 or explicitly unmet mandatory French) produces Weak Fit, used here as the fourth exclusion category.
- Two or more defining responsibilities with Limited or No evidence produce Weak Fit; this describes an evidence gap, not proof of inability.
- Unknown mandatory French, unknown defining evidence, or one substantial central gap produces Investigate with a specific question.
- An explicit adjacent transfer produces Consider.
- Otherwise direct central-work evidence produces Fit; minimum annual CAD base pay above $100,000 changes it to Consider as a competition cue. Exactly $100,000 does not; a Senior title by itself does not change it.

This intentionally limited prototype does **not** model all geography, authorization, credentials, industry preferences, preferred-profile caps, alternative qualifications or nuanced comparisons of scope, depth and authority. The displayed full description supports human review; only the structured criteria drive rules. Compensation rules now handle unknown salary, pay source, CAD hourly and EUR annual thresholds, and avoid inventing a UK minimum. Those capabilities are tested in the rule layer; the current visible fixtures remain CAD annual. A later semantic evaluator needs its own evidence extraction, validation and regression evaluation before replacing these rules.

## Document handling

PDF and DOCX files up to 10 MB are accepted. Document parsers load on demand for the selected format, so DOCX reads do not initialize the PDF parser. The app enforces an 11 MB total request limit while reading the actual upload stream (including requests without a size header), then a 10 MB per-file limit. It checks extension and a basic file signature, then extracts plain text using pdf-parse or Mammoth. Corrupt/encrypted documents and PDFs without readable text return errors. OCR is not provided. The application processes files in server memory, does not write uploaded files to disk or a database, does not log resume contents and does not forward them to an external service. Responses use `Cache-Control: no-store`. Browser selection is separate from the explicit upload action. No claim is made about infrastructure-level retention.

Use fictional files in this development prototype. It lacks authentication, rate limiting, malware scanning, robust decompression/resource limits and a production retention/consent policy. Keep the development port private; do not expose this upload endpoint publicly as-is.

## Architecture

```text
src/app/                       Pages, shared styles, resume extraction API
src/components/dashboard.tsx   Filters, saved roles, evaluation results and details
src/components/resume-workbench.tsx  File selection, upload, review and evaluation action
src/lib/jobs.ts                Typed detailed fictional roles and preference filters
src/lib/matching/              Evidence retrieval, parsing, compensation, reports and category rules
public/sample-resumes/         Annotated and ordinary fictional PDF/DOCX resumes
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

See [evaluation design and remaining work](docs/evaluation-design.md) for the source-rule mapping and boundaries.

Calibrate the structured rubric against actual work-agent decisions; build a reviewed semantic extraction adapter rather than keyword scoring; add the unmodeled gates and qualification rules; harden upload processing before public use; then introduce permitted live job sources and persistence. No paid service or public deployment has been configured.
