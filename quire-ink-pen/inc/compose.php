<?php
/**
 * Writing in Quire Ink, on WordPress's own editing screen.
 *
 * ADR 0009. The first cut of this was a whole page of its own with its own Save button and its
 * own REST route, and it was wrong in a way that only shows up when somebody tries to USE it:
 * a post has a title, a status, a schedule, categories, a featured image and a history, and an
 * editor that owns none of those is an editor you have to leave to finish anything. Rebuilding
 * that furniture would have meant rebuilding WordPress badly.
 *
 * So the screen is WordPress's. `post.php` still draws the form, still prints Publish, still
 * writes the revision, still holds the lock. What this replaces is ONE box inside it: the
 * writing surface. `remove_post_type_support( ..., 'editor' )` takes the TinyMCE box away and
 * `edit_form_after_title` puts the paper in its place, with a `<textarea name="content">`
 * underneath that the editor keeps filled. WordPress reads that field exactly as it always
 * has, which is why everything around it goes on working with no cooperation from here.
 *
 * WHAT THAT BUYS, none of which is code in this plugin: Publish, Save draft, Schedule,
 * Preview, revisions, the post lock, autosave, the trash, categories, tags, the excerpt, the
 * featured image, custom fields, and every other plugin's meta box.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/** The query argument that turns the surface on (`1`) or off (`0`) for one page load. */
const QUIREINK_PEN_ARG = 'quireink';

/** The hidden field carrying the Markdown source up with the form, and its nonce. */
const QUIREINK_PEN_FIELD = 'quireink_pen_markdown';
const QUIREINK_PEN_NONCE = 'quireink_pen_compose';

/**
 * Is this post being written in Quire Ink?
 *
 * Three answers in priority order, and the order is the whole behaviour:
 *
 *   1. `?quireink=1` or `?quireink=0` — the author just asked, for this page load.
 *   2. The post already has a Markdown source — it was written here, so it opens here.
 *   3. Otherwise, no. A WordPress post opens in WordPress's editor.
 *
 * Rule 2 is what makes the choice stick without a setting to manage, and rule 1 is the way
 * back out of it. Neither is remembered anywhere but in the post's own content.
 *
 * @param WP_Post|null $post The post being edited.
 * @return bool
 */
function quireink_pen_composing( $post ) {
	if ( ! $post instanceof WP_Post ) {
		return false;
	}
	if ( ! in_array( $post->post_type, quireink_pen_post_types(), true ) ) {
		return false;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Choosing which editor to
	// draw changes nothing. A nonce here would break a bookmarked or shared edit link; the
	// capability checks on the screen itself and on the save are the guards.
	if ( isset( $_GET[ QUIREINK_PEN_ARG ] ) ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- as above.
		return '1' === sanitize_key( wp_unslash( $_GET[ QUIREINK_PEN_ARG ] ) );
	}

	return '' !== quireink_pen_markdown( $post->ID );
}

/**
 * The edit URL for a post, with the surface asked for or waved off.
 *
 * @param int  $post_id Post ID.
 * @param bool $on      True for Quire Ink, false for the block editor.
 * @return string
 */
function quireink_pen_compose_url( $post_id, $on = true ) {
	$edit = get_edit_post_link( $post_id, 'raw' );
	if ( ! $edit ) {
		return '';
	}
	return add_query_arg( QUIREINK_PEN_ARG, $on ? '1' : '0', $edit );
}

/**
 * Which editor WordPress should draw.
 *
 * Returning false sends `post.php` down the classic path, which is the one with a
 * `edit_form_after_title` to hang a writing surface on and a plain `content` field to save
 * through. The block editor has neither.
 *
 * @param bool    $use  What WordPress decided.
 * @param WP_Post $post The post.
 * @return bool
 */
function quireink_pen_choose_editor( $use, $post ) {
	if ( ! is_admin() ) {
		return $use;
	}
	return quireink_pen_composing( $post ) ? false : $use;
}
add_filter( 'use_block_editor_for_post', 'quireink_pen_choose_editor', 10, 2 );

/**
 * The post this request is drawing an edit form for, or null.
 *
 * ⚠️ `$_GET['post']` AND NOTHING ELSE. `load-post.php` also fires on the SAVE, where the id
 * arrives as `$_POST['post_ID']` and the editor box must be left exactly as WordPress found
 * it: `remove_post_type_support` on a save request would be this plugin quietly reaching into
 * a request it has no business in.
 *
 * @return WP_Post|null
 */
function quireink_pen_editing_post() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading which post the
	// form is for. `post.php` has already done its own capability check by this point.
	$id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
	return $id ? get_post( $id ) : null;
}

