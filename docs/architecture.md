# Architecture

The running vertical slice has three execution surfaces: Next.js renders the citizen interface and hosts a read API; Fastify provides an optional standalone API using the same service; BullMQ workers fetch, parse and validate official artifacts. Shared TypeScript packages implement money calculations, record schemas, provenance and deterministic Signals.

## Current data path

Fixed government URL → original bytes → SHA-256 / write-once snapshot → parser → typed records → reconciliation → whole-dataset publication → server-side repository → interface/API.

`data/published.json` is the current store. Only a PUBLISHED dataset is served. Both collectors share a filesystem writer lock; publication uses atomic rename in the same directory. No partially parsed records reach the read API. An interrupted process may leave a lock; the runbook covers recovery. This is a single-host development design, not a distributed transactional store.

## Production migration

`packages/db/001_initial.sql` defines provenance, snapshots, geography (PostGIS), public money categories, government bodies, schemes, projects, tenders, contractors, evidence-bearing relationships, progress/outcomes, validations and Signals. Published-money and non-fixture Signal views form the intended read boundary. Revenue/expenditure/budget/release entities are views over typed money facts to avoid inconsistent duplicate amounts. Grant service users read access to views only; ingestion and publication roles must remain separate. Harden state transitions and immutable published datasets before production.

`packages/db/postgres.ts` contains optional parameterized project and contract queries. It is not the application's selected repository yet. Production requires a transaction-backed publisher and a migration/import tool, PostGIS boundary import, S3-compatible object storage with retention/object lock and private access, and Redis-backed rate limits.

## Money and relations

Integer rupees are represented as decimal strings in JSON and `numeric(30,0)` in SQL. BigInt implements all authoritative arithmetic. Floating point is used only for chart widths and display percentages. A contract award never becomes payment. Relationship edges require evidence, effective dates and a specific relationship type. There is no presumed end-to-end transaction chain.

## Ask Paisa

The provider adapter returns a Zod-validated constrained intent. A deterministic function selects published records and renders answers; no arbitrary SQL is accepted. The current provider is a conservative keyword fallback, not an LLM. Unsupported time periods, unavailable metrics and project queries produce a no-data answer. Add an LLM only as an intent provider; continue to reject invented metrics, sources and arithmetic.

## Privacy

No authentication, analytics or identity inputs. My Tax amount lives in React state and never leaves the page. Language/display preferences alone use localStorage. Local fonts avoid font-provider requests. OSM maps disclose ordinary network request metadata to the tile service. Deploy a policy-compliant tile provider or self-host for production. Disable raw query logging at gateways before public deployment.
