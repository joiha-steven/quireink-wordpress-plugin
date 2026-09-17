# The editor

## What the toolbar will and will not do

Measured in WordPress 6.8.3, in the editor, not read from documentation:

| | |
|---|---|
| `RichTextToolbarButton` | works; lands in the toolbar's **overflow menu**, never the main row |
| `BlockControls` with `group: 'inline'`, from a format's `edit` | **nothing.** No button anywhere in the DOM, no console error, and the failing render silently took the format's keyboard shortcuts down with it |
| `RichTextShortcut` with `primaryShift` | works |
| `RichTextShortcut` with `access` (Ctrl+Alt) | does not fire |

A format edit has no block edit context, so it cannot fill the block toolbar's slot. There is
no supported way for a plugin to put a format button in the main toolbar row in 6.8.

**So the shortcut is the interaction and the menu entry is only how it is found.** Three
actions to mark a phrase is why this plugin would not be used.

`Cmd/Ctrl+Shift+H` highlight, `+U` underline, `+O` ring. Each is passed to
`RichTextToolbarButton` as `shortcutType`/`shortcutCharacter` too, so the menu teaches it.

## Core already has a format called "Highlight"

It is core's text-colour highlight and it sits in the same menu. Every title here begins
"Pen" for that reason: two entries reading Highlight in one menu is a bug report waiting to
be filed.

## Format types, not blocks

The three gestures are **inline formats** registered with `registerFormatType`, the same
primitive as the bold button. Not blocks: a mark spans part of a paragraph, and a block cannot.

```js
registerFormatType( 'quire-ink-pen/highlight', {
  title, tagName: 'mark', className: null, attributes: { … }, edit,
} )
```

`className: null` matters. A class would let WordPress round-trip the format without the
attributes, and the attributes are the whole thing.

## The canvas is an iframe

Since 6.3. A stylesheet enqueued on `enqueue_block_editor_assets` lands in the admin page
OUTSIDE it and styles nothing. Measured before this was fixed: no pen sheet inside the iframe,
and a mark computing to `rgb(255,255,0)` with `background-image: none`, which is the browser's
default `<mark>`. Every guard was green.

`enqueue_block_assets` is the hook that reaches the canvas.

The sheet needs no body class there: it is generated carrying `.editor-styles-wrapper` beside
`.pen`, because **`block_editor_iframed_body_class` does not exist**. That filter name was
written from memory and did nothing at all, which is what a wrong filter name does.

## Asset versions move on a local site

`quireink_pen_asset_version()` returns `filemtime` when `wp_get_environment_type()` is local or
development, and the plugin version otherwise. Without it an edited sheet or script stays
invisible behind `?ver=0.1.0`, and a fix gets measured as still broken. That happened twice
here, to the same stylesheet.

## The writing screen wears the engine's own furniture

`mountToolbar`, `mountBubbleBar`, `openSlashMenu` and `writingSurface` are the blog engine's,
brought across by the extractor, so a button it gains this gains too. `writingSurface` is the
one worth naming: it carries the editor's `prose` class list, the "/" trigger and the drop and
paste handlers, and lifting it is what keeps the WordPress screen from growing a second,
drifting copy of them. It wants a typewriter sound, and gets a silent one.

What is written here is only the wiring: the link box is a `window.prompt` for now, and
pictures come from WordPress's media library rather than the engine's picker, because on a
WordPress site that is where the writer's pictures already are.

**Their styling is Tailwind UTILITIES**, so it is not in a file to copy: it is in a 668 KB
build of the whole admin. `tools/editor-css.ts` reads the class names out of the component
sources and keeps the rules that mention them, which comes to 56 KB raw and 11.7 KB gzipped.
Five things that cut learned the hard way, each now a comment in that file:

- **Tailwind 4 puts every utility inside `@layer`.** Skipping unknown at-rules kept 61
  `@property` declarations and almost no rules, and the toolbar rendered as bare text.
- **`[hidden]` belongs to the reset.** Without Tailwind's preflight rule, `.flex` beats the
  browser's `display:none` and the bubble bar sits on screen permanently with `hidden` set.
- **The cut has to close over its own variables.** A kept rule reading a dropped
  `--dur-fast` is not an error, it is an animation that never runs. And the closure must
  SKIP what the pen sheet owns, or `--ink-h` at `:root` changes stroke height by 4%.
- **`.prose` brings the ink with it.** The strokes are written `.prose mark[data-pen="N"]`,
  300 of them carrying 1,932 URL-encoded colours, and `quireink-pen.css` already has every
  one. Selectors naming `data-pen`, `data-ink` or `data-form` are dropped from this cut.
- **`.prose` is all `var()` and the declarations are NOT in the admin build.** In Quire Ink
  the admin shell inlines the site's own root variables; there is no site here. Cut `.prose`
  in without `--fs-body`, `--c-text`, `--font-reading` and the rest and every rule resolves to
  nothing: the writing renders in wp-admin's 13px sans while the stylesheet says otherwise.
  `tools/extract.ts` RUNS the engine's own emitters on its own defaults and scopes the result
  to the screen. Nothing there is a colour or a size anybody typed.
- **The scope needs an id, and it must not be an `:is()` with one in it.** wp-admin styles
  bare elements and `#poststuff h2{font-size:14px}` cannot be outranked by classes, so the cut
  is scoped `#quireink-pen-paper`. It was `:is(#quireink-pen-paper, body.…)` for one run:
  `:is()` takes its highest argument's specificity, which handed Tailwind's preflight
  `*{margin:0}` a 1-0-0 that tied with `#wpcontent{margin-left:160px}` and won on order. The
  whole admin page slid under the menu.
- **Specificity cannot fix inheritance**, and `p{font-size:13px}` in wp-admin is the case.
  `.prose` sizes the surface and the paragraphs inherit; inheritance loses to any declaration.
  `screen.css` says `font-size: inherit` on the elements wp-admin declares, at 1-0-1 — above
  wp-admin, below the generated sheet. See [`docs/writing-screen.md`](../writing-screen.md).

## One field is what WordPress saves

`<textarea name="content">`, and the editor is what fills it. It is refreshed two seconds after
the last edit, on `before-autosave`, and on submit in the capture phase. Not on every keystroke:
the blog engine measured a 400ms debounce and took it out, because 400ms is shorter than the
pause between two sentences and the serialize landed inside every one of them.

[`docs/writing-screen.md`](../writing-screen.md) has the five WordPress facts this leans on and
what breaks if one of them moves.

## The seed hash

`assets/js/seed.js` holds it, once. It is the engine's, published in its `docs/pen.md`:

```js
let h = 0x811c9dc5
for ( let i = 0; i < text.length; i++ ) h = Math.imul( h ^ text.charCodeAt( i ), 0x01000193 )
return ( text.length <= 28 ? 40 : 0 ) + ( h >>> 0 ) % 40
```

Variants 0-39 are long strokes for a phrase, 40-79 the short hand for a word or two, which is
what the length test picks between.

**Do not write this a second time.** `check:contract` counts implementations by looking for the
FNV prime and requires exactly one. When something server-side needs a seed, the answer is to
pass it from the client or to move this file to a shared build, not to translate thirteen lines
into PHP. Invariant 3 has the reason.

## Scripts

Built with `@wordpress/scripts`, sources committed. Plugin review reads bundled JavaScript and
either the unminified sources are in the tree or the build is documented; both, here.

Every script handle is prefixed and every dependency is declared rather than assumed. A missing
`wp-rich-text` dependency does not error, it just never registers the format.
