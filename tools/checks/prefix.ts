// Invariant 6: everything global is prefixed `quireink_`.
//
// A plugin shares one namespace with the theme and every other plugin on the site, and a
// collision does not error - it silently takes over. WordPress has no module system; a bare
// `function enqueue()` in a plugin is a fatal error waiting for the next plugin that has one.
//
// The JS side is the same rule in a different global: one namespace object on `window`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PREFIX = 'quireink_'
// A PREFIX, not one exact name. The intent is that nothing this plugin defines can collide
// with the theme or another plugin; `quireInkPenApp` and `quireInkPenScreen` are as owned as
// `quireInkPen` is, and a rule that forbids them is a rule stricter than its own reason.
const JS_PREFIX = 'quireInkPen'

// The GENERATED artefacts are exempt, and it is not a loophole. `quireink-engine.js` IS the
// blog engine: it legitimately contains the one true seed hash and whatever globals bun's
// minifier produced, and holding it to rules about code somebody here typed would either flag
// it forever or have to be silenced with a special case that nobody reads.
const GENERATED = (p: string) =>
  p.endsWith('assets/js/quireink-engine.js') || p.endsWith('assets/css/quireink-pen.css') ||
  p.endsWith('assets/css/quireink-editor.css')


const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const files = walk('quire-ink-pen').filter((p) => !GENERATED(p))
const bad: string[] = []
let checked = 0

for (const f of files.filter((p) => p.endsWith('.php'))) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const where = `${f}:${i + 1}`
    for (const [re, what] of [
      [/^\s*function\s+([a-zA-Z_]\w*)\s*\(/, 'function'],
      [/^\s*(?:abstract\s+|final\s+)?class\s+([a-zA-Z_]\w*)/, 'class'],
      [/\bdefine\s*\(\s*'([^']+)'/, 'constant'],
      [/\b(?:do_action|apply_filters)\s*\(\s*'([^']+)'/, 'hook'],
    ] as const) {
      const m = re.exec(line)
      if (!m) continue
      checked++
      const name = m[1]!
      const ok = what === 'constant'
        ? name.startsWith('QUIREINK_')
        : name.startsWith(PREFIX)
      if (!ok) bad.push(`${where}: ${what} \`${name}\` is not prefixed`)
    }
  })
}

for (const f of files.filter((p) => p.endsWith('.js'))) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const m = /\b(?:window|global)\.([a-zA-Z_$][\w$]*)\s*=/.exec(line)
    if (!m) return
    checked++
    if (!m[1]!.startsWith(JS_PREFIX)) bad.push(`${f}:${i + 1}: global \`${m[1]}\` is not prefixed \`${JS_PREFIX}\``)
  })
}

console.log(`  ${checked} global name(s) checked`)
if (bad.length === 0) console.log('✓ check:prefix: ok')
else {
  console.log(`✗ check:prefix: ${bad.length} violation(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
