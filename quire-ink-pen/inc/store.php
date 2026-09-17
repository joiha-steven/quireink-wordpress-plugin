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
 * now stale — so the screen opens from `post_content` instead and says so. The stale source is
 * left in place rather than deleted; it is the only record of what was written here, and it
 * costs nothing to keep.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

const QUIREINK_PEN_META_MD   = '_quireink_markdown';
const QUIREINK_PEN_META_HASH = '_quireink_html_hash';

/**
 * Register the meta so REST and revisions know about it.
 *
 * `show_in_rest` is false: the source is written in one place, from the post form's own save,
 * and a second write path to the same field would be a second place to get the hash
 * bookkeeping right.
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
 * Remember the Markdown a save came from, and what WordPress made of it.
 *
 * Called from `save_post`, AFTER WordPress has written `post_content` — which is why there is
 * no `wp_update_post` here and no read-back to argue about. Whatever is in the post now is
 * what every reader will see, so that is what gets hashed.
 *
 * ⚠️ `wp_slash` ON THE WAY IN, AND IT IS NOT DECORATION. `update_metadata()` calls
 * `wp_unslash()` on the value itself (`wp-includes/meta.php`), so it wants SLASHED data — and
 * this function is handed the true string, unslashed at the request boundary where it should
 * be. Without the re-slash the value is unslashed twice and one level of backslashes is eaten.
 * Markdown is a language made of backslashes: `\#` is a literal hash, `\*` a literal asterisk,
 * and a trailing `\` is a line break. Measured: a paragraph serialised as `\## a heading` was
 * stored as `## a heading`, and the next time the post was opened that paragraph had become a
 * heading. Nothing said so — the post looked fine until it was reopened.
 *
 * @param int    $post_id  Post ID.
 * @param string $markdown The source, exactly as the editor serialised it, already unslashed.
 */
function quireink_pen_remember( $post_id, $markdown ) {
	if ( '' === trim( $markdown ) ) {
		// An empty save is a post emptied on purpose or a script that never mounted. Either
		// way, claiming an empty Markdown source for a post that may still have HTML in it
		// would make the next load open a blank sheet over the author's words.
		return;
	}
	update_post_meta( $post_id, QUIREINK_PEN_META_MD, wp_slash( $markdown ) );
	update_post_meta(
		$post_id,
		QUIREINK_PEN_META_HASH,
		quireink_pen_hash( get_post_field( 'post_content', $post_id ) )
	);
}
