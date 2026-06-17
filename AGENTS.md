<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Satellite tracking implementation rules

Before writing or changing code for satellite orbit drawing, TLE ingestion, SGP4 propagation,
ground tracks, footprints, or position prediction, read `docs/satellite-tracking.md` and
follow it as the source of truth.

## UI implementation rules

Before writing or changing UI, read `docs/shadcn-ui-agent.md` and follow it as the source of
truth. Use shadcn/ui components by default. If a needed shadcn/ui component is missing, add it
with the shadcn CLI instead of hand-coding a custom primitive.

## Commit message rules

Before creating a commit, read `docs/commit-agent.md` and follow it as the source of truth.
Use Conventional Commits such as `feat: ...`, `fix: ...`, `docs: ...`, `build: ...`, or
`chore: ...`.
