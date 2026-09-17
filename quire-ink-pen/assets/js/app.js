/**
 * The Quire Ink writing surface, inside WordPress's own post form.
 *
 * ADR 0009. There is no Save button here, no status line and no "back to WordPress": the form
 * around this already has Publish, Save draft, Schedule, Preview, the revision list and the
 * post lock, and every one of them works because the editor keeps ONE field filled in —
 * `<textarea name="content">`, which `post.php` has read since 2003.
 *
 * So this file does four things and stops:
 *
 *   1. builds the blog engine's editor on the paper the server printed
 *   2. gives it the engine's own furniture: the button strip, the bubble bar, the "/" menu
 *   3. keeps `#content` and the Markdown field in step with the document
 *   4. asks once, before the first save, if the post has layout Markdown cannot hold
 *
 * MARKDOWN IS THE SOURCE. `post_content` gets the render so that every theme, feed and search
 * index reads ordinary HTML; the Markdown rides up beside it in a hidden field and
 * `inc/store.php` explains how the two are kept honest.
 */
( function () {
	'use strict';

	var cfg = window.quireInkPenCompose;
	var engine = window.quireInkEngine;
	var __ = ( window.wp && window.wp.i18n && window.wp.i18n.__ ) || function ( s ) { return s; };

	var shell = document.getElementById( 'quireink-pen-compose' );
	var paper = document.getElementById( 'quireink-pen-paper' );
	if ( ! cfg || ! engine || ! shell || ! paper ) {
		return;
	}

	var tools = paper.querySelector( '[data-quireink-tools]' );
	var sheet = paper.querySelector( '[data-quireink-sheet]' );
	var content = document.getElementById( 'content' );
	var source = shell.querySelector( 'input[name="quireink_pen_markdown"]' );
	var form = document.getElementById( 'post' );

	// All five or none. Mounting an editor whose text has nowhere to go is worse than not
	// mounting it: the writing looks saved and is not.
	if ( ! tools || ! sheet || ! content || ! source || ! form ) {
		return;
	}

	// ── what a picture does ──────────────────────────────────────────────────────────────
	//
	// Pictures come from WordPress's media library, because on a WordPress site that is where
	// the writer's pictures already are. The engine's own picker talks to the engine's own
	// storage and has no business here.

	function pickMedia( multiple, onPicked ) {
		if ( ! window.wp || ! window.wp.media ) {
			window.alert( __( 'The WordPress media library is not available on this screen.', 'quire-ink-pen' ) );
			return;
		}
		var frame = window.wp.media( {
			title: __( 'Choose a picture', 'quire-ink-pen' ),
			multiple: !! multiple,
			library: { type: 'image' },
		} );
		frame.on( 'select', function () {
			onPicked( frame.state().get( 'selection' ).toJSON().map( function ( a ) {
				return { src: a.url, alt: a.alt || '', width: a.width, height: a.height };
			} ) );
		} );
		frame.open();
	}

	/** A dropped or pasted file into the media library, and back as a URL. */
	function upload( file ) {
		if ( ! window.wp || ! window.wp.apiFetch ) {
			return Promise.resolve( null );
		}
		var body = new window.FormData();
		body.append( 'file', file, file.name );
		return window.wp.apiFetch( { path: '/wp/v2/media', method: 'POST', body: body } )
			.then( function ( item ) { return item && item.source_url ? item.source_url : null; } )
			.catch( function () { return null; } );
	}

	/**
	 * The link box.
	 *
	 * `window.prompt` and not a designed dialog, deliberately and for now: the engine's own
	 * link box is part of its admin shell rather than its editor, so lifting it means lifting
	 * the shell. A prompt is honest about being temporary; a half-built dialog is not.
	 */
	function askLink( previous ) {
		var answer = window.prompt( __( 'Link address', 'quire-ink-pen' ), previous || '' );
		return Promise.resolve( answer === null ? null : answer.trim() );
	}

	// ── the editor ───────────────────────────────────────────────────────────────────────
	//
	// A post written here round-trips from its Markdown. One that was not opens from its own
	// HTML, read into the editor's document by ProseMirror rather than by the Markdown parser,
	// which would show the author their own tags as text.
	var seed = cfg.markdown ? cfg.markdown : ( cfg.html ? engine.htmlToNodes( cfg.html ) : '' );

	var editorRef = { current: null };
	var slashRef = { current: null };
	var chrome = { slash: null };

	function imageFiles( list ) {
		return Array.prototype.slice.call( list || [] ).filter( function ( f ) {
			return f.type.indexOf( 'image/' ) === 0;
		} );
	}

	/** Upload and insert, in order, from wherever they came. Sequential: pictures a person
	 *  chose in an order must arrive in that order, and parallel uploads finish in whatever
	 *  order the network decides. */
	function insertImages( files, at ) {
		var pos = at;
		return files.reduce( function ( queue, file ) {
			return queue.then( function () {
				return upload( file ).then( function ( url ) {
					var ed = editorRef.current;
					if ( ! url || ! ed ) { return; }
					var alt = file.name.replace( /\.[a-z0-9]+$/i, '' );
					var chain = pos == null ? ed.chain().focus() : ed.chain().focus( pos );
					chain.setImage( { src: url, alt: alt } ).run();
					pos = ed.state.selection.to;
				} );
			} );
		}, Promise.resolve() );
	}

	function openSlash( at ) {
		if ( chrome.slash ) {
			chrome.slash();
			chrome.slash = null;
			slashRef.current = null;
		}
		if ( ! at ) { return; }
		chrome.slash = engine.openSlashMenu( {
			editor: editorRef.current,
			t: engine.sheetWords,
			at: at,
			onClose: function () { openSlash( null ); },
			onPickImage: function () { openSlash( null ); onPickImage(); },
			onPickGallery: function () { openSlash( null ); onPickGallery(); },
		} );
		// ⚠️ MOVED INTO THE PAPER. The engine appends the menu to `document.body`, which is
		// right on its own screen and wrong on this one: the writing surface's stylesheet is
		// scoped to the paper, so a menu left on the body renders as unstyled buttons in a
		// column. It is `position: fixed` and no ancestor here has a transform or a filter, so
		// re-parenting moves nothing on screen. Taken as the body's last child because the
		// append is synchronous and just happened.
		var menu = document.body.lastElementChild;
		if ( menu && menu.getAttribute( 'role' ) === 'menu' ) { paper.appendChild( menu ); }
	}

	function onPickImage() {
		pickMedia( false, function ( items ) {
			if ( items[ 0 ] ) { editorRef.current.chain().focus().setImage( items[ 0 ] ).run(); }
		} );
	}

	function onPickGallery() {
		pickMedia( true, function ( items ) {
			if ( items.length ) { editorRef.current.chain().focus().setGallery( { images: items } ).run(); }
		} );
	}

	var editor = new engine.Editor( {
		element: sheet,
		content: seed,
		placeholder: __( 'Write.', 'quire-ink-pen' ),
		askLink: askLink,
		// The engine's OWN surface props, not a copy of them: the `prose` class list that makes
		// the text read like a published page, the "/" trigger, and the drop and paste
		// handlers. The typewriter sound is the one part a WordPress screen has no business
		// with, so it is handed a silent one.
		editorProps: engine.writingSurface( {
			keySound: { mode: 'off', volume: 0 },
			caretRef: { current: null },
			slashRef: slashRef,
			setSlash: function ( at ) { slashRef.current = at; openSlash( at ); },
			editorRef: editorRef,
			insertImages: insertImages,
			imageFiles: imageFiles,
		} ),
	} );
	editorRef.current = editor;

	var toolbar = engine.mountToolbar( tools, {
		editor: editor,
		words: engine.words,
		askLink: askLink,
		onPickImage: onPickImage,
		onPickGallery: onPickGallery,
	} );
	var bubble = engine.mountBubbleBar( editor, engine.sheetWords, askLink );

	// Both bars are told how much fixed furniture is above them, MEASURED rather than assumed:
	// the admin bar is 32px on a desktop and 46px on a phone, and a plugin that writes either
	// number down is a plugin that is wrong on the other one.
	function measureTop() {
		var bar = document.getElementById( 'wpadminbar' );
		var top = bar && getComputedStyle( bar ).position === 'fixed' ? bar.offsetHeight : 0;
		if ( toolbar && toolbar.setTop ) { toolbar.setTop( top ); }
		// ⚠️ THE STRIP, NOT ITS SLOT. `.quireink-pen-tools` is `display: contents` so that the
		// sticky strip can travel the height of the paper, and an element with no box has
		// `offsetHeight` 0. Measuring the slot put the bubble bar directly under the admin bar,
		// which is exactly where the strip is.
		var strip = tools.firstElementChild;
		var h = strip ? strip.getBoundingClientRect().height : 0;
		if ( bubble && bubble.setAvoidTop ) { bubble.setAvoidTop( top + h ); }
	}
	measureTop();
	window.addEventListener( 'resize', measureTop );

	// ── keeping WordPress's field in step ────────────────────────────────────────────────
	//
	// `#content` is what `post.php` saves, what autosave reads, and what WordPress compares to
	// decide whether there is unsaved work. It is filled from the document rather than typed
	// into, so it has to be refreshed — and WHEN is a measured question, not a taste one.
	//
	// The engine tried a 400ms trailing debounce on this and took it out again: 400ms is
	// shorter than the pause between two sentences, so the serialize landed inside every one
	// of them, 126ms frozen on an 18k-word draft. Two seconds is longer than any pause inside
	// a sentence and 30 times finer than the 60-second autosave it feeds, so nothing that
	// reads this field ever sees text older than a breath.
	var syncing = 0;

	function sync() {
		window.clearTimeout( syncing );
		syncing = 0;
		var markdown = editor.getMarkdown();
		// The render comes from the READER's renderer, not the editor's own serializer, so the
		// writing surface and the published page cannot drift by being serialised two ways.
		content.value = engine.toHtml( markdown );
		source.value = markdown;
	}

	editor.on( 'update', function () {
		if ( syncing ) { return; }
		syncing = window.setTimeout( sync, 2000 );
	} );
	sync();

	// Autosave asks for the fields on its own schedule, which is never the same instant as the
	// debounce. `before-autosave` is jQuery's and it is the only hook that fires early enough.
	if ( window.jQuery ) {
		window.jQuery( document ).on( 'before-autosave', sync );
	}

	// ── the one thing that cannot be undone ──────────────────────────────────────────────
	var atRisk = cfg.atRisk || [];
	var consented = atRisk.length === 0;

	form.addEventListener( 'submit', function ( e ) {
		if ( ! consented ) {
			if ( ! window.confirm(
				__( 'This post uses blocks Markdown cannot hold:', 'quire-ink-pen' ) + '\n\n  ' + atRisk.join( '\n  ' )
				+ '\n\n' + __( 'Saving replaces them with plain text, and that cannot be undone from here. Continue?', 'quire-ink-pen' )
			) ) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}
			consented = true;
		}
		sync();
	}, true );

	window.quireInkPenApp = { editor: editor, sync: sync };
}() );
