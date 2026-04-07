# Docs Index

This repo keeps only the stable public docs surface in git.

## Structure

- [api](./API.md): backend contract docs
- [common issues](./COMMON_ISSUES.md): setup, runtime, and debugging shortcuts
- [roadmap](./ROADMAP.md): version ladder across all phases

Only these docs are meant to be pushed:

- `README.md`
- `docs/API.md`
- workflow docs such as `docs/README.md`, `docs/COMMON_ISSUES.md`, and `docs/ROADMAP.md`

Versioned planning notes and internal tasklists may still exist locally during development, but they are not part of the tracked public docs surface.

Practical rule:

- keep internal design notes and tasklists locally if needed
- do not stage or push any markdown outside the allowlist above
