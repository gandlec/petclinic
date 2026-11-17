# Project Memory
New conversations in this folder auto-load this file.
Add to rules here to prevent repeating AI fail/slop.
Carefully review its contents at every retrospective to remove: obvious, duplication, conflicts, drift, CYA comments.

## AGENTS.md is the single source of truth
Claude Code: never write rules into `CLAUDE.md`.
GitHub Copilot: never write rules into `.github/copilot-instructions.md`.

## Project Overview
Full-stack PetClinic application, managing veterinary clinic operations (owners, pets, vets, visits, specialties)

**Structure:**
- `petclinic-backend/` - Spring Boot 3.5 REST API (Java 21), Maven-built
- `petclinic-frontend/` - Angular 16 SPA (Angular Material + Bootstrap 3), npm built
- `notification-service/` - Spring Boot app on :8090 that texts owners; the backend POSTs to it after every booked visit
- `petclinic-commons/` - jar both apps depend on, `mvn install`ed first; every call crossing it is traced (AspectJ)
- `petclinic-database/` - Maven module building the embedded-Postgres launcher jar started by `./start-database.sh`
- `petclinic-observability/` - Tempo/OTel config for `./start-tempo.sh` and `./start-grafana.sh`
- `petclinic-test/` - Playwright/Cucumber e2e suite against the running apps; own [AGENTS.md](petclinic-test/AGENTS.md)
- `petclinic-chatbot/` - optional Spring AI triage assistant on :8082, calls the backend's MCP server; see its [README](petclinic-chatbot/README.md)
- `docker/` - compose files for `./start-docker.sh`, a per-branch containerized instance of the whole stack
- `refactoring-tools/` - self-contained OpenRewrite recipes module, run against the backend from the CLI; see its [README](refactoring-tools/README.md)

## Common Commands

### Helper Scripts
Each script is foreground; run them in separate terminals.
```sh
./start-database.sh        # embedded Postgres on localhost:5432, built from petclinic-database/
./start-backend.sh         # starts notification-service on :8090 and backend on :8080 (also MCP at /mcp) after installing commons
./start-frontend.sh        # Angular dev server on localhost:4200
./start-grafana.sh         # Starts grafana on localhost:3300 in a docker container
./start-tempo.sh           # No-Docker alternative to start-grafana.sh: Tempo alone, :3200 + OTLP :4318
./start-docker.sh          # The whole stack containerized, one isolated instance per branch (see docker/)
```
Wait for `✅ started <name> on port <n>` or `❌ …`, never for a fixed timeout. A port held
by an orphan is reported in < 1s, before anything is built or wiped — the script
prints the squatter's PID and stops; killing it is your call.

### Frontend (petclinic-frontend/) — non-obvious scripts only
```sh
npm run test-headless    # Karma in headless Chrome, what CI runs
npm run test:arch        # imports adhere to docs/frontend-packages.puml
```

## Architecture

Backend layering, the database, the REST contract and the domain model are scoped to
[petclinic-backend/AGENTS.md](petclinic-backend/AGENTS.md) — it auto-loads only for conversations
rooted there. Java code style is in the [java-code-style skill](.claude/skills/java-code-style/SKILL.md).
Before changing how the layers, the database or the notification call work, read the decisions
and their reasons in [ARCHITECTURE.md](ARCHITECTURE.md). When a guardrail test fails, or a living
diagram no longer matches the code, the drift checks and what each of them asserts are described
in [GUARDRAILS.md](GUARDRAILS.md).

## Additional Knowledge

### Frontend UX design system
`petclinic-frontend/src/app/design-system/` holds the standardised widgets. Every
single-select in a form goes through `<app-combo>` (`ComboComponent`), a
`ControlValueAccessor` that drops in where a `<select>` was — a raw `<select>` in a form
template is a bug, not a shortcut. Vet-edit's multi-select is still a `mat-select`; the
design system has no multi-select yet.

### /human-review is a plugin, and nothing of it lives in this repo

It is installed, not vendored:

```
/plugin marketplace add victorrentea/human-review
/plugin install human-review@human-review
```

Everything petclinic-specific about it is **`human-review.json`** at the root — the traced
test run, the Code City generator, the complexity extractor, the screens the design-system
audit visits. The skill itself knows nothing about this project, and a step this file does
not describe is skipped and named on the built page. That is the only file to touch when a
command here changes.

**Tooling changes go to `main` first.** Any change to the guardrails, the anti-drift checks or the `/human-review` wiring (`human-review.json`, `scripts/`, genseq, Code City, traces) made while working on a downstream PR branch is committed on `main`, pushed, and then merged into that branch (e.g. `test-pr`) — never left living only on the PR.

⚠️ **There is no symlink here any more, and putting one back in git is a mistake with a
history.** `.claude/skills/human-review` was committed for a while as mode 120000 pointing
at `/Users/<someone>/workspace/…`, so every clone of this public repo carried a link that
resolved for exactly one person on one laptop. Developing the skill against this repo does
not need one either — install the plugin from a local marketplace.

**Run the review passes before you ask for the guide.** `/human-review` no longer invokes
`/code-review` or `/simplify` — it writes up the passes that already ran in the
conversation, and stops with an explanation if it finds none. So the order is: finish the
work, run whichever passes you trust, *then* `/human-review`.

**The review guide is built by hand, not by CI.** It deep-links into a working tree and
drives a whole local stack — a browser, a database, Tempo, PlantUML, a Maven build — so
there is no online version and no PR automation for it. Run `/human-review` when you want
one. `diagram-preview.yml` still posts a PR comment rendering the branch's own diagrams,
which is a different and much cheaper thing: proxy URLs, no runner render, no publishing.

## Core Values
- Write non-trivial code using TDD
- Keep comments concise, prefer explanatory variable/method names
- Don't leave behind CYA comments when deleting or moving stuff
- Always run tests after any complex refactoring
- Be brief
- Challenge my prompts - I love hearing I'm wrong! Be a thinking partener, not a sycophantic yes-man.
- Before any git commit, make sure to update any drifted knowledge in AGENTS.md, keeping it under 200 lines: move details into separate docs that AGENTS.md links to (progressive disclosure)
- An AI-made commit ends with `Co-Authored-By: Claude <Model> (effort: <level>, context: <window>)`, e.g. `Co-Authored-By: Claude Opus 5.5 (effort: high, context: 1M)` — no `<noreply@anthropic.com>`
