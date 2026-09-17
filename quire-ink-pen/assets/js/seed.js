/**
 * The seed hash. ONE implementation (docs/invariants.md, invariant 3).
 *
 * It decides which of 80 strokes a mark gets, and it is the blog engine's, published in its
 * `docs/pen.md` under ADR 0048. The same words must draw the same stroke on a Quire Ink and
 * on a WordPress post, or the two surfaces are not the same instrument.
 *
 * ⚠️ IT HASHES THE GESTURE'S SOURCE, NOT THE WORDS. `penSeed` is called with `node.raw` in
 * the engine's renderer (`md/html.ts`), which is the whole gesture including its fences and
 * any `#colour` after them: `==a phrase==`, `++a line++`, `@@a word@@#green`. This file hashed
 * the bare text for a release, so the block editor and the Quire Ink editor dealt DIFFERENT
 * strokes to the same phrase — "highlighted phrase" drew variant 71 from one and 43 from the
 * other, in the same plugin, on the same words. Invariant 3 exists for exactly that.
 *
 * The length test is the other half and it works the other way: the SHORT half of the deck is
 * chosen by the length of what is inside the fences, because a hand does different things to a
 * word and to a sentence.
 *
 * Variants 0-39 are long strokes for a phrase; 40-79 are the short hand for a word or two.
 *
 * DO NOT WRITE THIS AGAIN. `check:contract` counts implementations by looking for the FNV
 * prime and requires exactly one, and compares this function's answers against the engine's
 * own `penSeed` on a fixture. The engine carries the scar that taught it: four parsers once
 * spelled one regex out separately and two of them drifted within the hour.
 */
( function ( global ) {
	'use strict';

	function quireInkPenSeed( raw ) {
		var h = 0x811c9dc5;
		for ( var i = 0; i < raw.length; i++ ) {
			h = Math.imul( h ^ raw.charCodeAt( i ), 0x01000193 );
		}
		var inner = raw.replace( /^(==|\+\+|@@)/, '' ).replace( /(==|\+\+|@@)(#[a-z]+)?$/, '' );
		return ( inner.length <= 28 ? 40 : 0 ) + ( h >>> 0 ) % 40;
	}

	global.quireInkPen = global.quireInkPen || {};
	global.quireInkPen.seed = quireInkPenSeed;
}( window ) );
