/**
 * The seed hash. ONE implementation (docs/invariants.md, invariant 3).
 *
 * It decides which of 80 strokes a mark gets, and it is the blog engine's, published in its
 * `docs/pen.md` under ADR 0048. The same words must draw the same stroke on a Quire Ink and
 * on a WordPress post, or the two surfaces are not the same instrument.
 *
 * Variants 0-39 are long strokes for a phrase; 40-79 are the short hand for a word or two,
 * which is what the length test picks between.
 *
 * DO NOT WRITE THIS AGAIN. `check:contract` counts implementations by looking for the FNV
 * prime and requires exactly one, and compares this function's answers against the engine's
 * own `penSeed` on a fixture. The engine carries the scar that taught it: four parsers once
 * spelled one regex out separately and two of them drifted within the hour.
 */
( function ( global ) {
	'use strict';

	function quireInkPenSeed( text ) {
		var h = 0x811c9dc5;
		for ( var i = 0; i < text.length; i++ ) {
			h = Math.imul( h ^ text.charCodeAt( i ), 0x01000193 );
		}
		return ( text.length <= 28 ? 40 : 0 ) + ( h >>> 0 ) % 40;
	}

	global.quireInkPen = global.quireInkPen || {};
	global.quireInkPen.seed = quireInkPenSeed;
}( window ) );
