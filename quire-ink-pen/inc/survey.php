<?php
/**
 * What a post will lose if it is rewritten in Quire Ink, named before anybody can lose it.
 *
 * Markdown holds prose. It does not hold layout, and a WordPress post can contain a great deal
 * of layout: columns, buttons, covers, embeds, raw HTML. Opening such a post here reads it in
 * as text and SAVING replaces `post_content` with the render of that text, which means the
 * columns are gone and the author finds out afterwards.
 *
 * Measured on a post carrying one of each, 2026-09-17: prose, lists, quotes, images, tables,
 * code and rules came across intact; two columns became two paragraphs, a button became a
 * link, an embed became a bare URL, and a custom HTML block became its own text content.
 *
 * So this names them first. Not "some formatting may be lost" - the blocks, by their own
 * names, in the notice, before the editor is usable.
 *
 * @package QuireInkPen
 */

defined( 'ABSPATH' ) || exit;

/**
 * Block types whose content survives the trip into Markdown and back.
 *
 * Anything absent from this list is not necessarily broken; it is not KNOWN to survive, and
 * for a warning that is the same thing. A new core block should be added here only after
 * somebody has opened a post containing one and looked.
 *
 * @return string[]
 */
function quireink_pen_safe_blocks() {
	return array(
		'core/paragraph',
		'core/heading',
		'core/list',
		'core/list-item',
		'core/quote',
		'core/pullquote',
		'core/image',
		'core/table',
		'core/code',
		'core/preformatted',
		'core/separator',
		'core/freeform',
		'core/missing',
		'core/nextpage',
	);
}

/**
 * The blocks in this post that are not known to survive, by their display names.
 *
 * Reads the block delimiters rather than parsing with `parse_blocks()`: the delimiters are the
 * record of what the author actually inserted, and a nested `core/column` inside `core/columns`
 * matters here precisely because it is the nesting that is lost.
 *
 * @param string $content Post content.
 * @return string[] Human names, unique, in the order they appear.
 */
function quireink_pen_blocks_at_risk( $content ) {
	if ( ! is_string( $content ) || '' === $content ) {
		return array();
	}

	$safe  = quireink_pen_safe_blocks();
	$found = array();

	if ( ! preg_match_all( '/<!--\s+wp:([a-z][a-z0-9-]*\/[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)\s/i', $content, $m ) ) {
		return array();
	}

	foreach ( $m[1] as $name ) {
		$full = false === strpos( $name, '/' ) ? 'core/' . $name : $name;
		if ( in_array( $full, $safe, true ) ) {
			continue;
		}
		$type  = WP_Block_Type_Registry::get_instance()->get_registered( $full );
		$label = $type && ! empty( $type->title ) ? $type->title : $full;
		$found[ $full ] = $label;
	}

	return array_values( $found );
}
