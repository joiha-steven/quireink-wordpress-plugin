<?php
/**
 * Keep the stroke through `wp_kses_post`.
 *
 * WordPress filters content saved by a Contributor or an Author, and `data-*` attributes on
 * <mark> and <u> are not in the default allowed list. The mark survives; the variant does not
 * — so every mark on that post falls back to stroke 0, the page loses the hand-made look that
 * is the whole point, and nothing anywhere reports it.
 *
 * Exactly three attributes, on exactly two elements. Widening kses is a security decision and
 * this is the narrowest form of it: `data-pen`, `data-ink` and `data-form` are inert values
 * read only by a stylesheet, and each is sanitised below rather than trusted.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * Allow the pen's attributes on <mark> and <u>.
 *
 * @param array  $tags    Allowed tags.
 * @param string $context Context the list is for.
 * @return array
 */
function quireink_pen_kses_allowed( $tags, $context ) {
	if ( 'post' !== $context ) {
		return $tags;
	}

	foreach ( array( 'mark', 'u' ) as $tag ) {
		if ( ! isset( $tags[ $tag ] ) || ! is_array( $tags[ $tag ] ) ) {
			$tags[ $tag ] = array();
		}
		foreach ( quireink_pen_attributes() as $attr ) {
			$tags[ $tag ][ $attr ] = true;
		}
	}

	return $tags;
}
add_filter( 'wp_kses_allowed_html', 'quireink_pen_kses_allowed', 10, 2 );

/**
 * Hold the attributes to their documented ranges.
 *
 * kses allowing an attribute means allowing any value in it. These three have small, closed
 * domains, so they are checked rather than merely permitted: `data-pen` is 0-79, `data-ink` is
 * one of five names, `data-form` is the single letter `o`.
 *
 * @param string $content Post content.
 * @return string
 */
function quireink_pen_sanitise( $content ) {
	if ( ! quireink_pen_has_mark( $content ) ) {
		return $content;
	}

	$content = preg_replace_callback(
		'/\sdata-pen="([^"]*)"/',
		static function ( $m ) {
			$n = is_numeric( $m[1] ) ? (int) $m[1] : 0;
			return ' data-pen="' . ( $n >= 0 && $n <= 79 ? $n : 0 ) . '"';
		},
		$content
	);

	$content = preg_replace( '/\sdata-ink="(?!yellow|green|pink|blue|orange)[^"]*"/', '', $content );
	$content = preg_replace( '/\sdata-form="(?!o")[^"]*"/', '', $content );

	return $content;
}
add_filter( 'content_save_pre', 'quireink_pen_sanitise', 20 );
