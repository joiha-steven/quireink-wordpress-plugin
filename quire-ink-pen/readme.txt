=== Quire Ink Pen ===
Contributors: quireink
Tags: editor, highlight, annotation, markdown, writing
Requires at least: 6.5
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Highlight, underline and ring words in the block editor, drawn as hand strokes rather than rectangles.

== Description ==

Three buttons in the editor toolbar: highlight, underline, ring.

What makes them different from every other highlighter is that they are not rectangles. Each
mark is one of eighty hand-drawn strokes, and which one you get is decided by the words
themselves, so no two marks on a page are the same shape and the page reads like somebody went
over it with a real pen.

The strokes come from Quire Ink, a blog engine, where they were drawn from a photographed
highlighter box: five inks, plus a pencil and a red ballpoint.

= It works with your theme =

Any theme. The plugin adds no layout, no typography and no colours of its own, and every stroke
is measured against the text it marks, so it takes your theme's type as it finds it.

It does not need, and does not install, anything else.

= Better with the Quire Ink theme =

The [Quire Ink theme](https://wordpress.org/themes/quire-ink/) is the reading surface these
marks were drawn for. Neither needs the other; together they are the whole thing.

= Light pages and dark pages =

The ink comes in two sets, one measured for white paper and one for dark. WordPress has no core
dark mode and there is no standard signal, so the plugin assumes light. A theme can say
otherwise by declaring `add_theme_support( 'quireink-pen' )`, and any site can answer the
`quireink_pen_is_dark` filter.

= Weight =

The stylesheet is about 34 KB compressed, and it only loads on pages that actually carry a
mark. Nothing is loaded anywhere else.

== Installation ==

1. Install and activate.
2. Open a post, select some words, and use the highlight, underline or ring button in the
   formatting toolbar.

There are no settings.

== Frequently Asked Questions ==

= Does this need the Quire Ink theme? =

No. It works with any theme. The two are made for each other and neither requires the other.

= Does it work in the classic editor? =

Not yet. The formats are registered with the block editor's rich text API.

= My marks lost their strokes =

Content saved by a Contributor or an Author goes through WordPress's HTML filter. The plugin
widens that filter for its own three attributes; if another plugin narrows it again, the
attributes are stripped and every mark falls back to the first stroke.

= Can I change the colours? =

No, and it is worth saying why: the ink is stamped into three hundred stroke images rather than
set as a colour value. The five inks are what a real highlighter box measured, not a palette.

== Screenshots ==

1. The three buttons in the formatting toolbar.
2. A marked paragraph on a light page.
3. The same paragraph on a dark page.

== Changelog ==

= 0.1.0 =
* First release. Highlight, underline and ring as block editor formats.
