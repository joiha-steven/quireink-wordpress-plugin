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

	wp_enqueue_script( 'quireink-pen-seed', $dir . 'js/seed.js', array(), $v, true );

	wp_enqueue_script(
		'quireink-pen-formats',
		$dir . 'js/formats.js',
		// Declared, not assumed. A missing `wp-rich-text` does not error, it just never
		// registers the format, and the buttons are silently absent.
		array( 'quireink-pen-seed', 'wp-rich-text', 'wp-block-editor', 'wp-element', 'wp-i18n' ),
		$v,
		true
	);

	wp_set_script_translations( 'quireink-pen-formats', 'quire-ink-pen', QUIREINK_PEN_DIR . 'languages' );

	wp_enqueue_style( 'quireink-pen-editor', $dir . 'css/quireink-pen.css', array(), $v );
}
add_action( 'enqueue_block_editor_assets', 'quireink_pen_editor_assets' );

/**
 * The editor canvas needs the `pen` class too, or the sheet matches nothing while writing.
 *
 * The canvas is an iframe in WordPress 6.3 and later and does not inherit the admin body's
 * classes, so this is the supported way in rather than a workaround.
 *
 * @param string[] $classes Body classes for the editor canvas.
 * @return string[]
 */
function quireink_pen_editor_body_class( $classes ) {
	$classes[] = 'pen';
	if ( ! quireink_pen_theme_handles_context() && quireink_pen_is_dark() ) {
		$classes[] = 'dark';
	}
	return $classes;
}
add_filter( 'block_editor_iframed_body_class', 'quireink_pen_editor_body_class' );
