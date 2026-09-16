// Invariants 2 and 3: the markup belongs to the blog engine, and the seed hash exists once.
//
// The engine's `docs/pen.md` (ADR 0048) is the contract. It is public, it already has readers,
// and one stylesheet draws a Quire Ink post and a WordPress post only for as long as both emit
// the same elements. An attribute invented here to make the editor's life easier is a fork of
// a published format.
//
// The seed half is the one with scar tissue behind it. `pen/grammar.ts` upstream exists as one
// exported regex SOURCE because four parsers spelled it out separately and two drifted within
// the hour, putting the word "green" into every excerpt on a live site. The seed is thirteen
// lines and exactly as load-bearing, and it is tempting to write again in PHP the first time
// something server-side needs one.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PLUGIN = 'quire-ink-pen'
const FNV_PRIME = '0x01000193'
const MANIFEST = 'tools/extract-manifest.json'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// See prefix.ts for the same exemption and the same reason: the bundle IS the engine, so it
// carries the real seed hash, and counting it as a second implementation would make invariant
// 3's guard permanently red for the one file that is allowed to have it.
const GENERATED = (p: string) =>
  p.endsWith('assets/js/quireink-engine.js') || p.endsWith('assets/css/quireink-pen.css')

const files = walk(PLUGIN).filter((p) => !GENERATED(p))
const bad: string[] = []

// ── the seed exists exactly once ─────────────────────────────────────────────────────────
const carriers = files.filter((f) => /\.(js|php|ts)$/.test(f) && readFileSync(f, 'utf8').includes(FNV_PRIME))
if (carriers.length === 0) bad.push('no seed implementation found')
if (carriers.length > 1) {
  bad.push(`${carriers.length} seed implementations; invariant 3 allows one`)
  for (const c of carriers) bad.push(`  at ${c}`)
}

// ── and it answers what the engine answers ───────────────────────────────────────────────
// The fixture is written by `tools/extract.ts` from the engine's own `penSeed`, so this holds
// even with no Quire Ink checkout present. Running the plugin's function rather than reading
// it: a guard that greps for a constant proves the constant, not the arithmetic.
if (existsSync(MANIFEST) && carriers.length === 1) {
  const probe = JSON.parse(readFileSync(MANIFEST, 'utf8')).seed_probe as Record<string, number> | undefined
  if (!probe) {
    bad.push(`${MANIFEST} has no seed_probe; re-run \`bun run extract\``)
  } else {
    const src = readFileSync(carriers[0]!, 'utf8')
    const sandbox: { quireInkPen?: { seed?: (s: string) => number } } = {}
    new Function('window', src)(sandbox)
    const seed = sandbox.quireInkPen?.seed
    if (typeof seed !== 'function') {
      bad.push(`${carriers[0]}: does not expose window.quireInkPen.seed`)
    } else {
      for (const [text, want] of Object.entries(probe)) {
        const got = seed(text)
        if (got !== want) bad.push(`seed(${JSON.stringify(text)}) = ${got}, engine says ${want}`)
      }
      console.log(`  seed: ${Object.keys(probe).length} fixture(s) agree with the engine`)
    }
  }
}

// ── the markup is the documented markup ──────────────────────────────────────────────────
const ALLOWED_TAGS = ['mark', 'u']
const ALLOWED_ATTRS = ['data-pen', 'data-ink', 'data-form']

const formats = files.find((f) => f.endsWith('formats.js'))
if (!formats) bad.push('no formats.js')
else {
  const src = readFileSync(formats, 'utf8')
  for (const m of src.matchAll(/tagName:\s*'([^']+)'/g)) {
    if (!ALLOWED_TAGS.includes(m[1]!)) bad.push(`formats.js: tagName '${m[1]}' is not in the contract`)
  }
  for (const m of src.matchAll(/'(data-[\w-]+)'/g)) {
    if (!ALLOWED_ATTRS.includes(m[1]!)) bad.push(`formats.js: attribute '${m[1]}' is not in the contract`)
  }
  // A class on the element would round-trip without the attributes, and the attributes are the
  // whole thing.
  for (const m of src.matchAll(/className:\s*([^,\n]+)/g)) {
    if (m[1]!.trim() !== 'null') bad.push(`formats.js: className ${m[1]!.trim()} — the contract has no class on the element`)
  }
  console.log(`  markup: tags and attributes match the contract`)
}

// ── and the PHP agrees about which attributes exist ──────────────────────────────────────
const marks = files.find((f) => f.endsWith('inc/marks.php'))
if (marks) {
  const listed = [...readFileSync(marks, 'utf8').matchAll(/'(data-[\w-]+)'/g)].map((m) => m[1]!)
  const missing = ALLOWED_ATTRS.filter((a) => !listed.includes(a))
  const extra = listed.filter((a) => !ALLOWED_ATTRS.includes(a))
  for (const a of missing) bad.push(`marks.php: quireink_pen_attributes() omits ${a}`)
  for (const a of extra) bad.push(`marks.php: quireink_pen_attributes() invents ${a}`)
}

if (bad.length === 0) console.log('✓ check:contract: ok')
else {
  console.log(`✗ check:contract: ${bad.length} violation(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
