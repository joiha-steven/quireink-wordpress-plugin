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

## When the blog engine releases a new version

This is the whole point of the seam, so it is one command and three lines of reading:

```bash
bun run extract      # rebuild the ink and the engine bundle from the sibling checkout
bun run check:all
```

`check:generated` will **not** ask you to read a diff of a 600 KB minified bundle. Nobody can
read one, so nobody would, and a check whose output is unreadable gets approved blind. It
reports the three things a person can actually judge:

| It says | Which means |
|---|---|
| `engine version: v2.2.11 -> v2.3.0` | what moved |
| `engine API: unchanged` | nothing this plugin calls has disappeared |
| `golden: unchanged` | `==x==` still renders to the same HTML |

If the API line names something **REMOVED**, [`tools/engine-entry.ts`](../../tools/engine-entry.ts)
still asks for it and the editor will throw at run time, in front of an author, with no
warning anywhere else. Fix the entry or the call site before committing.

If the **golden changed**, the check prints the before and after lines. That is a change to
what a post looks like, and it is a decision rather than a formality: somebody's published
writing renders differently after this update.

Otherwise it is just bytes, and committing them is the whole job.

## Keep `engine-entry.ts` short

It is the ONE door into the engine, and every export in it is a promise this plugin has to
keep working across upstream releases that know nothing about it. Six names today. A seventh
should have to earn its place.

## What a red `check:generated` means

The engine moved. That is the seam reporting, not a failure. Re-extract, read the three lines,
commit both together.

## What does not come

Anything the block editor cannot author. Building the reading side of something with no
authoring side ships markup nobody can produce, which is the theme's ADR 0003 and the reason
this plugin exists at all.
