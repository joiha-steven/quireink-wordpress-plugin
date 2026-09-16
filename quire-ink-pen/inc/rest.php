<?php
/**
 * The one way content gets from the Quire Ink editor into the database.
 *
 * The HTML arrives from the CLIENT, because the renderer is the blog engine's and it runs in
 * the browser (docs/decisions/0003). That is a normal shape for a block editor - Gutenberg
 * posts HTML too - and it means the HTML is UNTRUSTED INPUT no matter who sent it. It goes
 * through `wp_kses_post` here, which this plugin has already widened by exactly three
 * attributes on two elements (`inc/kses.php`) and nothing else.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

const QUIREINK_PEN_REST_NS = 'quire-ink-pen/v1';

/**
 * Register the save route.
 */
function quireink_pen_rest_routes() {
	register_rest_route(
		QUIREINK_PEN_REST_NS,
		'/post/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => 'quireink_pen_rest_save',
			'permission_callback' => 'quireink_pen_rest_may_edit',
			'args'                => array(
				'id'       => array(
					'required'          => true,
					'validate_callback' => static function ( $v ) {
						return is_numeric( $v ) && (int) $v > 0;
					},
				),
				'markdown' => array(
					'required' => true,
					'type'     => 'string',
				),
				'html'     => array(
					'required' => true,
					'type'     => 'string',
				),
				'force'    => array(
					'type'    => 'boolean',
					'default' => false,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'quireink_pen_rest_routes' );

/**
 * May the current user edit this post?
 *
 * @param WP_REST_Request $request Request.
 * @return bool|WP_Error
 */
function quireink_pen_rest_may_edit( $request ) {
	$id = (int) $request['id'];
	if ( ! get_post( $id ) ) {
		return new WP_Error( 'quireink_pen_no_post', __( 'No such post.', 'quire-ink-pen' ), array( 'status' => 404 ) );
	}
	if ( ! current_user_can( 'edit_post', $id ) ) {
		return new WP_Error( 'quireink_pen_forbidden', __( 'You cannot edit this post.', 'quire-ink-pen' ), array( 'status' => 403 ) );
	}
	return true;
}

/**
 * Save the Markdown and its render.
 *
 * ⚠️ REFUSES when the post has been edited elsewhere since this plugin last wrote it, unless
 * the caller says `force`. The alternative is overwriting work the author can see on screen
 * and cannot get back, which is not a thing to decide on somebody's behalf.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function quireink_pen_rest_save( $request ) {
	$id    = (int) $request['id'];
	$state = quireink_pen_state( $id );

	if ( 'foreign' === $state && ! $request['force'] ) {
		return new WP_Error(
			'quireink_pen_foreign_edit',
			__( 'This post has been edited outside Quire Ink since it was last saved here. Saving now would discard that.', 'quire-ink-pen' ),
			array( 'status' => 409 )
		);
	}

	$markdown = (string) $request['markdown'];
	// Not `sanitize_textarea_field`: that strips tags, and Markdown legitimately contains
	// angle brackets. The source is never printed as HTML - it is fed to the parser - so the
	// thing to guard is the RENDER, below.
	$markdown = wp_check_invalid_utf8( $markdown );

	$html = wp_kses_post( (string) $request['html'] );

	$saved = quireink_pen_save( $id, $markdown, $html );
	if ( is_wp_error( $saved ) ) {
		return $saved;
	}

	return new WP_REST_Response(
		array(
			'saved'    => true,
			'state'    => quireink_pen_state( $id ),
			'modified' => get_post_field( 'post_modified_gmt', $id ),
		),
		200
	);
}
