# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quality gate

**All gates MUST pass before any task is marked complete. No exceptions.**

- `npm run format` — auto-formats
- `npm run lint` — must exit with zero errors; fix all errors and re-run until clean
- `npm run test` — must complete with zero errors

If a step fails: fix the issue, then re-run from that step.
