# Phased Rollout Checklist

Use this sequence to ship the redesign safely with clear rollback points.

## Batch 1 - Baseline + Guardrails

- Merge telemetry endpoint and web-vitals reporter.
- Merge CI updates (lint, type-check, targeted tests, build, perf budget).
- Confirm `npm run perf:budget` output is stable on main.

Rollback point: revert guardrail commit only.

## Batch 2 - Core Performance

- Merge middleware matcher scope reduction.
- Merge `next/image` wordmark migration and Tailwind content cleanup.
- Verify auth and legacy API behavior on `/signup`, `/founder`, `/investor`, and blocked legacy APIs.

Rollback point: revert middleware and media commit.

## Batch 3 - Shared Minimal Design System

- Merge global token/utility class updates in `app/globals.css`.
- Merge shared shell polish updates in header/footer.
- Visually verify light/dark readability and focus states.

Rollback point: revert design-system commit.

## Batch 4 - Priority Route Redesign

- Merge updated marketing home sections and hero refinements.
- Merge founder and investor landing card/section upgrades.
- Merge pricing page visual normalization.
- Validate homepage demo remains a strict 3-step flow: `Step 1 Upload` -> `Step 2 Score & Rank` (with live demo widget) -> `Step 3 Act`.

Rollback point: revert route redesign commit.

## Batch 5 - UX + Validation

- Merge founder layout gate/loading accessibility improvements.
- Run: `npm run lint`, `npm run type-check`, `npm run test:matching`, `npm run build`, `npm run perf:budget`.
- Compare Web Vitals trend from telemetry logs after deploy.

Rollback point: revert UX polish commit.
