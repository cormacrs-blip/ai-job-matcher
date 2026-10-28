# Align — evidence-led job matching prototype

A responsive portfolio MVP built with Next.js App Router, TypeScript and Tailwind CSS. The dashboard demonstrates a complete fictional resume-to-job evaluation flow using **Fit, Consider, Investigate, and Weak Fit**. There are no percentage match scores.

## Setup

Use Node.js 22.13+ (validated on Node 24) and npm. The single-user tracker uses Node’s built-in SQLite module.

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

Changing a file, removing it, reading it again or editing reviewed evidence clears prior evaluations. Replacing/removing a file or leaving the dashboard cancels the browser’s outstanding read request; this does not guarantee interruption of parsing already underway on the server. Download names never choose an assessment. Both PDF and DOCX contents are extracted. Filters accept any combination of Remote, Hybrid and On-site; none selected means all. Visible sample salaries are annual base CAD amounts. Tracker jobs and bookmarks are saved in the private Codespace. Reviewed resume evidence and new evaluation results remain in memory and reset on refresh.

## Save and evaluate tracker jobs

Open the dashboard and select the original `.xlsx` tracker or an `align-tracker-v1` JSON/JSON.GZ file. The spreadsheet is parsed in the browser, then normalized job records, historical statuses, notes and cached posting text are sent to this app and stored in a SQLite database under `.align-data/` in the Codespace. The spreadsheet file itself is not saved. The database is Git-ignored and is not committed or pushed to GitHub. Refreshing or restarting the app reloads jobs and bookmarks. A later import **merges**, rather than replaces, existing records; exact posting URLs are used as the cross-import identity. Records without URLs remain distinct unless the source row and job identity match. Changed historical statuses are retained as history and may show conflicts. Bookmarks survive subsequent imports.

Use **Download jobs backup** to save a private JSON backup including bookmarks. Import it to restore or merge into another workspace. Codespace disk storage is tied to that workspace and can be lost if the Codespace is deleted or its storage is reset; retain a backup. Data is not encrypted by this app, and this prototype has no authentication. Keep the development port private: anyone with access to the app can access the saved tracker. This is not a multi-user or public-production storage solution.

To evaluate an imported job, read and review the resume evidence in the sidebar, click **Use reviewed resume**, then open the job details. Review its description, choose 3–4 defining responsibilities, and confirm the vacancy, language and eligibility information you have actually checked. The rules compare the chosen responsibilities against the reviewed resume evidence. Missing description, vacancy or eligibility information produces **Investigate**. Unknown salary is neutral. The current supported responsibility list and rules are limited; this is a guided human-reviewed comparison, not an automated AI reading or full parity with the work agent. If the role is outside those categories or the description is partial, leave it unresolved. Historical tracker ratings remain historical. Newly reviewed resume evidence and evaluations are held only in the current browser session; they are not persisted or part of the jobs backup.

The spreadsheet import includes only text already in the workbook and does not fetch job sites. A separately recovered JSON can contain additional text. Captures may be incomplete, outdated, or mixed with notes. Current vacancy and descriptions must be verified before applying. The `xlsx` parser runs in the browser and is intended for trusted user-provided files. Role/location filters and multi-select work arrangements operate on tracker data; ambiguous arrangements and non-CAD, hourly or unclear salaries are included by default unless explicitly excluded. Saved bookmarks and historical rating filters work for tracker entries.

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
src/app/                       Pages, shared styles, resume extraction and tracker APIs
src/components/dashboard.tsx   Filters, saved roles, evaluation results and details
src/components/resume-workbench.tsx  File selection, upload, review and evaluation action
src/lib/jobs.ts                Typed detailed fictional roles and preference filters
src/lib/matching/              Evidence retrieval, parsing, compensation, reports and category rules
src/lib/tracker-store/         SQLite merge, bookmarks and backup restoration
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

Browser tests use a fresh temporary SQLite database, never the developer’s tracker, and require a production build and Chromium (`/usr/bin/chromium` by default; override `CHROMIUM_PATH` for your installed browser). Tests cover real PDF/DOCX uploads and text extraction, all four categories, changed outcomes after replacing the resume, missing evidence, file errors, multi-select filters, saved jobs, dialogs and mobile/desktop overflow. Unit tests cover extraction boundaries, explicit/unknown/duplicate evidence, central gaps, competition cues, salary/language gates and preference combinations.

## Next priorities

See [evaluation design and remaining work](docs/evaluation-design.md) for the source-rule mapping and boundaries.

Calibrate the structured rubric against actual work-agent decisions; build a reviewed semantic extraction adapter rather than keyword scoring; add the unmodeled gates and qualification rules; harden upload processing before public use; then introduce permitted live job sources and persistence. No paid service or public deployment has been configured.
