# 0005 — GPL v2 or later

**In force.**

## Context

wordpress.org requires a plugin in the directory to be GPLv2-compatible, and that requirement
reaches everything the plugin ships, including generated assets.

The blog engine is not GPL. Its licence opens 48 months after release.

## Decision

This plugin is **GPL v2 or later**. The ink sheet it generates from the engine is published
under that licence as part of it.

## Consequences

This is a deliberate, one-directional grant: a GPL copy of the pen exists, and it is this one.
It does not relicense the engine, and nothing generated here flows back.

It is also the reason invariant 4 is strict about hand-copying. The boundary between the two
licences is the extractor, and a value carried across by hand crosses it without a record.

The theme made the same decision, for the same reason, in its ADR 0005.
