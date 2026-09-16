# Release checklist

## Before

1. `bun run check:all` green.
2. `bun run extract` produces no diff. If it does, the engine moved since the last release and
   the diff is part of this release.
3. **Look at it.** A post with all three gestures, both schemes, on the Quire Ink theme AND on
   Twenty Twenty-Five. Four screenshots. Every guard can be green while a stroke sits a line
   too high, and the standalone case is the one nobody looks at.
4. The version agrees in four places — plugin header, `QUIREINK_PEN_VERSION`, `readme.txt`
   `Stable tag`, `package.json`. `check:headers` holds this.
5. `readme.txt` changelog has an entry for this version, and `Tested up to` names a WordPress
   that actually exists.
6. Regenerate the `.pot`.

## Versioning

**Do not auto-bump.** The version is set deliberately, by the owner, as part of deciding that a
release is happening.

## After

Once a version is approved it is downloadable forever and the SVN tag cannot be deleted. A bad
`Stable tag` reaches every existing install as an update.

Record the submission and anything the reviewer said in the programme's private repository,
under `directory/`.
