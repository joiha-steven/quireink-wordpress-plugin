<?php
/**
 * How an author reaches the writing screen.
 *
 * Two doors, both from a post the author is already looking at, and neither from the admin
 * sidebar: this is a way of editing one post, not a section of the site. Both lead to the same
 * `post.php` the Edit link leads to, with `?quireink=1` on the end — see `inc/compose.php`.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * Which post types get the door.
 *
 * Posts and pages by default. A site with a custom type that holds writing can say so, and one
 * that does not want it on pages can take it away.
 *
 * @return string[]
 */
function quireink_pen_post_types() {
	/**
	 * Filters the post types offered a Quire Ink writing screen.
	 *
	 * @since 0.1.0
	 * @param string[] $types Post type names.
	 */
	return (array) apply_filters( 'quireink_pen_post_types', array( 'post', 'page' ) );
}

/**
 * "Write in Quire Ink" beside Edit, Quick Edit and Trash on the posts list.
 *
 * @param string[] $actions Row actions.
 * @param WP_Post  $post    The post.
 * @return string[]
 */
function quireink_pen_row_action( $actions, $post ) {
	if ( ! in_array( $post->post_type, quireink_pen_post_types(), true ) ) {
		return $actions;
	}
	if ( ! current_user_can( 'edit_post', $post->ID ) ) {
		return $actions;
	}

	$actions['quireink_pen'] = sprintf(
		'<a href="%s">%s</a>',
		esc_url( quireink_pen_compose_url( $post->ID ) ),
		esc_html__( 'Write in Quire Ink', 'quire-ink-pen' )
	);

	return $actions;
}
add_filter( 'post_row_actions', 'quireink_pen_row_action', 10, 2 );
add_filter( 'page_row_actions', 'quireink_pen_row_action', 10, 2 );

/**
 * The same door from inside the block editor, in the post panel.
 *
 * A separate tiny script rather than a line in `formats.js`, because the formats are the
 * plugin working and this is the plugin advertising a different screen: one of them should be
 * removable without touching the other.
 */
function quireink_pen_editor_link_assets() {
	$post = get_post();
	if ( ! $post || ! in_array( $post->post_type, quireink_pen_post_types(), true ) ) {
		return;
	}

	wp_enqueue_script(
		'quireink-pen-editor-link',
		QUIREINK_PEN_URL . 'assets/js/editor-link.js',
		array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-components', 'wp-i18n' ),
		quireink_pen_asset_version( 'assets/js/editor-link.js' ),
		true
	);

	wp_localize_script(
		'quireink-pen-editor-link',
		'quireInkPenLink',
		array( 'url' => quireink_pen_compose_url( $post->ID ) )
	);
}
add_action( 'enqueue_block_editor_assets', 'quireink_pen_editor_link_assets' );
