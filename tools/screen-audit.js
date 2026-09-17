/**
 * THE WRITING SCREEN, MEASURED. Paste into the console on a post open in Quire Ink, or send it
 * through the browser pane. It changes nothing and returns a list of findings.
 *
 * It exists because "it looks bad" and "it is 16px out" are the same sentence said twice, and
 * only one of them can be fixed. Every rule below is a number against a target, and the target
 * is zero. The first version of this file measured BOXES and passed a screen with four
 * different left edges, because the boxes agreed and the words did not — everything here reads
 * the text edge: the border box less its border and its padding.
 *
 * The spacing ladder is read out of `--quireink-*` on the page rather than repeated here, so
 * the stylesheet and the check cannot drift apart.
 *
 * Run it at three widths. 1440 is a laptop, 1024 is where the engine's own `lg:` variants
 * switch, 600 is WordPress's one-column admin.
 *
 * WHAT IT CANNOT SEE, said out loud so nobody trusts it further than it goes:
 *
 *   * the CASCADE on a focus ring. Rule 9 asks whether a rule that draws something exists and
 *     matches; it cannot tell that a later rule switched it off, because deciding that needs
 *     the element to really have focus and a browser pane that does not hold the window's
 *     focus never reports `:focus`. Sabotaged with `outline:none` in a second rule, it stays
 *     green. Look at a Tab press.
 *   * anything about whether the words are the right words.
 *   * colour, beyond the contrast ratio: it has no opinion on ugly.
 */
