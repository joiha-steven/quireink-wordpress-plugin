// Exactly ONE copy of ProseMirror in the bundle.
//
// `tools/engine-entry.ts` imports `prosemirror-model` to read a WordPress post's HTML into the
// editor's document. Declaring it here as a dependency of this repository seemed right and was
// wrong: bun then resolved the entry's import to THIS checkout's copy and the engine's own
// imports to the engine's, and bundled both. Identical versions, two module instances, two
// `Schema` classes.
//
// ProseMirror catches it and says so, which is how it was found:
//
//   Can not convert <"Hello ", ink("marked"), "."> to a Fragment
//   (looks like multiple versions of prosemirror-model were loaded)
//
// That is a run-time throw, in the editor, on the first post that was not written in Quire
// Ink. Nothing else went red: `check:generated` was green, the bundle built, the API surface
// was complete, and the golden render was unchanged, because none of them constructs a node.
//
// The fix is `tools/tsconfig.json`, which points the import at the ENGINE's copy so there is
// only ever one. This counts, because a version comparison cannot see the failure at all: the
// two versions were the same.
import { readFileSync, existsSync } from 'node:fs'

const BUNDLE = 'quire-ink-pen/assets/js/quireink-engine.js'
// The library's own words for this exact fault, so the marker cannot drift away from the thing
// it marks: if prosemirror-model is in the bundle twice, this sentence is in it twice.
const MARKER = 'multiple versions of prosemirror-model'

if (!existsSync(BUNDLE)) {
  console.log(`✗ check:deps: ${BUNDLE} is missing. Run \`bun run extract\`.`)
  process.exit(1)
}

const src = readFileSync(BUNDLE, 'utf8')
const copies = src.split(MARKER).length - 1

if (copies === 0) {
  console.log('✗ check:deps: prosemirror-model is not in the bundle at all')
  console.log('  The editor cannot work without it. Did the entry stop importing the engine?')
  process.exit(1)
}
if (copies > 1) {
  console.log(`✗ check:deps: prosemirror-model is bundled ${copies} times`)
  console.log('  Two copies means two Schema classes, and a node made by one fails instanceof')
  console.log('  in the other. Point the import at the engine\'s copy in tools/tsconfig.json.')
  process.exit(1)
}

// A dependency declared here would resolve to this checkout and start the whole thing again.
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, unknown>
if (pkg.dependencies || pkg.devDependencies) {
  console.log('✗ check:deps: this repository declares packages of its own')
  console.log('  Every package the bundle needs comes from the blog engine, through the alias')
  console.log('  in tools/tsconfig.json. One declared here becomes a second copy.')
  process.exit(1)
}

console.log('  prosemirror-model: one copy, resolved at the blog engine')
console.log('✓ check:deps: ok')
