// Invariant 4: the ink is what the engine emits today, not what it emitted once.
//
// Runs the extractor into a scratch directory and compares bytes. It does NOT write into the
// tree: a check that has to modify what is committed in order to run is a check people turn
// off, and then the thing it was guarding drifts for a month.
//
// A red result is the seam reporting, not a failure. The engine moved. Re-extract, READ the
// diff, and commit the two together.
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const QUIRE = join(process.cwd(), '..', 'quireink')
const SHEET = 'assets/css/quireink-pen.css'
const COMMITTED = join('quire-ink-pen', SHEET)

// A contributor with only this repository checked out can still run every other guard. Warning
// rather than failing is the difference between a project a stranger can build and one they
// cannot.
if (!existsSync(QUIRE)) {
  console.log(`  no Quire Ink checkout at ${QUIRE}`)
  console.log('⚠ check:generated: skipped')
  process.exit(0)
}

const out = mkdtempSync(join(tmpdir(), 'quireink-pen-extract-'))
try {
  const run = spawnSync('bun', ['tools/extract.ts'], {
    encoding: 'utf8',
    env: { ...process.env, EXTRACT_OUT: out },
  })
  if (run.status !== 0) {
    console.log('✗ check:generated: the extractor failed')
    process.stdout.write(run.stdout ?? '')
    process.stderr.write(run.stderr ?? '')
    process.exit(1)
  }

  const fresh = readFileSync(join(out, SHEET))
  const have = existsSync(COMMITTED) ? readFileSync(COMMITTED) : Buffer.alloc(0)

  if (fresh.equals(have)) {
    console.log(`  ${COMMITTED}: ${have.byteLength.toLocaleString()} B, matches a fresh extract`)
    console.log('✓ check:generated: ok')
  } else {
    console.log('✗ check:generated: the committed sheet is not what the engine emits now')
    console.log(`  · committed ${have.byteLength.toLocaleString()} B, fresh ${fresh.byteLength.toLocaleString()} B`)
    console.log('  Run `bun run extract`, read the diff, commit both.')
    process.exit(1)
  }
} finally {
  rmSync(out, { recursive: true, force: true })
}
