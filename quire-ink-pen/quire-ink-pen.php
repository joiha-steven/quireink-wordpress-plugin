<?php
/**
 * Plugin Name:       Quire Ink Pen
 * Plugin URI:        https://quireink.com/
 * Description:       Highlight, underline and ring words in the block editor, drawn as hand strokes rather than rectangles. Works with any theme.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Quire Ink
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       quire-ink-pen
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

define( 'QUIREINK_PEN_VERSION', '0.1.0' );
define( 'QUIREINK_PEN_FILE', __FILE__ );
define( 'QUIREINK_PEN_DIR', plugin_dir_path( __FILE__ ) );
define( 'QUIREINK_PEN_URL', plugin_dir_url( __FILE__ ) );

/**
 * The cache-busting version for an asset.
 *
 * The plugin version in production: one number, changed deliberately at release, and a
 * version that moved on its own would invalidate every visitor's cache on every deploy.
 *
 * The file's mtime on a local or development site, because otherwise an edit to a stylesheet
 * or a script is invisible until somebody guesses that the browser is holding the old copy.
 * That cost an hour here: a fixed sheet was measured as still broken, twice, because
 * `?ver=0.1.0` had not changed.
 *
 * @param string $rel Path relative to the plugin directory.
 * @return string
 */
function quireink_pen_asset_version( $rel ) {
	if ( in_array( wp_get_environment_type(), array( 'local', 'development' ), true ) ) {
		$path = QUIREINK_PEN_DIR . $rel;
		if ( file_exists( $path ) ) {
			return (string) filemtime( $path );
		}
	}
	return QUIREINK_PEN_VERSION;
}

require_once QUIREINK_PEN_DIR . 'inc/marks.php';
require_once QUIREINK_PEN_DIR . 'inc/survey.php';
require_once QUIREINK_PEN_DIR . 'inc/store.php';
require_once QUIREINK_PEN_DIR . 'inc/rest.php';
require_once QUIREINK_PEN_DIR . 'inc/screen.php';
require_once QUIREINK_PEN_DIR . 'inc/links.php';
require_once QUIREINK_PEN_DIR . 'inc/enqueue.php';
require_once QUIREINK_PEN_DIR . 'inc/editor.php';
require_once QUIREINK_PEN_DIR . 'inc/kses.php';