/**
 * Take the editor box out and put the paper in, on this request only.
 *
 * `load-post.php` is late enough that the post exists and early enough that nothing has been
 * printed, which is the window `remove_post_type_support` has to land in.
 */
function quireink_pen_take_the_editor() {
	$post = quireink_pen_editing_post();
	if ( ! $post || ! quireink_pen_composing( $post ) ) {
		return;
	}
	quireink_pen_compose_hooks( $post->post_type );
}
add_action( 'load-post.php', 'quireink_pen_take_the_editor' );

/**
 * The same, for a post that does not exist yet.
 *
 * A new post has no Markdown, so only an explicit `?quireink=1` reaches here — which is what
 * the "Write in Quire Ink" link on the posts list adds.
 */
function quireink_pen_take_the_editor_new() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Choosing an editor.
	if ( ! isset( $_GET[ QUIREINK_PEN_ARG ] ) || '1' !== sanitize_key( wp_unslash( $_GET[ QUIREINK_PEN_ARG ] ) ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- as above.
	$type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';
	if ( ! in_array( $type, quireink_pen_post_types(), true ) ) {
		return;
	}
	quireink_pen_compose_hooks( $type );
}
add_action( 'load-post-new.php', 'quireink_pen_take_the_editor_new' );

/**
 * Everything the two entry points share.
 *
 * @param string $post_type The post type being edited.
 */
function quireink_pen_compose_hooks( $post_type ) {
	remove_post_type_support( $post_type, 'editor' );

	add_action( 'edit_form_after_title', 'quireink_pen_paper' );
	add_action( 'admin_enqueue_scripts', 'quireink_pen_compose_assets' );
	add_action( 'post_submitbox_misc_actions', 'quireink_pen_way_out' );
	add_filter(
		'admin_body_class',
		static function ( $classes ) {
			// The paper's own tokens — the reading face, the type scale, the page colours —
			// are declared against this class in `assets/css/quireink-editor.css`. On the body
			// and not on a wrapper printed below, because the TITLE is above that wrapper and
			// the title is part of the writing, not part of the form.
			return $classes . ' quireink-pen-composing';
		}
	);
}

/**
 * The paper.
 *
 * Printed by the server rather than built by the script, so that a screen whose JavaScript
 * never arrives is a plain textarea holding the post's own HTML — editable, savable, honest —
 * rather than a blank space. `hide-if-js` is WordPress's own idiom for that and core hides it
 * the moment `<body>` gets its `js` class.
 *
 * ⚠️ `#quireink-pen-paper` HOLDS THE ENGINE'S FURNITURE AND NOTHING ELSE. Everything WordPress
 * owns — the notice, the fallback textarea, the hint — is a sibling of it, not a child. The
 * writing surface's stylesheet carries Tailwind's preflight (`*{margin:0;padding:0;border:0}`)
 * and is scoped to that id, so anything inside it loses its WordPress styling: a `.notice`
 * in there comes out with no border and no padding. The line is not cosmetic, it is the line
 * between the two products on this screen.
 *
 * @param WP_Post $post The post.
 */
function quireink_pen_paper( $post ) {
	$state = quireink_pen_state( $post->ID );
	$md    = 'clean' === $state ? quireink_pen_markdown( $post->ID ) : '';

	?>
	<div id="quireink-pen-compose" class="quireink-pen-compose">
		<?php quireink_pen_warning( $post, $state ); ?>
		<div id="quireink-pen-paper" class="quireink-pen-paper pen">
			<div class="quireink-pen-tools" data-quireink-tools></div>
			<div class="quireink-pen-sheet" data-quireink-sheet></div>
		</div>
		<textarea id="content" name="content" class="hide-if-js quireink-pen-fallback" rows="16"><?php
			echo esc_textarea( $post->post_content );
		?></textarea>
		<input type="hidden" name="<?php echo esc_attr( QUIREINK_PEN_FIELD ); ?>" value="<?php echo esc_attr( $md ); ?>">
		<?php
		// No referer field: `edit-form-advanced.php` has already printed one, and a form with
		// two `_wp_http_referer` inputs sends whichever came last.
		wp_nonce_field( QUIREINK_PEN_NONCE, 'quireink_pen_nonce', false );
		?>
		<p class="quireink-pen-hint hide-if-no-js">
			<?php esc_html_e( 'Type "/" on an empty line for pictures, tables and rules. Select words for the formatting bar.', 'quire-ink-pen' ); ?>
		</p>
	</div>
	<?php
}

/**
 * What this post stands to lose, said before it can lose it.
 *
 * Named blocks, not a count and not "some formatting may be lost": a sentence nobody can act
 * on is a sentence nobody reads. See `inc/survey.php` for how the names are found.
 *
 * A `<details>`, because the notice is worth reading once and then it is in the way of the
 * writing for the rest of the session. Open when something is at RISK, folded to one line when
 * it is only telling you where the words came from. No script: `<details>` folds itself.
 *
 * @param WP_Post $post  The post.
 * @param string  $state 'new', 'clean' or 'foreign'.
 */
function quireink_pen_warning( $post, $state ) {
	if ( 'clean' === $state ) {
		return;
	}

	$at_risk = quireink_pen_blocks_at_risk( $post->post_content );

	if ( 'foreign' === $state ) {
		$head = __( 'This post has been edited in WordPress since Quire Ink last saved it.', 'quire-ink-pen' );
		$body = __( 'What is below is the WordPress version, which is the newer one; the older Markdown source has been set aside.', 'quire-ink-pen' );
	} elseif ( $at_risk ) {
		$head = __( 'Saving here will replace this post\'s layout.', 'quire-ink-pen' );
		$body = sprintf(
			/* translators: %s: comma-separated list of block names. */
			__( 'This post was built in WordPress and uses: %s. Markdown holds words, not layout, so those blocks are here as plain text and saving would keep them that way.', 'quire-ink-pen' ),
			implode( ', ', $at_risk )
		);
	} elseif ( '' !== trim( $post->post_content ) ) {
		$head = __( 'This post was not written in Quire Ink.', 'quire-ink-pen' );
		$body = __( 'Its HTML has been brought in as it stands; from the first save on, the Markdown is the source.', 'quire-ink-pen' );
	} else {
		return;
	}

	$classes = 'quireink-pen-warning notice notice-warning inline' . ( $at_risk ? ' quireink-pen-warning-loud' : '' );
	// A boolean attribute, so it is the whole word or nothing. Escaped anyway: an attribute
	// printed without one is an attribute nobody checked.
	$open = $at_risk ? 'open' : '';

	?>
	<details class="<?php echo esc_attr( $classes ); ?>" <?php echo esc_attr( $open ); ?>>
		<summary><?php echo esc_html( $head ); ?></summary>
		<p><?php echo esc_html( $body ); ?></p>
		<p><?php esc_html_e( 'Reading and copying from here is safe. Nothing changes until you save.', 'quire-ink-pen' ); ?></p>
	</details>
	<?php
}

/**
 * The way back to the block editor, in the box the author is already looking at when they
 * decide they want it.
 *
 * Nobody should be locked into an editor by having used it once.
 *
 * @param WP_Post $post The post.
 */
function quireink_pen_way_out( $post ) {
	$url = quireink_pen_compose_url( $post->ID, false );
	if ( ! $url ) {
		return;
	}
	?>
	<div class="misc-pub-section quireink-pen-switch">
		<span class="dashicons dashicons-edit" aria-hidden="true"></span>
		<?php esc_html_e( 'Writing in Quire Ink.', 'quire-ink-pen' ); ?>
		<a href="<?php echo esc_url( $url ); ?>"><?php esc_html_e( 'Use the block editor', 'quire-ink-pen' ); ?></a>
	</div>
	<?php
}

/**
 * The sheets and the scripts, on this screen only.
 */
function quireink_pen_compose_assets() {
	$dir  = QUIREINK_PEN_URL . 'assets/';
	$post = get_post();

	wp_enqueue_style( 'quireink-pen', $dir . 'css/quireink-pen.css', array(), quireink_pen_asset_version( 'assets/css/quireink-pen.css' ) );
	wp_enqueue_style( 'quireink-pen-editor-ui', $dir . 'css/quireink-editor.css', array(), quireink_pen_asset_version( 'assets/css/quireink-editor.css' ) );
	wp_enqueue_style( 'quireink-pen-screen', $dir . 'css/screen.css', array( 'quireink-pen', 'quireink-pen-editor-ui' ), quireink_pen_asset_version( 'assets/css/screen.css' ) );

	wp_enqueue_script( 'quireink-pen-engine', $dir . 'js/quireink-engine.js', array(), quireink_pen_asset_version( 'assets/js/quireink-engine.js' ), true );
	wp_enqueue_media();
	wp_enqueue_script(
		'quireink-pen-app',
		$dir . 'js/app.js',
		array( 'quireink-pen-engine', 'jquery', 'wp-api-fetch', 'wp-i18n' ),
		quireink_pen_asset_version( 'assets/js/app.js' ),
		true
	);

	$state = $post ? quireink_pen_state( $post->ID ) : 'new';

	wp_localize_script(
		'quireink-pen-app',
		'quireInkPenCompose',
		array(
			// A post written here round-trips from its Markdown. One that was not — or one
			// WordPress has edited since — opens from `post_content` instead, because that is
			// the newer text and the one the author can see. Nothing is silently overwritten:
			// the Markdown only becomes the source again at the next save.
			'markdown' => 'clean' === $state ? quireink_pen_markdown( $post->ID ) : '',
			'html'     => $post && 'clean' !== $state ? $post->post_content : '',
			'state'    => $state,
			'atRisk'   => $post && 'clean' !== $state ? quireink_pen_blocks_at_risk( $post->post_content ) : array(),
		)
	);
}

/**
 * Keep the Markdown the save came from.
 *
 * WordPress has already written `post_content` by the time this runs: the `content` field the
 * editor filled went through `_wp_translate_postdata`, `wp_filter_post_kses` and
 * `wp_update_post` like any other post's, and a revision has been written. All that is left is
 * to remember which Markdown produced it.
 *
 * ⚠️ `wp_unslash` AND NO SANITISER. WordPress slashes `$_POST`, so a Markdown source with a
 * quote in it comes back wearing a backslash that would be stored and then shown. And no
 * `sanitize_text_field`: it collapses newlines, and a Markdown document is mostly newlines.
 * The source is data — it is rendered to HTML in the browser, and the HTML is what WordPress
 * filters. The one place it becomes a document is the editor's own schema, which builds nodes
 * rather than setting innerHTML, so there is no markup in it to execute.
 *
 * @param int     $post_id Post ID.
 * @param WP_Post $post    The post.
 */
function quireink_pen_capture( $post_id, $post ) {
	if ( ! isset( $_POST[ QUIREINK_PEN_FIELD ], $_POST['quireink_pen_nonce'] ) ) {
		return;
	}
	if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['quireink_pen_nonce'] ) ), QUIREINK_PEN_NONCE ) ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	// A revision and an autosave are copies of the post, not the post. Writing the source onto
	// them would attach it to a row the editor will never open.
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	if ( ! in_array( $post->post_type, quireink_pen_post_types(), true ) ) {
		return;
	}

	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Markdown, see
	// the note above: sanitising it here would corrupt the source, and the render it produces is
	// filtered by WordPress on the same request.
	quireink_pen_remember( $post_id, (string) wp_unslash( $_POST[ QUIREINK_PEN_FIELD ] ) );
}
add_action( 'save_post', 'quireink_pen_capture', 10, 2 );
