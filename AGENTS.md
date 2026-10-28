<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Project mission and product decisions

Align is an evidence-led job discovery and matching portfolio MVP. Preserve the existing product behavior and terminology documented in README.md. The user is a non-developer building from a Chromebook: optimize for an end-to-end cloud workflow that requires no local Linux setup, no manual Git commands, and minimal copy/paste.

- Deliver working, demonstrable vertical slices, not just scaffolding or design mockups.
- Keep distinctions between Fit, Consider, Investigate, and Weak Fit. Do not introduce unexplained percentage match scores.
- Clearly label fictional sample data. Do not imply live jobs, AI interpretation, or production privacy protections where none exist.
- No resume passage should be treated as proven competency without explicit user review. Preserve conservative evidence and eligibility assessments.
- Before significant changes, inspect the existing code and README; extend rather than replacing working features.

## How to execute coding requests

1. Translate each plain-English request into an observable outcome and make reasonable implementation choices without lengthy technical back-and-forth.
2. Inspect the relevant files and follow the existing Next.js/TypeScript/Tailwind conventions.
3. Implement the change, including loading, empty, error, and responsive states where relevant.
4. Run the applicable checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Run `npm run test:e2e` for affected user flows when the browser environment is available. Report checks not run and why; never claim a test passed without running it.
5. Review the actual diff for unintended changes and security/privacy issues before marking work complete.
6. Provide a concise nontechnical handoff: what changed, how to see it, checks run, limitations, and any exact user-only action.

## Chromebook-friendly workflow and deployment

- Work in GitHub-connected Codex/cloud environments whenever possible. Do not require the user to install Node, VS Code, Docker, or Git on their Chromebook.
- Prefer a browser-accessible preview for feature review. A deployment URL must be real and verified; never invent one.
- Do not claim a deployment, connected hosting account, live job feed, database persistence, or production readiness without verification.
- Keep secrets out of source control. Use platform environment variables and sample names only.
- The current SQLite tracker is development-workspace storage with no authentication; do not expose it on a public deployment or move its data into source control. Before deploying any tracker functionality, design secure per-user storage and access control, or clearly isolate a safe public demo.
- Avoid adding paid services or requesting credentials unless the feature requires them. Explain unavoidable setup as short, actionable instructions.
- Prefer isolated branches and pull requests for significant changes; do not disrupt an existing Codex task or overwrite another working branch.

## Communication style

The user wants to direct product outcomes, not manage the software internals. Write plain English, minimize jargon, and ask questions only if an essential business decision cannot reasonably be inferred. Summarize the result and identify the smallest next decision.
