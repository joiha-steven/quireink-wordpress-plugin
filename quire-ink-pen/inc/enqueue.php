<?php
/**
 * The front end: the ink, and the class the ink hangs off.
 *
 * Both are conditional on the page actually carrying a mark. 34 KB compressed is a modest
 * stylesheet and an indefensible one on a page with nothing to draw, and page weight is how
 * a plugin earns one-star reviews.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * Does the page being rendered carry a mark?
 *
 * Memoised per request. `wp_enqueue_scripts` and `body_class` both ask, and on a singular
 * view the answer is one `strpos` over content already in memory.
 *
 * @return bool
 */
function quireink_pen_page_has_mark() {
	static $has = null;
	if ( null !== $has ) {
		return $has;
	}

	$has = false;

	if ( is_singular() ) {
		$post = get_post();
		$has  = $post && quireink_pen_has_mark( $post->post_content );
	} elseif ( is_home() || is_archive() || is_search() ) {
		// An archive prints excerpts and, on some themes, whole posts. Ask the loop it is
		// about to run rather than guessing from the template.
		global $wp_query;
		if ( $wp_query && ! empty( $wp_query->posts ) ) {
			foreach ( $wp_query->posts as $post ) {
				if ( isset( $post->post_content ) && quireink_pen_has_mark( $post->post_content ) ) {
					$has = true;
					break;
				}
			}
		}
	}

	return $has;
}

/**
 * The ink, on pages that have something to draw.
 */
function quireink_pen_enqueue() {
	if ( ! quireink_pen_page_has_mark() ) {
		return;
	}

	wp_enqueue_style(
		'quireink-pen',
		QUIREINK_PEN_URL . 'assets/css/quireink-pen.css',
		array(),
		quireink_pen_asset_version( 'assets/css/quireink-pen.css' )
	);
}
add_action( 'wp_enqueue_scripts', 'quireink_pen_enqueue' );

/**
 * The `pen` wrapper class, and `dark` when the page is dark.
 *
 * On `<body>` rather than on the content, because the plugin does not own the content markup
 * and wrapping it would mean filtering `the_content` on every request to add one element.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function quireink_pen_body_class( $classes ) {
	if ( ! quireink_pen_page_has_mark() ) {
		return $classes;
	}

	$classes[] = 'pen';

	// A theme that declares support sets its own scheme class; adding a second one here would
	// fight it on every scheme change.
	if ( ! quireink_pen_theme_handles_context() && quireink_pen_is_dark() ) {
		$classes[] = 'dark';
	}

	return $classes;
}
add_filter( 'body_class', 'quireink_pen_body_class' );
