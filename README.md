# Horizon Engine

A multi-brand futures-intelligence pipeline: point it at a brand config and it
runs signal ingestion → LLM extraction → embedding-based dedupe/clustering →
driver synthesis → scenario generation → strategic impact matrix, with a
cost estimate shown *before* you spend anything and the real cost reported
after.

This is the generalized rebuild of the original single-file "HORIZON v3.0"
Mars Pet Care prototype -- that version had every signal, cluster, driver,
and scenario hand-typed into one React component with no ingestion pipeline
and a cosmetic client-side password. This version separates data from
presentation, runs a real (optional) LLM/search/embedding pipeline per brand,
and replaces the password with a server-verified session.

## Architecture

```
shared/    zod schemas (Signal, Driver, Scenario, ScanScope, CostEstimate...)
           + the pricing table and cost estimator -- single source of truth
           for both backend and frontend.

backend/   Express API + SQLite persistence + the pipeline itself.
           src/providers/   Search / LLM / Embedding provider interfaces,
                             each with a zero-cost mock and a real
                             implementation (Tavily, Anthropic, Voyage).
                             Missing an API key for a stage? It silently
                             falls back to that stage's mock -- the whole
                             pipeline still runs, for free, for development.
           src/pipeline/    ingest -> extract -> dedupe/cluster ->
                             driver synthesis -> scenario generation ->
                             strategic matrix -> timeline.
           src/auth.ts      Real auth: bcrypt password check, signed
                             httpOnly JWT session cookie.
           src/routes.ts    REST API (see below).

frontend/  Vite + React. Brand setup, a scan launcher with a live cost
           estimate that recalculates as you move the scope sliders, and a
           generic results viewer driven entirely by the fetched ScanResult
           JSON (no brand name is hardcoded anywhere in the UI).
```

## Why signals are gathered differently than the prototype

The prototype's "clustering" was a string field a human typed per signal, and
its 123-signal count didn't reconcile against the ~107 actually-distinct
signal objects in the data (dozens were near-duplicate rewordings). This
version:

- **Designs queries, then searches** -- template queries derived from brand
  config are augmented by an LLM pass that proposes adjacent-field,
  regulatory, and contrarian probes the templates can't anticipate. When a
  brand has curated source domains, ~70% of queries are restricted to them
  (the evidence core) and the rest sweep the open web (the surprises).
- **Dedupes automatically** -- every extracted signal is embedded, and
  anything above a cosine-similarity threshold against an already-kept
  signal is dropped before it reaches clustering.
