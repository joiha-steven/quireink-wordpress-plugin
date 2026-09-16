// The one door the plugin opens into the blog engine.
//
// Everything the WordPress side may touch is listed here and nowhere else, so
// `tools/extract-manifest.json` can record the surface and `check:generated` can tell you, in
// names rather than bytes, when an upstream release takes one away.
//
// Keep this list SHORT. Every export is a promise this plugin has to keep working across
// engine releases, and the engine has no idea this file exists.
import { DOMParser as PMDOMParser } from 'prosemirror-model'
import { Editor } from '@/admin/editor/editor'
import { schema } from '@/admin/editor/schema'
import { parse, toHtml } from '@/md'
import { penSeed, INKS, DEFAULT_INK } from '@/pen'

/**
 * HTML into the editor's own NODES, for a post that was not written here.
 *
 * `Editor`'s `content` option parses a STRING as Markdown, which is right for a Quire Ink post
 * and wrong for a WordPress one: an existing post is HTML, and handing it to the Markdown
 * parser shows the author their own tags as literal text. ProseMirror can read HTML into the
 * schema directly, so it does, and the result goes in as JSON.
 *
 * Gutenberg's block delimiters are stripped first. They are comments, they carry no content,
 * and a document that opens with `<!-- wp:paragraph -->` on screen reads as a bug.
 *
 * ⚠️ RETURNS THE CHILDREN, NOT THE DOCUMENT. `Editor`'s `content` option is fed to
 * `contentToNodes`, which wraps a non-string in an array and calls `nodeFromJSON` on each,
 * and then the constructor puts the result inside a fresh `doc`. Hand it a whole `doc` and you
 * get a doc INSIDE a doc; `doc` is one of the two node types with no `toDOM`, so the view
 * throws `type.spec.toDOM is not a function` on the first render. Markdown strings never hit
 * this, because that branch iterates the parsed doc's children for exactly this reason.
 */
function htmlToNodes(html: string): unknown[] {
  const cleaned = html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '')
  const host = document.createElement('div')
  host.innerHTML = cleaned
  const doc = PMDOMParser.fromSchema(schema).parse(host)
  const json = doc.toJSON() as { content?: unknown[] }
  return json.content ?? []
}

;(globalThis as unknown as Record<string, unknown>).quireInkEngine = {
  Editor,
  schema,
  htmlToNodes,
  parse,
  toHtml,
  penSeed,
  INKS,
  DEFAULT_INK,
}
