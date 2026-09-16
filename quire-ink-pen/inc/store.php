<?php
/**
 * Where a Quire Ink post lives, and how it knows somebody edited it elsewhere.
 *
 * TWO copies, on purpose, with one of them authoritative:
 *
 *   `_quireink_markdown`  the SOURCE. What the editor loads and saves. Nothing else reads it.
 *   `post_content`        the RENDER. What every theme, feed, search index, REST consumer and
 *                         other plugin in WordPress reads, so it has to be ordinary HTML.
 *
 * A dual write drifts; that is what dual writes do. So a third value exists to catch it:
 * `_quireink_html_hash` is the hash of the HTML this plugin wrote. If `post_content` no longer
 * hashes to it, somebody edited the post in Gutenberg (or anywhere else) and the Markdown is
 * now stale. The editor REFUSES TO SILENTLY OVERWRITE that, because the alternative is
 * throwing away work the author can see on screen and cannot get back.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

const QUIREINK_PEN_META_MD   = '_quireink_markdown';
const QUIREINK_PEN_META_HASH = '_quireink_html_hash';

/**
 * Register the meta so REST and revisions know about it.
 *
 * `show_in_rest` is false: the source is read and written by this plugin's own authenticated
 * endpoint, and exposing a second write path to the same field would mean two places to get
 * the hash bookkeeping right.
 */
function quireink_pen_register_meta() {
	foreach ( array( QUIREINK_PEN_META_MD, QUIREINK_PEN_META_HASH ) as $key ) {
		register_post_meta(
			'',
			$key,
			array(
				'single'        => true,
				'type'          => 'string',
				'show_in_rest'  => false,
				'auth_callback' => static function ( $allowed, $meta_key, $post_id ) {
					return current_user_can( 'edit_post', $post_id );
				},
			)
		);
	}
}
add_action( 'init', 'quireink_pen_register_meta' );

/**
 * The Markdown source for a post, or '' when it has never been written here.
 *
 * @param int $post_id Post ID.
 * @return string
 */
function quireink_pen_markdown( $post_id ) {
	return (string) get_post_meta( $post_id, QUIREINK_PEN_META_MD, true );
}

/**
 * The hash this plugin uses to recognise its own rendered output.
 *
 * Whitespace-insensitive on purpose: WordPress normalises `post_content` on the way in and out
 * (`wpautop` does not touch what is stored, but `wp_filter_post_kses` and the block parser both
 * can), and a hash that changed because a newline moved would cry wolf on every load, which is
 * the fastest way to teach somebody to ignore a warning.
 *
 * @param string $html Rendered HTML.
 * @return string
 */
function quireink_pen_hash( $html ) {
	return md5( preg_replace( '/\s+/', ' ', trim( (string) $html ) ) );
}

/**
 * Has the post been edited outside this plugin since it last wrote?
 *
 * Three answers, not two, because they need three different things said to the author:
 *
 *   'new'     never written here. Nothing to lose.
 *   'clean'   written here and untouched since.
 *   'foreign' written here, and `post_content` has changed since. The Markdown is stale.
 *
 * @param int $post_id Post ID.
 * @return string
 */
function quireink_pen_state( $post_id ) {
	$md = quireink_pen_markdown( $post_id );
	if ( '' === $md ) {
		return 'new';
	}
	$stored = (string) get_post_meta( $post_id, QUIREINK_PEN_META_HASH, true );
	$post   = get_post( $post_id );
	if ( ! $post ) {
		return 'new';
	}
	return quireink_pen_hash( $post->post_content ) === $stored ? 'clean' : 'foreign';
}

/**
 * Write both copies and the hash, in one place so they cannot be written separately.
 *
 * @param int    $post_id  Post ID.
 * @param string $markdown The source.
 * @param string $html     The render, ALREADY SANITISED by the caller.
 * @return true|WP_Error
 */
function quireink_pen_save( $post_id, $markdown, $html ) {
	$updated = wp_update_post(
		array(
			'ID'           => $post_id,
			'post_content' => $html,
		),
		true
	);
	if ( is_wp_error( $updated ) ) {
		return $updated;
	}

	// Read back rather than hashing what was sent: `wp_update_post` runs `content_save_pre` and
	// the kses filters, so what is STORED is not always what was handed over, and a hash of the
	// input would report 'foreign' on the very next load.
	$stored = get_post_field( 'post_content', $post_id );

	update_post_meta( $post_id, QUIREINK_PEN_META_MD, $markdown );
	update_post_meta( $post_id, QUIREINK_PEN_META_HASH, quireink_pen_hash( $stored ) );

	return true;
}
