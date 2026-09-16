# 0001 — The ink is generated from Quire Ink, never hand-copied

**In force.**

## Context

The pen is 531 KB of stroke geometry produced by `src/pen/dies-*.ts` and `pigments.ts` in the
blog engine: five inks, three gestures, 80 stroke variants each carrying its own weight, offset
and overrun. It is computed, not drawn, and it changes when the engine's palette work changes.

A plugin could carry a copy of the output. It would be correct on the day it was pasted.

## Decision

The sheet is produced by [`tools/extract.ts`](../../tools/extract.ts) reading the engine's own
modules, and `check:generated` is red whenever the checked-in copy differs from what the engine
would produce now.

No value is hand-carried. Not a colour, not an offset, not a stroke count.

## Consequences

A re-extract is a diff to READ, not to approve. The seam reporting red is the system working.

The sibling repository is optional: `check:generated` skips with a warning when there is no
Quire Ink checkout beside this one, so a contributor with only this repo can still run the
other guards.

The theme made this decision first and for the same reason. Its ADR 0001 is the longer version.
