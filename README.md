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

- **Dedupes automatically** -- every extracted signal is embedded, and
  anything above a cosine-similarity threshold against an already-kept
  signal is dropped before it reaches clustering.
- **Clusters from embeddings, not LLM free-association** -- clusters are
  proposed by greedy agglomerative clustering over embeddings (a stable,
  data-driven grouping), and only *named* by an LLM afterward. An LLM never
  decides cluster membership on its own.
- **Separates driver synthesis from cluster naming** -- naming a cluster and
  reasoning about the macro force it represents are two different LLM calls
  with two different prompts, so the "why does this matter" reasoning isn't
  contaminated by the pressure to also produce a catchy label.

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

## What's still manual / out of scope for this pass

- Source selection is currently a fixed template derived from brand
  config (industry/business-unit/competitor/geography permutations) --
  a real deployment would want per-brand source curation (trade press,
  regulatory feeds, patent databases) rather than generic web search.
- Scenario prose and driver synthesis are single-shot LLM calls with no
  human-in-the-loop review gate before being persisted -- add one before
  treating output as publishable without review.
- Matrix and timeline stages are per-business-unit / heuristic
  respectively; they aren't yet cross-checked against the underlying
  signals the way drivers are.
