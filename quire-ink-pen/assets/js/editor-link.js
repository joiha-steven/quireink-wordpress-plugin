/**
 * A link to the Quire Ink writing screen, in the block editor's post panel.
 *
 * `PluginPostStatusInfo` and not a toolbar button, because this is not a formatting control:
 * it is a different way to edit the whole post, and it belongs beside Visibility and Publish
 * where the other whole-post decisions are.
 */
( function ( wp ) {
	'use strict';

	var cfg = window.quireInkPenLink;
	if ( ! cfg || ! wp || ! wp.plugins || ! wp.editPost ) {
		return;
	}

	var el = wp.element.createElement;
	var __ = wp.i18n.__;

	wp.plugins.registerPlugin( 'quire-ink-pen-link', {
		render: function () {
			return el(
				wp.editPost.PluginPostStatusInfo,
				{ className: 'quireink-pen-link' },
				el( 'a', { href: cfg.url }, __( 'Write in Quire Ink', 'quire-ink-pen' ) )
			);
		},
	} );
}( window.wp ) );
