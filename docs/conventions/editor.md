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
