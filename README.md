# Align

Align is a private Codespace job tracker with resume-based evaluation.

## Imported-job workflow

1. Open **Import or back up jobs** in the sidebar and import a tracker spreadsheet or recovered Align JSON file. Jobs and bookmarks persist in the private Codespace database.
2. Select a PDF/DOCX resume. Align automatically extracts it and evaluates all stored imported jobs using the server's installed, ChatGPT-signed-in Codex CLI. Pasted text starts with **Use pasted resume**.
3. Follow queue progress below the resume upload and open job details for reasons and source evidence. Labels are **Fit**, **Consider**, **Investigate**, and **Weak Fit**. Per-job checklists are removed. Missing, short or truncated descriptions remain Investigate without model inference.

**Data sharing:** extracted resume and job text are sent to OpenAI, using your Codex plan limits. No API billing is configured. The app does not store resumes or evaluation results; results clear on refresh. Imported jobs/bookmarks are stored in ignored `.align-data/`. Do not add personal imports, resumes, credentials or database files to Git. No personal data is included in the fictional test fixtures.

Codex must be installed and signed in with ChatGPT (`codex login status`). The faster option uses `gpt-6-luna`, subject to account and CLI availability; it may be less accurate than the standard Codex default. Choose a model before selecting a resume. If the faster model is unavailable, remove the resume, choose standard, and select it again. The app evaluates one job at a time, and actual speed depends on the model and service. No API-key fallback is provided. Failed or invalid evaluations stop with a retry option; they never become guessed verdicts. Retry skips completed jobs while the same page, resume and job list remain open; results still clear on refresh. Read the [evaluation design and limitations](docs/evaluation-design.md) for the rubric, isolation, privacy and retention boundaries.

## Local development

```sh
npm ci
npm run dev
```

Keep the Codespace forwarded port **private**. This app is intended for a single user behind that private preview; it has no public account or tenant isolation layer. Do not deploy publicly without additional access controls. No public deployment has been configured.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite uses an isolated temporary SQLite database and fictional resumes/jobs. To test actual Codex connectivity with fictional data only:

```sh
ALIGN_CODEX_SMOKE=1 npx vitest run src/lib/matching/codex.test.ts
```

PDF and DOCX extraction accepts files up to 10 MB. Scanned PDFs require OCR, which is not implemented. Sample opportunities remain a separate manual demonstration of the existing evidence rubric. Sample resume files under `public/sample-resumes` contain fictional data.
