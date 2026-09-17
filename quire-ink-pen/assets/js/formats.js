/**
 * The three gestures, as block editor formats.
 *
 * TWO format types, not three. `@wordpress/rich-text` resolves a format by tag name and class
 * name, so two types on a bare <mark> would shadow each other, and the ring IS a <mark> by the
 * upstream contract (docs/decisions/0004). One type owns <mark> and carries `data-form` as an
 * attribute; two buttons apply it with different values. Nothing is added to the markup to
 * make the editor's life easier.
 *
 * ⚠️ A KEYBOARD SHORTCUT IS THE POINT. A toolbar button for a format lands in the toolbar's
 * overflow menu, so marking a phrase costs select, open the chevron, choose: three actions for
 * the one thing this plugin exists to do. `BlockControls` with `group: 'inline'` was tried and
 * DOES NOT WORK from inside a format's edit - measured in WordPress 6.8, no button appears
 * anywhere in the DOM, no console error, and the failing render silently took the shortcuts
 * down with it. Format edits have no block edit context to fill that slot from.
 *
 * So: the button stays in the menu for discovery, and the shortcut is how it is actually used.
 * `primaryShift` (Cmd/Ctrl+Shift) is the namespace core uses for its own format shortcuts,
 * primaryShift+D strikethrough and primaryShift+X code. Measured in 6.8: primaryShift fires,
 * `access` (Ctrl+Alt) does not.
 *
 * The titles all begin "Pen" because CORE ALREADY SHIPS A FORMAT CALLED "Highlight", and two
 * entries reading Highlight in one menu is a bug report waiting to be filed.
 *
 * Plain script against the `wp.*` globals, deliberately: no build step is a build step nobody
 * has to document to a plugin reviewer, and this is small enough to stay that way.
 */
( function ( wp ) {
	'use strict';

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var registerFormatType = wp.richText.registerFormatType;
	var applyFormat = wp.richText.applyFormat;
	var removeFormat = wp.richText.removeFormat;
	var getActiveFormat = wp.richText.getActiveFormat;
	var getTextContent = wp.richText.getTextContent;
	var slice = wp.richText.slice;
	var isCollapsed = wp.richText.isCollapsed;
	var RichTextShortcut = wp.blockEditor.RichTextShortcut;
	var ToolbarButton = wp.blockEditor.RichTextToolbarButton;
	var __ = wp.i18n.__;

	var MARK = 'quire-ink-pen/mark';
	var UNDERLINE = 'quire-ink-pen/underline';

	/**
	 * The fence each gesture is written with in Markdown. The seed is a hash of the gesture's
	 * SOURCE, not of the words, so a mark made with a button here has to be hashed as though it
	 * had been typed: `==a phrase==`, `++a line++`, `@@a word@@`. Hashing the bare text dealt a
	 * different stroke from the one the Quire Ink editor deals to the same phrase.
	 */
	var FENCE = { mark: '==', ring: '@@', underline: '++' };

	/** The stroke for the words currently selected, in the gesture about to be applied. */
	function seedFor( value, fence ) {
		return String( window.quireInkPen.seed( fence + getTextContent( slice( value ) ) + fence ) );
	}

	function isActive( value, name, form ) {
		var active = getActiveFormat( value, name );
		if ( ! active ) {
			return false;
		}
		var attrs = active.attributes || active.unregisteredAttributes || {};
		return form ? 'o' === attrs[ 'data-form' ] : 'o' !== attrs[ 'data-form' ];
	}

	function toggle( props, name, form ) {
		var value = props.value;
		if ( isActive( value, name, form ) ) {
			props.onChange( removeFormat( value, name ) );
			return;
		}
		// Nothing selected means nothing to mark. Applying to a collapsed selection would
		// leave an empty <mark> that draws a stroke over no words.
		if ( isCollapsed( value ) ) {
			return;
		}
		var fence = form ? FENCE.ring : ( UNDERLINE === name ? FENCE.underline : FENCE.mark );
		var attributes = { 'data-pen': seedFor( value, fence ) };
		if ( form ) {
			attributes[ 'data-form' ] = form;
		}
		props.onChange( applyFormat( value, { type: name, attributes: attributes } ) );
	}

	/** One gesture: the shortcut that is used, and the menu entry that makes it findable. */
	function gesture( props, name, form, title, icon, character ) {
		var onUse = function () {
			toggle( props, name, form );
		};
		return el(
			Fragment,
			null,
			el( RichTextShortcut, { type: 'primaryShift', character: character, onUse: onUse } ),
			el( ToolbarButton, {
				icon: icon,
				title: title,
				isActive: isActive( props.value, name, form ),
				onClick: onUse,
				shortcutType: 'primaryShift',
				shortcutCharacter: character,
			} )
		);
	}

	registerFormatType( MARK, {
		title: __( 'Pen highlight', 'quire-ink-pen' ),
		tagName: 'mark',
		className: null,
		attributes: {
			'data-pen': 'data-pen',
			'data-ink': 'data-ink',
			'data-form': 'data-form',
		},
		edit: function ( props ) {
			return el(
				Fragment,
				null,
				gesture( props, MARK, null, __( 'Pen highlight', 'quire-ink-pen' ), 'edit', 'h' ),
				gesture( props, MARK, 'o', __( 'Pen ring', 'quire-ink-pen' ), 'marker', 'o' )
			);
		},
	} );

	registerFormatType( UNDERLINE, {
		title: __( 'Pen underline', 'quire-ink-pen' ),
		tagName: 'u',
		className: null,
		attributes: {
			'data-pen': 'data-pen',
			'data-ink': 'data-ink',
		},
		edit: function ( props ) {
			return gesture( props, UNDERLINE, null, __( 'Pen underline', 'quire-ink-pen' ), 'editor-underline', 'u' );
		},
	} );
}( window.wp ) );
