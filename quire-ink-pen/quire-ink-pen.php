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

require_once QUIREINK_PEN_DIR . 'inc/marks.php';
require_once QUIREINK_PEN_DIR . 'inc/enqueue.php';
require_once QUIREINK_PEN_DIR . 'inc/editor.php';
require_once QUIREINK_PEN_DIR . 'inc/kses.php';
