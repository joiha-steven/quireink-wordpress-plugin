// Invariant 4: the ink and the engine are what Quire Ink emits today, not what it emitted once.
//
// Runs the extractor into a scratch directory and compares. It does NOT write into the tree: a
// check that has to modify what is committed in order to run is a check people turn off.
//
// ⚠️ IT DOES NOT ASK YOU TO READ A DIFF OF A 600 KB MINIFIED BUNDLE. Nobody can, so nobody
// would, and a check whose output is unreadable is approved blind. It reports the three things
// a person can actually judge:
//
//   1. WHICH VERSION the engine moved from and to
//   2. WHETHER THE EXPORTED API CHANGED — that is what breaks this plugin, at run time, in the
//      editor, silently
//   3. WHETHER THE GOLDEN FIXTURE STILL RENDERS THE SAME — that is what breaks somebody's post
//
// A red result is the seam reporting, not a failure. Re-extract, read the three lines above,
// and commit.
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const QUIRE = join(process.cwd(), '..', 'quireink')
const ARTEFACTS = [
  { label: 'ink sheet', rel: 'quire-ink-pen/assets/css/quireink-pen.css' },
  { label: 'engine', rel: 'quire-ink-pen/assets/js/quireink-engine.js' },
]
const MANIFEST = 'tools/extract-manifest.json'
const GOLDEN = 'tools/golden/expected.html'

if (!existsSync(QUIRE)) {
  console.log(`  no Quire Ink checkout at ${QUIRE}`)
  console.log('⚠ check:generated: skipped')
  process.exit(0)
}

type Manifest = {
  generated_from?: { describe?: string; commit?: string }
  engine?: { api?: string[] }
}

const out = mkdtempSync(join(tmpdir(), 'quireink-pen-extract-'))
let failed = false

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

  const differing: string[] = []
  for (const { label, rel } of ARTEFACTS) {
    const fresh = readFileSync(join(out, rel.replace(/^quire-ink-pen\//, '')))
    const have = existsSync(rel) ? readFileSync(rel) : Buffer.alloc(0)
    if (fresh.equals(have)) {
      console.log(`  ${label}: ${have.byteLength.toLocaleString()} B, matches a fresh extract`)
    } else {
      differing.push(label)
      console.log(`  ${label}: committed ${have.byteLength.toLocaleString()} B, fresh ${fresh.byteLength.toLocaleString()} B`)
    }
  }

  // ── what a person needs in order to approve it ─────────────────────────────────────────
  const read = (p: string): Manifest | null => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)
  const was = read(MANIFEST)
  const now = read(join(out, MANIFEST))

  const vWas = was?.generated_from?.describe ?? 'unknown'
  const vNow = now?.generated_from?.describe ?? 'unknown'
  if (vWas !== vNow) console.log(`  engine version: ${vWas}  ->  ${vNow}`)

  const apiWas = new Set(was?.engine?.api ?? [])
  const apiNow = new Set(now?.engine?.api ?? [])
  const gone = [...apiWas].filter((k) => !apiNow.has(k))
  const added = [...apiNow].filter((k) => !apiWas.has(k))
  if (gone.length > 0) {
    failed = true
    console.log(`  ✗ API REMOVED upstream: ${gone.join(', ')}`)
    console.log('    tools/engine-entry.ts names it and the editor will fail at run time.')
  }
  if (added.length > 0) console.log(`  API added: ${added.join(', ')}`)
  if (gone.length === 0 && added.length === 0) console.log('  engine API: unchanged')

  const goldWas = existsSync(GOLDEN) ? readFileSync(GOLDEN, 'utf8') : ''
  const goldNow = readFileSync(join(out, GOLDEN), 'utf8')
  if (goldWas === goldNow) {
    console.log(`  golden: unchanged (${goldNow.length} B)`)
  } else {
    failed = true
    console.log('  ✗ GOLDEN CHANGED — the engine renders the fixture differently now:')
    const a = goldWas.split('\n')
    const b = goldNow.split('\n')
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] === b[i]) continue
      if (a[i] !== undefined) console.log(`    - ${a[i]}`)
      if (b[i] !== undefined) console.log(`    + ${b[i]}`)
    }
  }

  if (differing.length > 0) failed = true
  if (failed) {
    console.log(`✗ check:generated: ${differing.length > 0 ? differing.join(' and ') + ' out of date' : 'upstream changed'}`)
    console.log('  Run `bun run extract`, read the three lines above, commit.')
    process.exit(1)
  }
  console.log('✓ check:generated: ok')
} finally {
  rmSync(out, { recursive: true, force: true })
}
