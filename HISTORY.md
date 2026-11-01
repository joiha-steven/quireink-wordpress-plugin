# History — why the rules in CLAUDE.md exist

Not loaded automatically; `CLAUDE.md` points here. Read it when a rule looks arbitrary. No personal data.

## Verify

`check:all` proves the seams hold. It cannot tell you the stroke sits a line too high, that the highlight is
behind the text instead of under it, or that the toolbar button is invisible in the editor's dark scheme.

`tools/screen-audit.js` reads the TEXT edge, not the box: the first version measured boxes and passed a screen
with four different left edges. `shot.sh` runs a fresh headless Chrome, so a scheme you switched in YOUR browser
is not in its; `docs/shots/paired-dark.png` was captured light the first time, which is why the rule says to set
`quireink_default_scheme` as a theme mod and put it back. Port 8098 not 8099: the theme's dev stack owns 8099 and
both are often up at once, which is the only way to see the pairing work.

## Hard rules

- Quire Ink read-only: six files went into the wrong repository once, and the symptom lies — `php -l` passes on
  the file it just wrote, `ls` from here says the file does not exist, and you go looking for a disk problem.
- One seed hash, one argument: `formats.js` hashed the bare text for a release — same function, same fixtures, and a
  different stroke for every real mark. The block editor drew variant 71 where the Quire Ink editor drew 43.
  The engine hashes `node.raw` (fences and `#colour` included) and folds it by the length of what is INSIDE the fences.
- Build the authoring side first: inherited from the theme's ADR 0003; it is why this plugin exists.

## Danger zones

- The compressed size is the whole reason the plugin is possible: 604,910 B raw, 34,906 B gzip, budget 44,000.
  `check:filesize` gzips the sheet on every run, because a raw byte comparison would have passed on the day a change
  made the sheet stop compressing.
- The engine bundle is `bun build` over the sibling checkout, 79 modules including ProseMirror; `check:generated`
  reports the engine VERSION, the exported API and the golden render instead of a byte diff.
- `localhost:8098`, never `127.0.0.1`: with the wrong host the type falls back to something close enough that nobody looks twice.
