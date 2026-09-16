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
 *   assets/css/quireink-editor.css the toolbar and bubble bar's styling, cut from the admin build
 *   assets/js/quireink-engine.js  the Markdown engine, the pen grammar and the editor
 *   ../tools/extract-manifest.json  what came from where, at which commit
 *   ../tools/golden/expected.html   what the engine renders the golden fixture to
 *
 * ## When the blog engine updates
 *
 * Re-run this. `check:generated` is red until you do, and it does NOT ask you to read a diff
 * of a 600 KB minified bundle, because nobody can. It reports the three things a human can
 * actually approve:
 *
 *   1. which engine version the bundle came from, before and after
 *   2. whether the EXPORTED API changed - that is what breaks this plugin
 *   3. whether the golden fixture still renders to the same HTML - that is what breaks a post
 *
 * A byte diff would be noise. An API name disappearing, or `==x==` rendering differently, is
 * the whole of what matters, and both are named out loud.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { $ } from 'bun'
import { buildEditorCss } from './editor-css'

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
// The manifest and the golden are compared BY the check, so they must not be written by it.
// A check that modifies the tree in order to run is a check people turn off, and then the
// thing it guards drifts for a month.
const META = process.env.EXTRACT_OUT ? process.env.EXTRACT_OUT : HERE

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

// ---------------------------------------------------------------- the engine, bundled
//
// `bun build` rather than a copy: 79 modules including ProseMirror, resolved by the engine's
// own tsconfig, so there is no list here to fall out of date. The editor imports nothing from
// the server (measured: zero `@/server` imports), which is what makes this possible at all.
const ENTRY = join(HERE, 'tools/engine-entry.ts')
const bundle = await Bun.build({
  entrypoints: [ENTRY],
  target: 'browser',
  format: 'iife',
  minify: true,
})
if (!bundle.success) {
  for (const log of bundle.logs) console.error(log)
  throw new Error('The engine bundle failed to build.')
}
const engineJs = await bundle.outputs[0]!.text()
await mkdir(join(OUT, 'assets/js'), { recursive: true })
await writeFile(join(OUT, 'assets/js/quireink-engine.js'), engineJs)

// The API surface, read off the bundle by running it. A name that disappears upstream is the
// thing that breaks this plugin, and it breaks it at run time, in the editor, silently.
const sandbox: Record<string, unknown> = {}
new Function('globalThis', 'window', engineJs)(sandbox, sandbox)
const api = sandbox.quireInkEngine as Record<string, unknown> | undefined
if (!api) throw new Error('The bundle did not define globalThis.quireInkEngine.')
const surface = Object.keys(api).sort()

// And what it RENDERS, which is what breaks a post rather than the plugin.
const goldenSource = readFileSync(join(HERE, 'tools/golden/source.md'), 'utf8')
const goldenHtml = (api.toHtml as (s: string) => string)(goldenSource)
await mkdir(join(META, 'tools/golden'), { recursive: true })
await writeFile(join(META, 'tools/golden/expected.html'), goldenHtml)

// ---------------------------------------------------------------- the furniture's styling
//
// The toolbar and the bubble bar wear Tailwind utilities, so their look is not in a file to
// copy: it is in a 668 KB build of the whole admin. `tools/editor-css.ts` reads the class
// names out of the two components and keeps only the rules that mention them.
const editorCss = buildEditorCss(
  join(QUIRE, 'src/admin/dist/admin.css'),
  [
    join(QUIRE, 'src/admin/components/editor-toolbar.ts'),
    join(QUIRE, 'src/admin/components/editor-menus.ts'),
  ],
  css,
)
await writeFile(join(OUT, 'assets/css/quireink-editor.css'), editorCss)
const edRaw = Buffer.byteLength(editorCss)
const edGz = gzipSync(editorCss, { level: 9 }).byteLength

const commit = (await $`git -C ${QUIRE} rev-parse --short HEAD`.quiet().nothrow()).stdout.toString().trim() || 'unknown'
const describe = (await $`git -C ${QUIRE} describe --tags --always`.quiet().nothrow()).stdout.toString().trim() || 'unknown'

// The seed hash lives in JS in the plugin and in TypeScript in the engine. `check:contract`
// compares them; the manifest records the engine's answers so the comparison has a fixture
// even when no checkout is present.
const SEED_PROBE = ['a', 'highlight', 'a whole phrase that runs past twenty-eight characters', 'Việt', '']
const seeds = Object.fromEntries(SEED_PROBE.map((s) => [s, penSeed(s)]))

await writeFile(
  join(META, 'tools/extract-manifest.json'),
  JSON.stringify({
    generated_from: { repo: 'quireink', commit, describe },
    inks: { names: INKS, signature: inkSignature(DEFAULT_INKS) },
    sheet: { path: 'quire-ink-pen/assets/css/quireink-pen.css', bytes: raw, gzip: gz },
    engine: {
      path: 'quire-ink-pen/assets/js/quireink-engine.js',
      bytes: Buffer.byteLength(engineJs),
      gzip: gzipSync(engineJs, { level: 9 }).byteLength,
      modules: bundle.outputs.length,
      api: surface,
    },
    editor_css: {
      path: 'quire-ink-pen/assets/css/quireink-editor.css',
      bytes: edRaw,
      gzip: edGz,
    },
    seed_probe: seeds,
  }, null, 2) + '\n',
)

console.log(`  quireink-pen.css     ${raw.toLocaleString()} B raw, ${gz.toLocaleString()} B gzip`)
console.log(`  quireink-engine.js   ${Buffer.byteLength(engineJs).toLocaleString()} B raw, ${gzipSync(engineJs, { level: 9 }).byteLength.toLocaleString()} B gzip`)
console.log(`  quireink-editor.css  ${edRaw.toLocaleString()} B raw, ${edGz.toLocaleString()} B gzip`)
console.log(`  engine API           ${surface.join(', ')}`)
console.log(`  from quireink ${describe} (${commit})`)
console.log('✓ extract: ok')