( function () {
	'use strict';

	var findings = [];
	var note = function ( rule, detail, measured ) { findings.push( { rule: rule, detail: detail, measured: measured } ); };
	var R = function ( n ) { return Math.round( n * 100 ) / 100; };
	var seen = function ( el ) { return !! ( el && el.checkVisibility && el.checkVisibility() ); };

	/** The TEXT edge, not the box: border box less border and padding. */
	var edge = function ( el ) {
		var b = el.getBoundingClientRect(), c = getComputedStyle( el );
		return {
			l: R( b.left + parseFloat( c.borderLeftWidth ) + parseFloat( c.paddingLeft ) ),
			r: R( b.right - parseFloat( c.borderRightWidth ) - parseFloat( c.paddingRight ) ),
			t: R( b.top + parseFloat( c.borderTopWidth ) + parseFloat( c.paddingTop ) ),
			b: R( b.bottom - parseFloat( c.borderBottomWidth ) - parseFloat( c.paddingBottom ) ),
		};
	};

	var shell = document.getElementById( 'quireink-pen-compose' );
	var paper = document.getElementById( 'quireink-pen-paper' );
	var card = document.getElementById( 'post-body-content' );
	if ( ! shell || ! paper || ! card ) { return JSON.stringify( { error: 'not a Quire Ink screen' } ); }

	var strip = paper.querySelector( '.quireink-pen-tools' ).firstElementChild;
	var blocks = Array.prototype.slice.call( paper.querySelectorAll( '.ProseMirror > *' ) );
	var scale = getComputedStyle( document.body );
	var step = function ( name ) { return parseFloat( scale.getPropertyValue( '--quireink-' + name ) ); };
	var LADDER = { step: step( 'step' ), wide: step( 'wide' ), edge: step( 'edge' ), room: step( 'room' ) };

	var part = {
		title: document.getElementById( 'title' ),
		permalink: document.getElementById( 'edit-slug-box' ),
		notice: shell.querySelector( '.quireink-pen-quiet, .quireink-pen-warning' ),
		strip: strip,
		firstBlock: blocks[ 0 ],
		lastBlock: blocks[ blocks.length - 1 ],
		hint: shell.querySelector( '.quireink-pen-hint' ),
	};
	var at = {};
	Object.keys( part ).forEach( function ( k ) { if ( seen( part[ k ] ) ) { at[ k ] = edge( part[ k ] ); } } );

	// ── 1. one column, two edges ─────────────────────────────────────────────────────────
	var column = [ 'title', 'permalink', 'notice', 'firstBlock', 'lastBlock', 'hint' ].filter( function ( k ) { return at[ k ]; } );
	[ 'l', 'r' ].forEach( function ( side ) {
		var xs = column.map( function ( k ) { return at[ k ][ side ]; } );
		var spread = R( Math.max.apply( null, xs ) - Math.min.apply( null, xs ) );
		if ( spread !== 0 ) {
			note( 'column/' + ( side === 'l' ? 'left' : 'right' ), 'the column has more than one ' + ( side === 'l' ? 'left' : 'right' ) + ' edge',
				column.map( function ( k, i ) { return k + ' ' + xs[ i ]; } ).join( ', ' ) );
		}
	} );

	// ── 2. the ladder ────────────────────────────────────────────────────────────────────
	//
	// Every gap down the page is one of the three declared steps, or it is named here. The
	// title's own leading is the exception and it is written into the stylesheet as padding.
	var want = {
		'title>permalink': 12,
		'permalink>notice': LADDER.step,
		'notice>strip': LADDER.step,
		'strip>firstBlock': LADDER.wide,
		// The writing's own room plus the step under the card's last part.
		'lastBlock>hint': LADDER.room + LADDER.wide,
	};
	var order = [ 'title', 'permalink', 'notice', 'strip', 'firstBlock' ].filter( function ( k ) { return at[ k ]; } );
	var gaps = [];
	for ( var i = 1; i < order.length; i++ ) {
		var key = order[ i - 1 ] + '>' + order[ i ];
		var got = R( at[ order[ i ] ].t - at[ order[ i - 1 ] ].b );
		gaps.push( key + ' ' + got );
		if ( got < -0.5 ) { note( 'overlap', key + ' overlap', got + 'px' ); }
		// A step is only checked when both parts are on screen in the order the ladder assumes.
		if ( want[ key ] !== undefined && Math.abs( got - want[ key ] ) > 1 ) {
			note( 'ladder', key + ' is off the ladder', got + ', wanted ' + want[ key ] );
		}
	}

	if ( at.lastBlock && at.hint ) {
		var end = R( at.hint.t - at.lastBlock.b );
		gaps.push( 'lastBlock>hint ' + end );
		if ( Math.abs( end - want[ 'lastBlock>hint' ] ) > 1 ) {
			note( 'ladder', 'lastBlock>hint is off the ladder', end + ', wanted ' + want[ 'lastBlock>hint' ] );
		}
	}

	// ── 3. the card's own margins ────────────────────────────────────────────────────────
	var cb = card.getBoundingClientRect();
	var top = R( at.title.t - cb.top ), bottom = R( cb.bottom - at.hint.b );
	if ( Math.abs( top - bottom ) > 1 ) { note( 'card/edge', 'the card is not evenly padded top and bottom', top + ' over, ' + bottom + ' under' ); }
	var side = [ R( at.firstBlock.l - cb.left ), R( cb.right - at.firstBlock.r ) ];
	if ( Math.abs( side[ 0 ] - side[ 1 ] ) > 1 ) { note( 'card/centre', 'the writing is not centred in the card', side.join( ' / ' ) ); }

	// ── 4. the strip shows every key it has ──────────────────────────────────────────────
	var sb = strip.getBoundingClientRect();
	var keys = Array.prototype.slice.call( strip.querySelectorAll( 'button' ) ).filter( seen );
	var hidden = keys.filter( function ( b ) {
		var r = b.getBoundingClientRect();
		return r.right > sb.right + 1 || r.left < sb.left - 1;
	} );
	if ( hidden.length ) {
		note( 'strip/clipped', hidden.length + ' key(s) are off the edge of the strip with nothing to say so',
			hidden.map( function ( b ) { return b.getAttribute( 'aria-label' ) || b.title; } ).slice( 0, 5 ).join( ', ' ) );
	}

	// ── 5. nothing pushes the page sideways ──────────────────────────────────────────────
	if ( document.documentElement.scrollWidth > window.innerWidth + 1 ) {
		note( 'overflow/page', 'the page scrolls sideways', document.documentElement.scrollWidth + ' over ' + window.innerWidth );
	}
	Array.prototype.forEach.call( card.querySelectorAll( '*' ), function ( el ) {
		if ( ! seen( el ) || getComputedStyle( el ).position === 'fixed' ) { return; }
		var b = el.getBoundingClientRect();
		if ( ! b.width ) { return; }
		if ( b.right - cb.right > 1 || cb.left - b.left > 1 ) {
			note( 'overflow/card', el.tagName.toLowerCase() + '.' + String( el.className ).slice( 0, 24 ) + ' sticks out of the card',
				R( Math.max( b.right - cb.right, cb.left - b.left ) ) + 'px' );
		}
	} );

	// ── 6. one face for the writing ──────────────────────────────────────────────────────
	var reading = getComputedStyle( blocks[ 0 ] || paper ).fontFamily.split( ',' )[ 0 ].replace( /["']/g, '' );
	[ [ 'title', part.title ], [ 'prompt', document.getElementById( 'title-prompt-text' ) ] ].forEach( function ( p ) {
		if ( ! seen( p[ 1 ] ) ) { return; }
		var f = getComputedStyle( p[ 1 ] ).fontFamily.split( ',' )[ 0 ].replace( /["']/g, '' );
		if ( f !== reading ) { note( 'face', p[ 0 ] + ' is not in the reading face', f + ' against ' + reading ); }
	} );

	// ── 7. contrast ──────────────────────────────────────────────────────────────────────
	var lum = function ( rgb ) {
		var p = rgb.match( /[\d.]+/g ).slice( 0, 3 ).map( function ( v ) {
			v = v / 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 );
		} );
		return 0.2126 * p[ 0 ] + 0.7152 * p[ 1 ] + 0.0722 * p[ 2 ];
	};
	var ratio = function ( a, b ) { var x = lum( a ), y = lum( b ); return R( ( Math.max( x, y ) + 0.05 ) / ( Math.min( x, y ) + 0.05 ) ); };
	var onCard = getComputedStyle( card ).backgroundColor;
	[ [ 'writing', blocks[ 0 ] ], [ 'hint', part.hint ], [ 'notice', part.notice ], [ 'permalink', part.permalink ] ].forEach( function ( p ) {
		if ( ! seen( p[ 1 ] ) ) { return; }
		var cs = getComputedStyle( p[ 1 ] );
		var r = ratio( cs.color, onCard );
		var floor = parseFloat( cs.fontSize ) >= 18.66 ? 3 : 4.5;
		if ( r < floor ) { note( 'contrast', p[ 0 ] + ' is under the floor', r + ':1, needs ' + floor ); }
	} );

	// ── 8. anything you click is big enough to click ─────────────────────────────────────
	var small = [];
	Array.prototype.forEach.call( shell.querySelectorAll( 'button, a, summary' ), function ( el ) {
		if ( ! seen( el ) ) { return; }
		var b = el.getBoundingClientRect();
		if ( b.height < 24 || b.width < 24 ) {
			small.push( ( el.getAttribute( 'aria-label' ) || el.title || el.textContent.trim().slice( 0, 14 ) || el.tagName ) + ' ' + R( b.width ) + 'x' + R( b.height ) );
		}
	} );
	if ( small.length ) { note( 'target', small.length + ' control(s) under 24x24', small.slice( 0, 6 ).join( '; ' ) ); }

	// ── 9. a keyboard can see where it is ────────────────────────────────────────────────
	//
	// ⚠️ THE RULE IS LOOKED FOR, NOT SIMULATED. Calling `.focus()` and reading the computed
	// style reports nothing when the BROWSER WINDOW itself is not focused — `document
	// .activeElement` is the field and `:focus` still does not match. Run from a pane that does
	// not hold focus, that check called both of these broken and neither was. So the sheets are
	// read instead: is there a rule carrying `:focus` or `:focus-visible` that this element
	// matches once the pseudo is taken off?
	var hasFocusRule = function ( el ) {
		for ( var s = 0; s < document.styleSheets.length; s++ ) {
			var rules;
			try { rules = document.styleSheets[ s ].cssRules; } catch ( e ) { continue; }
			for ( var r = 0; r < rules.length; r++ ) {
				var sel = rules[ r ].selectorText;
				if ( ! sel || sel.indexOf( ':focus' ) === -1 ) { continue; }
				// `A B :focus-visible` is a rule about DESCENDANTS. Stripping the pseudo leaves
				// `A B`, which matches the ancestor and never the key, so the first cut of this
				// reported a ring that was there. A lone pseudo becomes `*`.
				// ⚠️ THE TEST COMES BEFORE THE TRIM. Trimming first takes away the very space
				// that says the pseudo stood on its own, and then the `*` is never added —
				// which is how this check went on reporting a ring that was already there.
				var bare = sel.replace( /:focus(-visible|-within)?/g, '' );
				if ( bare.trim() === '' || /[\s>+~]$/.test( bare ) ) { bare += '*'; }
				bare = bare.trim();
				// ⚠️ THE RULE HAS TO DRAW SOMETHING. `outline: none` inside a `:focus-visible`
				// block is a rule that exists and a ring nobody sees; the first cut of this
				// counted it and passed a strip with the indicator switched off.
				var draws = /^(?!none)/.test( rules[ r ].style.outlineStyle || '' )
					&& rules[ r ].style.outlineStyle !== ''
					&& rules[ r ].style.outlineStyle !== 'none';
				if ( ! draws && ! rules[ r ].style.boxShadow && ! rules[ r ].style.backgroundImage ) { continue; }
				try { if ( el.matches( bare ) ) { return true; } } catch ( e ) { /* not a selector we can test */ }
			}
		}
		return false;
	};
	[ [ 'the title', part.title ], [ 'a toolbar key', strip.querySelector( 'button' ) ] ].forEach( function ( p ) {
		if ( ! seen( p[ 1 ] ) ) { return; }
		if ( ! hasFocusRule( p[ 1 ] ) ) { note( 'focus', p[ 0 ] + ' has no rule for taking focus', 'none found in ' + document.styleSheets.length + ' sheet(s)' ); }
	} );

	return JSON.stringify( {
		at: window.innerWidth + 'x' + window.innerHeight,
		card: R( cb.width ) + 'px, writing ' + ( at.firstBlock ? R( at.firstBlock.r - at.firstBlock.l ) : '?' ) + 'px',
		ladder: LADDER,
		gaps: gaps,
		findings: findings,
		verdict: findings.length === 0 ? 'clean' : findings.length + ' finding(s)',
	}, null, 1 );
}() );
