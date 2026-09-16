/**
 * The three gestures, as block editor formats.
 *
 * TWO format types, not three. `@wordpress/rich-text` resolves a format by tag name and class
 * name, so two types on a bare <mark> would shadow each other — and the ring IS a <mark>, by
 * the upstream contract (docs/decisions/0004). So one type owns <mark> and carries `data-form`
 * as an attribute, and two toolbar buttons apply it with different values. Nothing is added to
 * the markup to make the editor's life easier.
 *
 * Plain script against the `wp.*` globals, deliberately: no build step is a build step nobody
 * has to document to a plugin reviewer, and this is small enough to stay that way.
 */
( function ( wp ) {
	'use strict';

	var el = wp.element.createElement;
	var registerFormatType = wp.richText.registerFormatType;
	var applyFormat = wp.richText.applyFormat;
	var removeFormat = wp.richText.removeFormat;
	var getTextContent = wp.richText.getTextContent;
	var slice = wp.richText.slice;
	var ToolbarButton = wp.blockEditor.RichTextToolbarButton;
	var __ = wp.i18n.__;

	var MARK = 'quire-ink-pen/mark';
	var UNDERLINE = 'quire-ink-pen/underline';

	/** The stroke for the words currently selected. */
	function seedFor( value ) {
		return String( window.quireInkPen.seed( getTextContent( slice( value ) ) ) );
	}

	function isActive( value, name, form ) {
		var active = wp.richText.getActiveFormat( value, name );
		if ( ! active ) {
			return false;
		}
		var attrs = active.attributes || active.unregisteredAttributes || {};
		return form ? 'o' === attrs[ 'data-form' ] : 'o' !== attrs[ 'data-form' ];
	}

	function toggle( value, onChange, name, form ) {
		if ( isActive( value, name, form ) ) {
			onChange( removeFormat( value, name ) );
			return;
		}
		var attributes = { 'data-pen': seedFor( value ) };
		if ( form ) {
			attributes[ 'data-form' ] = form;
		}
		onChange( applyFormat( value, { type: name, attributes: attributes } ) );
	}

	function button( props, name, form, title, icon ) {
		return el( ToolbarButton, {
			icon: icon,
			title: title,
			isActive: isActive( props.value, name, form ),
			onClick: function () {
				toggle( props.value, props.onChange, name, form );
			},
		} );
	}

	registerFormatType( MARK, {
		title: __( 'Highlight', 'quire-ink-pen' ),
		tagName: 'mark',
		className: null,
		attributes: {
			'data-pen': 'data-pen',
			'data-ink': 'data-ink',
			'data-form': 'data-form',
		},
		edit: function ( props ) {
			return el(
				wp.element.Fragment,
				null,
				button( props, MARK, null, __( 'Highlight', 'quire-ink-pen' ), 'edit' ),
				button( props, MARK, 'o', __( 'Ring', 'quire-ink-pen' ), 'marker' )
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
			return button( props, UNDERLINE, null, __( 'Pen underline', 'quire-ink-pen' ), 'editor-underline' );
		},
	} );
}( window.wp ) );
