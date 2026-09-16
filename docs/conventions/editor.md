# The editor

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
