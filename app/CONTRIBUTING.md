# Contributing

## Development environment

- Node.js >= 22.12.0
- npm >= 10
- Git

```bash
npm ci
npm run check
npm run electron:dev
```

## Change workflow

1. Run `npm run project:preflight -- --type=development`.
2. Record the work in `docs/project-management/08-CHANGE-LOG.md` and update affected design documentation.
3. Keep server routes and the job data contract backward compatible unless the change explicitly declares a migration.
4. Add or update focused unit tests, then run `npm run check`.
5. Complete the project-document closeout and independent review requirements before release work.

## Code style

- Use ES modules and `const` by default.
- Public module functions should have clear inputs, outputs and error behavior.
- Keep secrets out of logs and preserve original media files.
- Run `npm run lint` and `npm run format:check` before opening a review.

## Branches and releases

Use `codex/` for Codex-created branches. Releases, tags, GitHub Releases and public assets require explicit authorization separate from local development changes.
