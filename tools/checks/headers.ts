// The version agrees in four places, and every PHP file refuses direct access.
//
// Four copies of one number is what wordpress.org's packaging needs, and a `Stable tag` that
// disagrees with the plugin header is the single most common way a release goes wrong: the
// directory serves the tag, the installed plugin reports the header, and the update never
// settles. It cannot be undone — an approved version is downloadable forever.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAIN = 'quire-ink-pen/quire-ink-pen.php'
const README = 'quire-ink-pen/readme.txt'
const PKG = 'package.json'

const main = readFileSync(MAIN, 'utf8')
const readme = readFileSync(README, 'utf8')
const pkg = JSON.parse(readFileSync(PKG, 'utf8')) as { version?: string }

const pick = (text: string, field: string) => new RegExp(`^\\s*\\*?\\s*${field}:\\s*(.+?)\\s*$`, 'm').exec(text)?.[1]

const versions = {
  'plugin header': pick(main, 'Version'),
  'QUIREINK_PEN_VERSION': /define\(\s*'QUIREINK_PEN_VERSION',\s*'([^']+)'/.exec(main)?.[1],
  'readme Stable tag': pick(readme, 'Stable tag'),
  'package.json': pkg.version,
}

const bad: string[] = []
const distinct = new Set(Object.values(versions))
if (distinct.size !== 1 || distinct.has(undefined)) {
  bad.push('the version does not agree:')
  for (const [where, v] of Object.entries(versions)) bad.push(`  ${where}: ${v ?? 'NOT FOUND'}`)
}
const version = versions['plugin header']

// A release with no changelog entry is a release nobody can read the diff of.
if (version && !new RegExp(`^=\\s*${version.replace(/\./g, '\\.')}\\s*=`, 'm').test(readme)) {
  bad.push(`readme.txt has no changelog entry for ${version}`)
}

// These two are what WordPress enforces at activation; disagreeing copies mean the directory
// shows one requirement and the installer applies another.
for (const field of ['Requires at least', 'Requires PHP'] as const) {
  const a = pick(main, field)
  const b = pick(readme, field)
  if (a !== b) bad.push(`${field}: header says ${a}, readme says ${b}`)
}

// Every PHP file refuses to be loaded on its own. A plugin file reachable by URL is the oldest
// finding in the book.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const php = walk('quire-ink-pen').filter((p) => p.endsWith('.php'))
for (const f of php) {
  if (!/defined\(\s*'ABSPATH'\s*\)/.test(readFileSync(f, 'utf8'))) bad.push(`${f}: no ABSPATH guard`)
}

console.log(`  version ${version ?? '?'} in ${Object.keys(versions).length} place(s), ${php.length} PHP file(s) guarded`)
if (bad.length === 0) console.log('✓ check:headers: ok')
else {
  console.log(`✗ check:headers: ${bad.length} problem(s)`)
  for (const b of bad) console.log(`  · ${b}`)
  process.exit(1)
}
