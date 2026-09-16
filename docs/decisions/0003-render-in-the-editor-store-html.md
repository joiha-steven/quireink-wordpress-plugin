# 0003 — The engine runs in the editor; WordPress stores HTML

**In force.**

## Context

The blog engine's Markdown parser is 4,513 shipping lines of TypeScript held by a golden
corpus, a CommonMark spec suite and a round-trip test. WordPress renders in PHP.

Three architectures were available:

1. Run the engine in the browser at authoring time; store HTML in `post_content`.
2. Store Markdown; port the engine to PHP and render at display time.
3. Store Markdown; render in JavaScript at display time.

## Decision

Architecture 1.

## Consequences

**Option 2 is the one worth naming as rejected.** A PHP port is a second implementation of a
parser whose own repository carries the scar of exactly this: `pen/grammar.ts` there exists
because four parsers once spelled one regex out separately, two drifted within the hour, and
the word "green" appeared in every excerpt on a live site. That was one regex between modules
in one language. A 4,513-line parser across two languages and two repositories would drift
permanently and silently, and the symptom would be somebody's published post rendering
differently from their draft.

Option 3 loses server-rendered HTML: bad for search, bad without JavaScript, bad for the first
paint. The engine's whole reputation is a 123 KB page.

The cost of option 1 is that content is stored rendered, so a later change to the engine does
not reach posts already written, and re-editing means the editor reading HTML back. The engine
already has both halves of that bridge (`md/to-editor.ts`, `md/from-editor.ts`) — though they
target its own editor document, not Gutenberg blocks, so the second half is new work.

This decision is about the Markdown track. The pen ships first and needs none of it: a format
button writes a `<mark>` directly.
