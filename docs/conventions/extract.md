# Taking something new from the blog engine

The rule is invariant 4: it comes through [`tools/extract.ts`](../../tools/extract.ts) or it
does not come.

## Before anything

`../quireink` is **read only**. Read it with absolute paths. Never `cd` into it: the shell keeps
its working directory between commands, and a later heredoc lands in the wrong repository.
Six files went in that way once in the theme's history, and the symptom lies — `php -l` passes
on the file it just wrote while `ls` from here says the file does not exist.

## Adding a source

1. Import the engine module in `tools/extract.ts`. Do not read its file as text: an import is
   type-checked and a string match is not.
2. Rewrite site-root URLs. The engine writes `url(/fonts/…)`, which resolves against the
   WordPress site root and 404s. There is one regex for every sheet and a guard that reads the
   written file back looking for survivors — because the first version of that rewrite was a
   string swap on the quoted form and missed every unquoted one, and the difference between a
   404 and a 200 was invisible in a screenshot.
3. Run `bun run extract` and **read the diff**.
4. Run `bun run check:all`.

## What a red `check:generated` means

The engine moved. That is the seam reporting, not a failure. Re-extract, read the diff,
commit both together.

## What does not come

Anything the block editor cannot author. Building the reading side of something with no
authoring side ships markup nobody can produce, which is the theme's ADR 0003 and the reason
this plugin exists at all.