- **Hunts absences and counter-signals as a corpus-level pass** -- absence
  signals ("all the ingredients exist, nobody has combined them") and
  counter-signals (evidence cutting against the corpus's own consensus)
  can't come from single-document extraction by definition. A dedicated
  LLM pass reasons over the whole deduped corpus, and its outputs are
  marked as derived (never "Verified") with the signal IDs that imply them.
- **Clusters from embeddings when available, LLM grouping otherwise** -- when
  an embeddings provider is configured (`VOYAGE_API_KEY`), clusters are
  proposed by greedy agglomerative clustering over embeddings (a stable,
  data-driven grouping) and only *named* by an LLM afterward. With no
  embeddings provider, the same stage instead has the LLM assign each signal
  to a theme in one pass, then validates the assignment (every signal placed
  exactly once, gaps repaired by round-robin) -- so the tool runs on Anthropic
  alone, with no separate embeddings vendor. Dedupe follows the same
  either/or: cosine-similarity on embeddings, or an LLM duplicate-grouping pass.
- **Separates driver synthesis from cluster naming** -- naming a cluster and
  reasoning about the macro force it represents are two different LLM calls
  with two different prompts, so the "why does this matter" reasoning isn't
  contaminated by the pressure to also produce a catchy label.

## Grounded scenarios

Scenario generation receives the actual evidence signals behind its drivers
(not just driver summaries) and is instructed that every concrete fact in
the narrative must come from that evidence, cited inline like [S-004].
Cited IDs are parsed back out of the dispatch text, validated against the
scan's real signals, and rendered as a clickable evidence list under each
scenario. A scenario that cites nothing is force-downgraded to "Contested"
confidence and flagged UNGROUNDED in the UI -- the narrative doesn't get to
borrow credibility it didn't earn. Each scenario also returns 2-3 concrete
recommended actions, which is what the Now/Monitor/Prepare timeline is
built from.

## Robustness

Extraction runs with bounded concurrency and per-document failure tolerance
(a bad document is skipped and counted, not fatal). Every LLM-JSON call
retries once on malformed output, with both attempts' usage billed honestly.
Gap analysis and query design are enhancements, not dependencies -- if they
fail, the scan continues without them. On server restart, scans orphaned
mid-run are marked failed instead of showing "running" forever.

## Spend governance (optional, for org rollout)

Two env vars, both off by default: `MAX_SCAN_USD` blocks any scan whose
high estimate exceeds it (the UI shows the reason and suggests reducing
scope); `MONTHLY_BUDGET_USD` blocks new scans once the month's committed
spend (actuals for finished scans, high estimates for in-flight ones) would
exceed the budget.

## Cost estimation

`shared/src/estimator.ts` turns a `ScanScope` (source query count, docs per
query, driver/scenario counts) into a low/high USD range per pipeline stage,
using real per-model LLM pricing (`shared/src/pricing.ts`) and
operator-configurable search/embedding unit prices. The frontend calls
`POST /api/scans/estimate` on every scope change so the estimate updates live
as you tune scan scope, *before* you commit to running it. After a scan
completes, real per-call usage (tokens, search calls, embedding tokens) is
summed into `actualCostUsd` so the estimate can be checked against reality.

## Running it

```bash
npm install
npm run build --workspace shared   # shared must be built before backend/frontend type-check against it

# Backend
cd backend && cp .env.example .env   # set SESSION_SECRET + AUTH_PASSWORD at minimum
npm run dev --workspace backend      # http://localhost:8787

# Frontend (separate terminal)
cd frontend && cp .env.example .env
npm run dev --workspace frontend     # http://localhost:5173
```

Without `ANTHROPIC_API_KEY` / `TAVILY_API_KEY` / `VOYAGE_API_KEY` set, every
stage runs against its mock provider -- the full pipeline executes for free
so you can verify the plumbing. Add real keys to get real ingestion and
analysis; costs are then real too, which is the whole point of showing the
estimate before you run it.

`npm run smoke --workspace backend` runs the pipeline directly (no HTTP
server) against mock providers only, for a fast plumbing check.

## Deploying on Vercel

The repo is wired for Vercel out of the box: the frontend deploys as a
static build, and `api/index.ts` wraps the same Express app as a serverless
function (`/api/*` is rewritten to it).

**Scans run as a resumable step pipeline.** There is no background job:
`POST /scans/:id/step` advances the pipeline by exactly one bounded stage
(ingest, extract, analyze, drivers, a batch of scenarios, matrix) and
persists a checkpoint; the open scan page calls it in a loop until done.
Each step finishes well inside the function's `maxDuration`, an interrupted
scan resumes from its checkpoint instead of losing paid work, and a scan
nobody resumes for 10 minutes is surfaced as failed by a staleness guard.

1. **Import the repo** at vercel.com/new (or `vercel` CLI). No framework
   preset needed -- `vercel.json` carries the build config.
2. **First deploy works with zero env vars**: mock providers, starter
   password `longview`, ephemeral `/tmp` SQLite. Good for kicking tires;
   data does not survive between serverless instances.
3. **For real use, set env vars** in the Vercel project:
   - `SESSION_SECRET` -- long random string (required once API keys are set)
   - `AUTH_PASSWORD_HASH` (bcrypt) or `AUTH_PASSWORD` -- required once API
     keys are set; the `longview` default only applies in keyless mock mode
   - `ANTHROPIC_API_KEY` -- required for real analysis (extraction, clustering,
     drivers, scenarios). `TAVILY_API_KEY` -- live web search for ingestion.
     `VOYAGE_API_KEY` -- **optional**; enables embedding-based dedupe/clustering.
     Without it, the LLM does the grouping, so the pipeline needs only Anthropic
     + Tavily (Anthropic has no embeddings API of its own).
   - `POSTGRES_URL` (or `DATABASE_URL`) -- attach the Neon integration from
     the Vercel Storage tab; the storage layer switches from SQLite to
     Postgres automatically
   - optional: `MAX_SCAN_USD`, `MONTHLY_BUDGET_USD` spend caps
4. **Auto-deploys**: once the GitHub repo is connected in Vercel, every push
   to `main` deploys production; branches get preview URLs.

Because each step is short, even Deep-tier scans have no total-duration
ceiling -- the scan takes as many steps as it takes, as long as the scan
page stays open to drive them. For sustained heavy or fully unattended use,
a small always-on host (Railway/Fly/Render) remains a natural alternative --
the same repo runs there via `npm run build && npm run start --workspace
backend`.

## What's still manual / out of scope for this pass

- Scenario prose and driver synthesis are single-shot LLM calls with no
  human-in-the-loop review gate before being persisted -- add one before
  treating output as publishable without review. (Citations + the
  UNGROUNDED flag mitigate but don't replace review.)
- Auth is a single shared password with one operator session -- fine for a
  small trusted pilot, but org-wide rollout wants per-user accounts or SSO
  for scan attribution and per-user cost accounting.
- Full-article fetching: extraction currently runs on search snippets.
  Fetching and extracting from full articles would deepen signals at
  roughly 3-5x the extraction token cost.
- The matrix stage scores scenarios per business unit from titles/taglines
  only; it isn't yet cross-checked against underlying signals the way
  drivers and scenarios are.
- On serverless, scans run inside the request instance via `waitUntil`
  rather than an external job queue -- fine at pilot scale, but a queue
  (and per-stage checkpointing) is the right shape for heavy concurrent use.
