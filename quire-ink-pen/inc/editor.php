<?php
/**
 * The editor: the toolbar buttons, and the ink to see them by.
 *
 * Unconditional here, unlike the front end. The editor is where a mark is about to exist, so
 * "does this post have one yet" is the wrong question, and an author who applies a highlight
 * and sees a grey browser default has been told the plugin is broken.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the editor assets.
 */
function quireink_pen_editor_assets() {
	$dir = QUIREINK_PEN_URL . 'assets/';
	$v   = QUIREINK_PEN_VERSION;

	wp_enqueue_script( 'quireink-pen-seed', $dir . 'js/seed.js', array(), quireink_pen_asset_version( 'assets/js/seed.js' ), true );

	wp_enqueue_script(
		'quireink-pen-formats',
		$dir . 'js/formats.js',
		// Declared, not assumed. A missing `wp-rich-text` does not error, it just never
		// registers the format, and the buttons are silently absent.
		array( 'quireink-pen-seed', 'wp-rich-text', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n' ),
		quireink_pen_asset_version( 'assets/js/formats.js' ),
		true
	);

	wp_set_script_translations( 'quireink-pen-formats', 'quire-ink-pen', QUIREINK_PEN_DIR . 'languages' );

}
add_action( 'enqueue_block_editor_assets', 'quireink_pen_editor_assets' );

/**
 * The ink, inside the editor's canvas.
 *
 * ⚠️ NOT on `enqueue_block_editor_assets`. Since WordPress 6.3 the canvas is an IFRAME, and a
 * stylesheet enqueued on that hook lands in the admin page OUTSIDE it, where it styles nothing.
 * Measured in the editor before this was fixed: zero pen stylesheets inside the iframe, and a
 * mark computing to `rgb(255,255,0)` with `background-image: none`, which is the browser's own
 * default <mark>. Every guard was green.
 *
 * `enqueue_block_assets` is the hook that reaches the canvas. It also fires on the front end,
 * where `inc/enqueue.php` already decides conditionally, so this half only runs in admin.
 *
 * The sheet needs no body class here: it is generated carrying `.editor-styles-wrapper`
 * alongside `.pen`, because WordPress 6.8 gives a plugin no way to put a class on that iframe's
 * body. `block_editor_iframed_body_class` does not exist; a filter name written from memory is
 * a filter that silently does nothing.
 */
function quireink_pen_canvas_style() {
	if ( ! is_admin() ) {
		return;
	}
	wp_enqueue_style(
		'quireink-pen',
		QUIREINK_PEN_URL . 'assets/css/quireink-pen.css',
		array(),
		quireink_pen_asset_version( 'assets/css/quireink-pen.css' )
	);
}
add_action( 'enqueue_block_assets', 'quireink_pen_canvas_style' );
