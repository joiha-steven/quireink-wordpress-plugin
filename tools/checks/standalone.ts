// Invariant 1: the plugin renders correctly with no Quire Ink theme present.
//
// This is the product decision (ADR 0002) and the one that cannot be seen from here. Every
// machine this is developed on has the theme installed; every screenshot is taken with both
// active. A mark that is invisible, or grey, or drawn behind its own text on the 99% of
// WordPress sites running something else never appears during development and appears
// immediately on a stranger's blog.
//
// Three tests, each for a way the dependency actually gets written:
//
//   1. A `var(--x)` reading a property the plugin does not itself define, with no fallback.
//      Scoped that way on purpose: the generated sheet defines and reads `--ink-stroke`,
//      `--ink-h` and five more in its own cascade, and a naive "every var needs a fallback"
//      rule would flag 300 correct rules and get itself turned off.
//   2. The theme's slug, or a selector only the theme emits, in any rule or any PHP.
//   3. `current_theme_supports` anywhere except the one function that is allowed to ask.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PLUGIN = 'quire-ink-pen'

// From the theme's own promised-selectors list. A rule here naming one of these is a rule
// that only ever fires when the theme is active, which is the definition of the dependency.
const THEME_ONLY = [
  '.rail', '.prose', '.post-hero', '.post-list', '.card-thumb', '.deck', '.author-box',
  '.related', '.read-next-title', '.arc-jump', '.arc-yr', '.subscribe-card', '.listing-head',
  '.pager', 'header.site', 'footer.site',
]

// The plugin's own slug contains the theme's, so a substring test would flag every file.
const THEME_SLUG = /(?<!-)\bquire-ink\b(?!-pen)/

const ASK = 'quireink_pen_theme_handles_context'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const files = walk(PLUGIN)
const css = files.filter((p) => p.endsWith('.css'))
const php = files.filter((p) => p.endsWith('.php'))
const js = files.filter((p) => p.endsWith('.js'))

const bad: string[] = []

// ── 1. custom properties the plugin does not define ──────────────────────────────────────
const defined = new Set<string>()
for (const f of css) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]!)
}

let reads = 0
for (const f of css) {
  const text = readFileSync(f, 'utf8')
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    reads++
    const [, name, fallback] = m
    if (fallback || defined.has(name!)) continue
    bad.push(`${f}: var(${name}) — not defined by this plugin and has no fallback`)
  }
}

// ── 2. the theme named ───────────────────────────────────────────────────────────────────
for (const f of [...css, ...php, ...js]) {
  const text = readFileSync(f, 'utf8')
  text.split('\n').forEach((line, i) => {
    if (THEME_SLUG.test(line)) bad.push(`${f}:${i + 1}: names the theme's slug`)
    for (const sel of THEME_ONLY) {
      // Word-boundaried, so `.pen mark` is not caught by `.prose` and `.rail` does not match
      // `.railing`. A selector in a comment is still a selector somebody will copy.
      if (new RegExp(`\\${sel.replace(/\./g, '\\.')}(?![\\w-])`).test(line)) {
        bad.push(`${f}:${i + 1}: names \`${sel}\`, which only the theme emits`)
      }
    }
  })
}

// ── 3. theme support consulted in exactly one place ──────────────────────────────────────
const askers: string[] = []
for (const f of php) {
  const text = readFileSync(f, 'utf8')
  text.split('\n').forEach((line, i) => {
    if (line.includes('current_theme_supports')) askers.push(`${f}:${i + 1}`)
  })
}
const askFn = php.find((f) => readFileSync(f, 'utf8').includes(`function ${ASK}`))
if (!askFn) bad.push(`no ${ASK}() — theme support must be asked in one named place`)
if (askers.length > 1) {
  bad.push(`current_theme_supports appears ${askers.length} times; only ${ASK}() may ask`)
  for (const a of askers) bad.push(`  at ${a}`)
}

console.log(`  ${css.length} sheet(s), ${defined.size} own propert(ies), ${reads} var() read(s)`)
console.log(`  ${php.length} PHP + ${js.length} JS file(s) scanned for the theme`)

if (bad.length === 0) {
  console.log('✓ check:standalone: ok')
} else {
  console.log(`✗ check:standalone: ${bad.length} violation(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
