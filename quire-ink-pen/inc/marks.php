<?php
/**
 * What counts as a mark, and how a page is asked about it.
 *
 * One definition, read by the enqueue and by the kses filter, because the two must agree:
 * a page whose marks are stripped must also not load 34 KB of ink for nothing, and a page
 * that loads the ink must have marks that survived.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * The attributes this plugin emits. The markup belongs to the blog engine (docs/decisions/0004);
 * this is the list, not an invention.
 *
 * @return string[]
 */
function quireink_pen_attributes() {
	return array( 'data-pen', 'data-ink', 'data-form' );
}

/**
 * Does this HTML carry a mark this plugin drew?
 *
 * A substring test on `data-pen`, not a parse. The attribute is this plugin's and appears
 * nowhere else; parsing a post body on every front-end request to answer a yes/no question
 * would cost more than the stylesheet it is trying to avoid loading.
 *
 * @param string $html Post content.
 * @return bool
 */
function quireink_pen_has_mark( $html ) {
	return is_string( $html ) && false !== strpos( $html, 'data-pen' );
}

/**
 * Is the page this plugin is drawing on a dark one?
 *
 * There is no core signal for this and no standard one, so the honest default is light.
 * A theme that knows says so by declaring support and putting `dark` on an ancestor itself;
 * a site that does not can answer here.
 *
 * Guessing from `prefers-color-scheme` was considered and rejected (docs/gaps.md): a light
 * theme on a reader's dark-mode machine would then get dark-paper ink on white paper, which
 * is worse than being wrong in one direction consistently.
 *
 * @return bool
 */
function quireink_pen_is_dark() {
	/**
	 * Filters whether the pen should use its dark-paper inks.
	 *
	 * @since 0.1.0
	 * @param bool $is_dark Default false.
	 */
	return (bool) apply_filters( 'quireink_pen_is_dark', false );
}

/**
 * Has the active theme said it handles the pen's page context itself?
 *
 * CONSULTED, NEVER REQUIRED (docs/decisions/0002). Every feature works with this false, which
 * is the common case: the plugin's audience is every theme.
 *
 * @return bool
 */
function quireink_pen_theme_handles_context() {
	return current_theme_supports( 'quireink-pen' );
}
