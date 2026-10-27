# Align — AI job matcher foundation

A responsive portfolio MVP built with Next.js App Router, TypeScript, Tailwind CSS, and Lucide icons. The landing page introduces the product; `/dashboard` offers a working demonstration of job discovery.

## Run locally

Use Node.js 22.12+ (validated on Node 24) and npm.

```sh
npm ci
npm run dev
```

Open the development server on port 3000. For a production build:

```sh
npm run build
npm start
```

No API keys, environment variables, database, account, or paid services are required. If your npm cache is not writable, use `npm ci --cache /workspace/.npm-cache` in the cloud environment.

## What works

- Responsive landing page and dashboard with keyboard-accessible controls.
- Local resume file selection and drag-and-drop, replacement, and removal. Accepts PDF/DOCX extensions, rejects empty files and files larger than 10 MB. This is convenience validation, not content or malware verification.
- Immediate filtering by title, location, work arrangement, and minimum annual CAD salary. Salary filters include roles whose range reaches the chosen minimum.
- Save/unsave roles, a saved view, empty states, preference reset, and accessible role detail dialogs.

## What is simulated

All companies, roles, descriptions, salaries, posting ages, explanations, and scores are fictional demonstration data. Scores are fixed fixtures sorted highest first; neither resume selection nor preferences generate a score. No AI matching, document parsing, live search, application submission, authentication, or remote upload exists. Files remain in browser memory; preferences and saved roles last only for the current mounted dashboard and are cleared when leaving or refreshing. No application data is sent to external services.

## Architecture

```text
src/app/                 App Router pages, metadata, and shared styling
src/components/          Shared navigation and interactive dashboard
src/lib/jobs.ts          Typed demo fixtures, filters, file validation
src/lib/jobs.test.ts     Unit tests for filters and file validation
```

Pages remain separate from client interaction and typed domain utilities. A future job provider can replace the fixture source; document processing and matching should be separate server-side services with explicit contracts. Do not present the current fixture scores as model output.

## Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests run against the production build and cover navigation, filtering, saved roles, dialogs, resume validation, and responsive overflow at desktop and mobile sizes. They use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to your installed Chromium executable on other machines. Run `npm run build` before browser tests.

Unit tests cover combined filters, case/whitespace handling, ordering, empty results, immutable sample scores, and supported/invalid resume files.

## Next priorities

1. Expand browser coverage and run a dedicated accessibility audit across desktop and mobile.
2. Define resume parsing, consent, retention/deletion, and secure upload requirements before storing documents.
3. Introduce a normalized job-provider interface and permitted data source, with provenance and freshness indicators.
4. Design evidence-based matching and evaluation, including explainability, uncertainty, and user corrections, before introducing AI-generated scores.
5. Add persistence and authentication after privacy and authorization requirements are defined.

This project is an undeployed prototype. No paid APIs or public deployment have been configured.
