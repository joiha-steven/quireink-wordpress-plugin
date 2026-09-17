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
  p.endsWith('assets/js/quireink-engine.js') || p.endsWith('assets/css/quireink-pen.css') ||
  p.endsWith('assets/css/quireink-editor.css')

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

// ── AND THE BLOCK EDITOR HASHES THE GESTURE, NOT THE WORDS ───────────────────────────────
//
// The fixtures above compare the seed FUNCTION. They cannot see the argument, and the argument
// is where this went wrong: `formats.js` hashed the selected text while the engine hashes
// `node.raw`, the gesture's whole Markdown source. Same function, same fixtures, agreement on
// every one of them — and a different stroke for every real mark. Measured: "highlighted
// phrase" drew variant 71 from the block editor's button and 43 from the Quire Ink editor.
//
// So the call site is pinned. It is one line, it is load-bearing, and a check that reads it is
// cheaper than the release that does not.
{
  const formats = files.find((f) => f.endsWith('assets/js/formats.js'))
  if (formats) {
    const src = readFileSync(formats, 'utf8')
    if (!/seed\(\s*fence \+ getTextContent/.test(src)) {
      bad.push('formats.js: the seed must be taken of `fence + text + fence`, not of the text')
    }
    for (const fence of ['==', '@@', '++']) {
      if (!src.includes(`'${fence}'`)) bad.push(`formats.js: no \`${fence}\` fence, so one gesture hashes as another`)
    }
  }
}

// ── ONE SHEET DRAWS THE PEN ──────────────────────────────────────────────────────────────
//
// `quireink-pen.css` is generated from the blog engine's own ink emitter and is the only sheet
// on a published page, so it is complete on its own. `quireink-editor.css` is a cut of the
// admin build for the writing surface's furniture, and the admin build carries the pen too.
//
// Two sheets drawing one element is a fight decided by specificity, and this one was LOST the
// day the cut was scoped under an id: `#quireink-pen-paper .prose mark` at 1-1-1 beat
// `mark[data-ink=green][data-pen="71"]` at 0-3-1, so every ink drew the default yellow.
// Measured on all five. Nothing failed; the marks were simply the wrong colour.
{
  const editor = 'quire-ink-pen/assets/css/quireink-editor.css'
  const pen = 'quire-ink-pen/assets/css/quireink-pen.css'
  // Selectors only: `@property --u-translate-x` is Tailwind's own renamed internal, not a rule.
  const selectors = readFileSync(editor, 'utf8')
    .split('}').map((b) => b.slice(b.lastIndexOf('{') === -1 ? 0 : 0, b.indexOf('{')))
    .filter((sel) => sel && !sel.trimStart().startsWith('@'))
  const offenders = selectors.filter((sel) => /\[data-(pen|ink|form)|(^|[\s>+~,(])(mark|u)(?=[\s>+~,.:[{]|$)/.test(sel))
  for (const sel of offenders.slice(0, 5)) {
    bad.push(`quireink-editor.css draws the pen: ${sel.trim().slice(0, 70)}`)
  }
  const inks = [...readFileSync(pen, 'utf8').matchAll(/mark\[data-ink=(\w+)\]/g)].map((m) => m[1]!)
  const named = [...new Set(inks)]
  if (named.length < 4) bad.push(`quireink-pen.css names only ${named.length} ink(s); expected the four besides the default`)
  console.log(`  ink: ${named.length} coloured ink(s) in the pen sheet, ${offenders.length} pen selector(s) in the editor sheet`)
}

if (bad.length === 0) console.log('✓ check:contract: ok')
else {
  console.log(`✗ check:contract: ${bad.length} violation(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
