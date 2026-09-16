// Every relative link in the documentation points at something that exists.
//
// The blog engine has the same guard, for the reason every project eventually needs one: a
// file gets renamed, six documents keep pointing at the old name, and each of them looks
// authoritative right up until somebody clicks. It also catches the opposite - a document
// added under `docs/` that no index links to, which is a document nobody will ever find.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, normalize } from 'node:path'

const ROOTS = ['docs', '.']
const INDEXES = ['docs/README.md', 'README.md', 'CLAUDE.md']

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === '.git' || name === '.tmp' || name === 'node_modules') return []
    const p = join(dir, name).replaceAll('\\', '/')
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const markdown = [...new Set(ROOTS.flatMap((r) => (r === '.' ? readdirSync('.').map((n) => n) : walk(r))))]
  .map((p) => (p.startsWith('docs') ? p : p))
  .filter((p) => p.endsWith('.md'))

const broken: string[] = []
const linked = new Set<string>()

for (const file of markdown) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)#]+)(?:#[^)]*)?\)/g)) {
    const target = normalize(join(dirname(file), m[1]!)).replaceAll('\\', '/')
    linked.add(target)
    if (!existsSync(target)) broken.push(`${file} -> ${m[1]}`)
  }
}

const docs = walk('docs').filter((p) => p.endsWith('.md'))
const orphans = docs.filter((p) => !linked.has(p) && !INDEXES.includes(p))

console.log(`  ${markdown.length} document(s), ${linked.size} internal link(s)`)

if (broken.length === 0 && orphans.length === 0) {
  console.log('✓ check:docs: ok')
} else {
  if (broken.length > 0) {
    console.log(`✗ check:docs: ${broken.length} broken link(s)`)
    for (const b of broken) console.log(`  · ${b}`)
  }
  if (orphans.length > 0) {
    console.log(`✗ check:docs: ${orphans.length} document(s) nothing links to`)
    for (const o of orphans) console.log(`  · ${o}`)
  }
  process.exit(1)
}
