// Two budgets: the 400-line rule from CLAUDE.md, and the ink sheet's COMPRESSED size.
//
// The second is invariant 7 and it is the reason this plugin is possible at all. Raw, the pen
// is over half a megabyte. The measurement that mattered was 34,533 bytes gzipped, and a guard
// counting raw bytes would have stayed green on the day a change made the sheet stop
// compressing — which is the only way that number moves, since the stroke count is fixed.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const MAX_LINES = 400
const WARN_AT = Math.floor(MAX_LINES * 0.95)
// Both budgets are COMPRESSED. A raw byte count would have stayed green on the day a change
// made an artefact stop compressing, which is the only way either number really moves.
//
// The engine's is the looser one on purpose: it is an ADMIN-ONLY asset, fetched when somebody
// opens the Quire Ink editor and never by a reader. The sheet's budget guards a page a visitor
// waits for; this one guards a screen an author asked for.
const GENERATED = [
  { path: 'quire-ink-pen/assets/css/quireink-pen.css', gzipMax: 44_000, note: 'reaches readers' },
  { path: 'quire-ink-pen/assets/js/quireink-engine.js', gzipMax: 240_000, note: 'admin only, on demand' },
  { path: 'quire-ink-pen/assets/css/quireink-editor.css', gzipMax: 12_000, note: 'admin only, cut from a 668 KB build' },
]

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// The generated sheet is exempt from the line rule and not from the byte rule. Nobody reads it,
// nobody edits it, and splitting it would mean the extractor deciding where to cut a file it
// copies verbatim.
const generated = (p: string) => GENERATED.some((g) => p === g.path)

const files = [...walk('quire-ink-pen'), ...walk('tools')]
  .filter((p) => /\.(ts|php|js|sh)$/.test(p) && !generated(p))
const sized = files.map((p) => ({ p, n: readFileSync(p, 'utf8').split('\n').length }))

const over = sized.filter(({ n }) => n > MAX_LINES)
const near = sized.filter(({ n }) => n > WARN_AT && n <= MAX_LINES).sort((a, b) => b.n - a.n)

console.log(`  scanned ${files.length} file(s) (limit ${MAX_LINES} lines)`)
for (const { p, n } of near) console.log(`  · ${p}: ${n}, within ${MAX_LINES - WARN_AT} of the limit`)

const bad = over.map(({ p, n }) => `${p}: ${n} lines`)

for (const { path, gzipMax, note } of GENERATED) {
  const raw = readFileSync(path)
  const gz = gzipSync(raw, { level: 9 }).byteLength
  console.log(`  ${path.split('/').pop()}: ${raw.byteLength.toLocaleString()} B raw, ${gz.toLocaleString()} B gzip (max ${gzipMax.toLocaleString()}, ${note})`)
  if (gz > gzipMax) bad.push(`${path}: ${gz.toLocaleString()} B gzip over the ${gzipMax.toLocaleString()} B budget`)
}

if (bad.length === 0) console.log('✓ check:filesize: ok')
else {
  console.log(`✗ check:filesize: ${bad.length} violation(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
