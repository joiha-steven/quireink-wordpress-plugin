<?php
/**
 * The Quire Ink writing screen: a whole page, not a box inside wp-admin.
 *
 * Rendered by hand and `exit`ed rather than returned into the admin chrome, the way every
 * full-screen editor in WordPress does it. The reason is not aesthetics: the admin menu, the
 * admin bar and `#wpbody` all carry their own heights and z-indexes, and an editor that has to
 * subtract them is an editor that is one WordPress release away from being three pixels wrong.
 *
 * Because the admin lifecycle is skipped, the checks it would have done are done HERE, out
 * loud, before anything is printed.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

const QUIREINK_PEN_SCREEN = 'quireink-pen-editor';

/**
 * The URL of the writing screen for a post.
 *
 * @param int $post_id Post ID.
 * @return string
 */
function quireink_pen_screen_url( $post_id ) {
	return add_query_arg(
		array(
			'page' => QUIREINK_PEN_SCREEN,
			'post' => (int) $post_id,
		),
		admin_url( 'admin.php' )
	);
}

/**
 * Register the screen so WordPress owns its URL and its capability, then never show it in a
 * menu: it is reached from a post, not from the sidebar.
 */
function quireink_pen_register_screen() {
	add_submenu_page(
		'',
		__( 'Write in Quire Ink', 'quire-ink-pen' ),
		__( 'Write in Quire Ink', 'quire-ink-pen' ),
		'edit_posts',
		QUIREINK_PEN_SCREEN,
		'__return_null'
	);
}
add_action( 'admin_menu', 'quireink_pen_register_screen' );

/**
 * Take over the page before the admin chrome is printed.
 *
 * `admin_init` runs after authentication and after the current user is known, and before any
 * output. Everything this would otherwise inherit from the admin page lifecycle is checked
 * below instead.
 */
function quireink_pen_maybe_render_screen() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading a screen changes
	// nothing. A nonce here would only break a bookmarked URL; the capability check below is
	// the guard, and the save has its own.
	if ( ! isset( $_GET['page'] ) || QUIREINK_PEN_SCREEN !== $_GET['page'] ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- as above.
	$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
	$post    = $post_id ? get_post( $post_id ) : null;

	if ( ! $post ) {
		wp_die( esc_html__( 'That post does not exist.', 'quire-ink-pen' ), '', array( 'response' => 404 ) );
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		wp_die( esc_html__( 'You are not allowed to edit this post.', 'quire-ink-pen' ), '', array( 'response' => 403 ) );
	}

	quireink_pen_render_screen( $post );
	exit;
}
add_action( 'admin_init', 'quireink_pen_maybe_render_screen' );

/**
 * Print the screen.
 *
 * @param WP_Post $post The post being written.
 */
function quireink_pen_render_screen( $post ) {
	$state = quireink_pen_state( $post->ID );
	$md    = quireink_pen_markdown( $post->ID );

	// A post that has never been written here starts from its own HTML. The Markdown parser
	// passes HTML blocks through, so nothing is lost on the way IN; what it cannot do is turn
	// that HTML back into Markdown, so the screen says so rather than pretending.
	$seed = '' !== $md ? $md : $post->post_content;

	$dir = QUIREINK_PEN_URL . 'assets/';

	// wp_print_styles() fires core's own queue, and `print_emoji_styles` has been deprecated
	// since 6.4 while still being hooked. A deprecation notice printed above the page is this
	// plugin's bug to fix, not WordPress's to be blamed for.
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );

	wp_enqueue_style( 'quireink-pen', $dir . 'css/quireink-pen.css', array(), quireink_pen_asset_version( 'assets/css/quireink-pen.css' ) );
	wp_enqueue_style( 'quireink-pen-editor-ui', $dir . 'css/quireink-editor.css', array(), quireink_pen_asset_version( 'assets/css/quireink-editor.css' ) );
	wp_enqueue_style( 'quireink-pen-screen', $dir . 'css/screen.css', array( 'quireink-pen', 'quireink-pen-editor-ui' ), quireink_pen_asset_version( 'assets/css/screen.css' ) );
	wp_enqueue_script( 'quireink-pen-engine', $dir . 'js/quireink-engine.js', array(), quireink_pen_asset_version( 'assets/js/quireink-engine.js' ), true );
	wp_enqueue_media();
	wp_enqueue_script( 'quireink-pen-app', $dir . 'js/app.js', array( 'quireink-pen-engine', 'wp-i18n' ), quireink_pen_asset_version( 'assets/js/app.js' ), true );

	wp_localize_script(
		'quireink-pen-app',
		'quireInkPenScreen',
		array(
			'postId'   => $post->ID,
			'title'    => $post->post_title,
			'markdown' => '' !== $md ? $md : '',
			// A post never written here arrives as HTML, and the client turns it into the
			// editor's own document rather than handing it to the Markdown parser, which
			// would show the author their own tags as text.
			'html'     => '' !== $md ? '' : $post->post_content,
			'state'    => $state,
			// Named, not counted. "Some formatting may be lost" is a sentence nobody acts on.
			'atRisk'   => '' !== $md ? array() : quireink_pen_blocks_at_risk( $post->post_content ),
			'restUrl'  => rest_url( QUIREINK_PEN_REST_NS . '/post/' . $post->ID ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'backUrl'  => get_edit_post_link( $post->ID, 'raw' ),
			'viewUrl'  => get_permalink( $post->ID ),
		)
	);

	?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html( sprintf( /* translators: %s: post title. */ __( 'Writing: %s', 'quire-ink-pen' ), $post->post_title ) ); ?></title>
	<?php wp_print_styles(); ?>
	<?php wp_print_head_scripts(); ?>
</head>
<body class="quireink-pen-screen pen">
	<div id="quireink-pen-app"></div>
	<?php wp_print_footer_scripts(); ?>
</body>
</html>
	<?php
}
