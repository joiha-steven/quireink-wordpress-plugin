/**
 * The Quire Ink writing screen.
 *
 * Mounts the blog engine's own editor - the real one, bundled by `tools/extract.ts`, not a
 * reimplementation - and wires three things around it: a save, a way back, and an honest
 * account of what state the post is in.
 *
 * MARKDOWN IS THE SOURCE. `post_content` gets the render so that every theme, feed and search
 * index in WordPress reads ordinary HTML, but what this screen loads and saves is the
 * Markdown. See `inc/store.php` for why there are two and how they are kept honest.
 */
( function () {
	'use strict';

	var cfg = window.quireInkPenScreen;
	var engine = window.quireInkEngine;
	var __ = ( window.wp && window.wp.i18n && window.wp.i18n.__ ) || function ( s ) { return s; };

	if ( ! cfg || ! engine ) {
		return;
	}

	var root = document.getElementById( 'quireink-pen-app' );
	var editor = null;
	var savedMarkdown = cfg.markdown;
	var saving = false;

	function el( tag, attrs, kids ) {
		var n = document.createElement( tag );
		Object.keys( attrs || {} ).forEach( function ( k ) {
			if ( k === 'text' ) { n.textContent = attrs[ k ]; }
			else if ( k === 'class' ) { n.className = attrs[ k ]; }
			else { n.setAttribute( k, attrs[ k ] ); }
		} );
		( kids || [] ).forEach( function ( c ) { n.appendChild( c ); } );
		return n;
	}

	// ── the furniture ────────────────────────────────────────────────────────────────────
	var status = el( 'span', { class: 'qi-status', text: '' } );
	var saveBtn = el( 'button', { type: 'button', class: 'qi-save', text: __( 'Save', 'quire-ink-pen' ) } );
	var back = el( 'a', { class: 'qi-back', href: cfg.backUrl, text: __( 'Back to WordPress', 'quire-ink-pen' ) } );
	var view = el( 'a', { class: 'qi-view', href: cfg.viewUrl, target: '_blank', rel: 'noreferrer', text: __( 'View', 'quire-ink-pen' ) } );

	var bar = el( 'header', { class: 'qi-bar' }, [
		el( 'span', { class: 'qi-title', text: cfg.title || __( '(no title)', 'quire-ink-pen' ) } ),
		status, view, back, saveBtn,
	] );

	var notice = null;
	if ( cfg.state === 'foreign' ) {
		notice = el( 'div', { class: 'qi-notice qi-notice-warn', text: __(
			'This post has been edited in WordPress since Quire Ink last saved it. What you see below is the older Quire Ink version. Saving will replace the newer one.',
			'quire-ink-pen'
		) } );
	} else if ( cfg.state === 'new' && cfg.html ) {
		notice = el( 'div', { class: 'qi-notice', text: __(
			'This post was not written in Quire Ink. Its HTML has been brought in as it stands; Markdown written from here on will be the source.',
			'quire-ink-pen'
		) } );
	}

	var toolbarHost = el( 'div', { class: 'qi-toolbar' } );
	var host = el( 'div', { class: 'qi-host' } );
	var page = el( 'div', { class: 'qi-page' }, notice ? [ notice, host ] : [ host ] );
	root.appendChild( bar );
	root.appendChild( toolbarHost );
	root.appendChild( page );

	// ── the editor ───────────────────────────────────────────────────────────────────────
	// Markdown when this post has been written here before; otherwise the post's own HTML,
	// read into the editor's document by ProseMirror rather than by the Markdown parser.
	var seed = cfg.markdown ? cfg.markdown : ( cfg.html ? engine.htmlToNodes( cfg.html ) : '' );

	editor = new engine.Editor( {
		element: host,
		content: seed,
		placeholder: __( 'Write.', 'quire-ink-pen' ),
	} );
	editor.focus();

	// ── the writing furniture ────────────────────────────────────────────────────────────
	//
	// The blog engine's own toolbar and bubble bar, not a second pair built here. Everything
	// they can do is what the engine's writer already knows how to do, and when the engine
	// gains a button this gains it too, through `bun run extract`.

	/**
	 * The link box.
	 *
	 * `window.prompt` and not a designed dialog, deliberately and for now: the engine's own
	 * link box is part of its admin shell rather than its editor, so lifting it means lifting
	 * the shell. A prompt is honest about being temporary; a half-built dialog is not.
	 * Resolves to a URL, '' to unlink, or null when the writer backs out.
	 */
	function askLink( previous ) {
		var answer = window.prompt( __( 'Link address', 'quire-ink-pen' ), previous || '' );
		return Promise.resolve( answer === null ? null : answer.trim() );
	}

	/**
	 * Pictures come from WordPress's own media library, because on a WordPress site that is
	 * where the writer's pictures already are. The engine's picker talks to the engine's
	 * storage and has no business here.
	 */
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
			var picked = frame.state().get( 'selection' ).toJSON();
			onPicked( picked.map( function ( a ) {
				return { src: a.url, alt: a.alt || '', width: a.width, height: a.height };
			} ) );
		} );
		frame.open();
	}

	var toolbar = engine.mountToolbar( toolbarHost, {
		editor: editor,
		words: engine.words,
		askLink: askLink,
		onPickImage: function () {
			pickMedia( false, function ( items ) {
				if ( items[ 0 ] ) { editor.chain().focus().setImage( items[ 0 ] ).run(); }
			} );
		},
		onPickGallery: function () {
			pickMedia( true, function ( items ) {
				if ( items.length ) { editor.chain().focus().setGallery( { images: items } ).run(); }
			} );
		},
	} );

	var bubble = engine.mountBubbleBar( editor, engine.sheetWords, askLink );

	// Both bars are told how much sticky furniture is above them, measured rather than assumed:
	// the top bar's height depends on the font the admin is rendering in.
	function measureTop() {
		var px = bar.getBoundingClientRect().height;
		if ( toolbar && toolbar.setTop ) { toolbar.setTop( px ); }
		if ( bubble && bubble.setAvoidTop ) { bubble.setAvoidTop( px + toolbarHost.getBoundingClientRect().height ); }
	}
	measureTop();
	window.addEventListener( 'resize', measureTop );

	function dirty() {
		return editor.getMarkdown() !== savedMarkdown;
	}

	function setStatus( text, kind ) {
		status.textContent = text;
		status.className = 'qi-status' + ( kind ? ' qi-status-' + kind : '' );
	}

	// ── saving ───────────────────────────────────────────────────────────────────────────
	function save( force ) {
		if ( saving ) { return; }
		saving = true;
		saveBtn.disabled = true;
		setStatus( __( 'Saving…', 'quire-ink-pen' ) );

		var markdown = editor.getMarkdown();

		// The RENDER comes from the reader's renderer, not from the editor's own serializer:
		// what goes into post_content is what a reader would have seen on a Quire Ink, so the
		// two surfaces cannot drift by one being serialised a different way.
		var html = engine.toHtml( markdown );

		window.fetch( cfg.restUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
			body: JSON.stringify( { markdown: markdown, html: html, force: !! force } ),
		} ).then( function ( r ) {
			return r.json().then( function ( body ) { return { ok: r.ok, status: r.status, body: body }; } );
		} ).then( function ( res ) {
			saving = false;
			saveBtn.disabled = false;
			if ( res.ok ) {
				savedMarkdown = markdown;
				setStatus( __( 'Saved', 'quire-ink-pen' ), 'ok' );
				return;
			}
			if ( res.status === 409 ) {
				setStatus( __( 'Edited elsewhere', 'quire-ink-pen' ), 'warn' );
				if ( window.confirm( res.body.message + '\n\n' + __( 'Save anyway and replace it?', 'quire-ink-pen' ) ) ) {
					save( true );
				}
				return;
			}
			setStatus( ( res.body && res.body.message ) || __( 'Save failed', 'quire-ink-pen' ), 'warn' );
		} ).catch( function ( e ) {
			saving = false;
			saveBtn.disabled = false;
			setStatus( e.message || __( 'Save failed', 'quire-ink-pen' ), 'warn' );
		} );
	}

	saveBtn.addEventListener( 'click', function () { save( false ); } );

	document.addEventListener( 'keydown', function ( e ) {
		if ( ( e.metaKey || e.ctrlKey ) && e.key === 's' ) {
			e.preventDefault();
			save( false );
		}
	} );

	// Leaving with unsaved work is the one thing this screen must not do quietly.
	window.addEventListener( 'beforeunload', function ( e ) {
		if ( ! dirty() ) { return; }
		e.preventDefault();
		e.returnValue = '';
	} );

	window.quireInkPenApp = { editor: editor, save: save, dirty: dirty };
}() );
