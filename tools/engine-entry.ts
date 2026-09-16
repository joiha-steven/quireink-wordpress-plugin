// The one door the plugin opens into the blog engine.
//
// Everything the WordPress side may touch is listed here and nowhere else, so
// `tools/extract-manifest.json` can record the surface and `check:generated` can tell you, in
// names rather than bytes, when an upstream release takes one away.
//
// Keep this list SHORT. Every export is a promise this plugin has to keep working across
// engine releases, and the engine has no idea this file exists.
import { Editor } from '@/admin/editor/editor'
import { parse, toHtml } from '@/md'
import { penSeed, INKS, DEFAULT_INK } from '@/pen'

;(globalThis as unknown as Record<string, unknown>).quireInkEngine = {
  Editor,
  parse,
  toHtml,
  penSeed,
  INKS,
  DEFAULT_INK,
}
