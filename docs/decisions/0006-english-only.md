# 0006 — English strings only

**In force.**

## Context

The plugin is translation-ready: every string passes through the WordPress i18n functions with
the text domain `quire-ink-pen`, and a `.pot` file is generated and shipped.

Shipping an actual translation is a different commitment. It is a promise to keep it current
through every release, and a stale translation reads worse to its audience than English does.

## Decision

English strings only. Translation-ready, no translations in the tree.

## Consequences

The directory's translation platform can carry community translations without anything
changing here, which is the mechanism that is meant to carry them.

The theme decided the same in its ADR 0004. Whether either gets a first-party Vietnamese
translation is the owner's call and is tracked in the programme's open questions.
