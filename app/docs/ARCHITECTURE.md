# Offline Subtitle Factory architecture

## Module boundaries

```text
Electron main.mjs ──▶ server.mjs (stable bootstrap) ──▶ server-runtime.mjs (HTTP routes and compatibility runtime)
                           │
                           ├─ settings / errors / utils
                           ├─ JobManager ──▶ AsrRunner / TrimRunner
                           ├─ ModelManager / health-check
                           └─ lib/ai and media domain modules

Browser pages ──▶ public/shared/api.mjs + state.mjs + components.mjs
                    ├─ public/app/index.mjs ──▶ app.js compatibility entry
                    └─ public/review/index.mjs ──▶ review.js compatibility entry
```

## Data flow

1. The browser sends `POST /api/jobs` and the server creates `jobs/<id>/` with input, working, review-output, output and logs directories.
2. `POST /api/jobs/:id/start` places a job in the bounded queue. Queue state is persisted to `.queue-state.json` and running jobs are marked `interrupted` after a server restart.
3. ASR, rule cleanup, human review and export continue to use the existing `job-status.json` contract. JSONL events are appended to `logs/job.log.jsonl` without removing the legacy plain-text log array.
4. AI provider settings are migrated to schema v3 while provider-specific migration and secret handling remain in `lib/ai/provider-migration.mjs` and the Electron safe-storage boundary.

## Design decisions

- Keep route paths and payloads stable while extracting pure functions and domain boundaries incrementally.
- Keep the server local-first: API token, loopback origin checks and explicit cloud consent remain enforced.
- Cache model inspection by directory mtime/size; cache external tool probes with different TTLs and allow `refresh=1` to bypass them.
- Preserve the legacy page scripts as compatibility entries until all page features can be independently moved behind the shared modules.
