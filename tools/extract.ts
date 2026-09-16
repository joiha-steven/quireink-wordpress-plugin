/**
 * Pull the pen out of Quire Ink and into the plugin, by RUNNING Quire Ink's own emitter.
 *
 * Nothing here retypes a colour, an offset or a stroke. `tools/tsconfig.json` maps `@/*` at
 * the sibling checkout, so the sheet below is the sheet the live blog draws with; when the
 * pen moves, this is re-run rather than re-read. The commit it came from goes in the manifest,
 * so a stale copy is a diff and not a guess.
 *
 * ⚠️ The sibling is READ ONLY. This imports from it and writes only into this repository.
 * Never `cd` there: the shell keeps its working directory between commands.
 *
 * Emits, into quire-ink-pen/:
 *   assets/css/quireink-pen.css   the whole pen, scoped to `.pen`, both schemes
 *   ../tools/extract-manifest.json  what came from where, at which commit
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { $ } from 'bun'

import {
  inkHighlightCss, inkLinesCss, resolveInks, DEFAULT_INKS, inkSignature, penSeed, INKS,
  type PenScope,
} from '@/pen'

const HERE = dirname(import.meta.dir)
const QUIRE = join(HERE, '..', 'quireink')
// Normally the plugin itself. `EXTRACT_OUT` points it elsewhere so `checks/generated-in-sync.ts`
// can produce a fresh copy and compare bytes without touching what is committed: a check that
// has to modify the tree to run is a check people turn off.
const OUT = process.env.EXTRACT_OUT ?? join(HERE, 'quire-ink-pen')

const HEAD = `/*!
 * The pen, generated from Quire Ink (https://quireink.com) by tools/extract.ts.
 * DO NOT EDIT. Run \`bun run extract\`; \`check:generated\` is red until you do.
 *
 * Wrap the text in class="pen". Put class="dark" on an ancestor for a dark page.
 * <mark data-pen="N"> highlights (data-ink="green|pink|blue|orange"),
 * <u data-pen="N"> underlines, <mark data-form="o" data-pen="N"> rings; N is 0-79.
 *
 * Licensed GPL v2 or later as part of this plugin (docs/decisions/0005).
 */
`

// ONE sheet, two homes. `.pen` is the published embed scope and is what the front end gets.
// `.editor-styles-wrapper` is the block editor's iframed canvas, and it is here because there
// is NO supported way for a plugin to put a class on that iframe's body in WordPress 6.8:
// `block_editor_iframed_body_class` does not exist, and a filter name written from memory is a
// filter that silently does nothing. Measured in the editor: the mark computed to
// rgb(255,255,0) with background-image:none, which is the browser's default <mark>.
//
// `:is()` and not two sheets, because two sheets is 534 KB twice. Not `:has()`, which is
// forbidden here for what it does to WebKit.
const EDITOR_SCOPE: PenScope = {
  light: ':is(.pen, .editor-styles-wrapper)',
  dark: '.dark :is(.pen, .editor-styles-wrapper)',
  darkText: 'inherit',
}

const inks = resolveInks(DEFAULT_INKS)
const body = `${inkHighlightCss(inks, EDITOR_SCOPE)}\n${inkLinesCss(inks, EDITOR_SCOPE)}`

// The sheet must be self-contained. It is linked by a plugin onto a page it does not own, so a
// site-root URL resolves against WordPress's root and 404s silently: the stroke simply does not
// draw, and a screenshot of a missing background looks exactly like a mark that is not there.
// The theme's extractor learned this the expensive way, on an UNQUOTED url() its string swap
// never saw. One regex, every form, and the written file is read back below.
const SITE_ROOT_URL = /url\((['"]?)\/(?!\/)/g
if (SITE_ROOT_URL.test(body)) {
  throw new Error(
    'The pen sheet now contains a site-root url(). It never did before, so this is a real change '
    + 'upstream rather than a rewrite to add: decide deliberately where those assets should live '
    + 'in a plugin before shipping it.',
  )
}

const css = HEAD + body

await mkdir(join(OUT, 'assets/css'), { recursive: true })
await writeFile(join(OUT, 'assets/css/quireink-pen.css'), css)

// Read our own output back. A guard that trusts the string it just built is not a guard.
const written = readFileSync(join(OUT, 'assets/css/quireink-pen.css'), 'utf8')
if (/url\((['"]?)\/(?!\/)/.test(written)) {
  throw new Error('A site-root url() survived into the written sheet.')
}
if (!written.includes('.pen, .editor-styles-wrapper) mark')) {
  throw new Error('The written sheet does not carry both scopes. The scope API changed upstream.')
}

const raw = Buffer.byteLength(css)
const gz = gzipSync(css, { level: 9 }).byteLength

const commit = (await $`git -C ${QUIRE} rev-parse --short HEAD`.quiet().nothrow()).stdout.toString().trim() || 'unknown'
const describe = (await $`git -C ${QUIRE} describe --tags --always`.quiet().nothrow()).stdout.toString().trim() || 'unknown'

// The seed hash lives in JS in the plugin and in TypeScript in the engine. `check:contract`
// compares them; the manifest records the engine's answers so the comparison has a fixture
// even when no checkout is present.
const SEED_PROBE = ['a', 'highlight', 'a whole phrase that runs past twenty-eight characters', 'Việt', '']
const seeds = Object.fromEntries(SEED_PROBE.map((s) => [s, penSeed(s)]))

await writeFile(
  join(HERE, 'tools/extract-manifest.json'),
  JSON.stringify({
    generated_from: { repo: 'quireink', commit, describe },
    inks: { names: INKS, signature: inkSignature(DEFAULT_INKS) },
    sheet: { path: 'quire-ink-pen/assets/css/quireink-pen.css', bytes: raw, gzip: gz },
    seed_probe: seeds,
  }, null, 2) + '\n',
)

console.log(`  quireink-pen.css  ${raw.toLocaleString()} B raw, ${gz.toLocaleString()} B gzip`)
console.log(`  from quireink ${describe} (${commit})`)
console.log('✓ extract: ok')
