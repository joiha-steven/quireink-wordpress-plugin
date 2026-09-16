// docs/pair.md is generated. This proves the copy has not been hand-edited.
//
// The master is `pair/contract.json` in the programme's private repository, and neither public
// repository may own it: whichever did would be the one the other had to read, and a repository
// you have to read is a dependency whatever the README says.
//
// So the copy is SELF-VERIFYING. It carries the master JSON verbatim in a fenced block and
// states that block's SHA-256 above it. This hashes the block it carries and compares. No
// access to the private repository is needed, which means a stranger who clones only this repo
// can still run it.
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const COPY = 'docs/pair.md'

if (!existsSync(COPY)) {
  console.log(`✗ check:pair: ${COPY} is missing. Generate it from the private repo.`)
  process.exit(1)
}

const text = readFileSync(COPY, 'utf8')
const stated = /\*\*contract-sha256:\*\*\s*`([0-9a-f]{64})`/.exec(text)
const block = /```json\n([\s\S]*?)\n```/.exec(text)

if (!stated) {
  console.log('✗ check:pair: no contract-sha256 line')
  process.exit(1)
}
if (!block) {
  console.log('✗ check:pair: no ```json block')
  process.exit(1)
}

// The master ends with a newline; the fence strips it. Put it back before hashing rather than
// hashing something the generator never wrote.
const actual = createHash('sha256').update(block[1]! + '\n').digest('hex')

if (actual !== stated[1]) {
  console.log('✗ check:pair: the contract block does not match its stated hash')
  console.log(`  · stated ${stated[1]!.slice(0, 16)}…`)
  console.log(`  · actual ${actual.slice(0, 16)}…`)
  console.log('  This file is generated. Edit pair/contract.json in quireink-wordpress-private')
  console.log('  and run `bun tools/pair-sync.ts` there.')
  process.exit(1)
}

console.log(`  contract sha256 ${actual.slice(0, 16)}… matches`)
console.log('✓ check:pair: ok')
