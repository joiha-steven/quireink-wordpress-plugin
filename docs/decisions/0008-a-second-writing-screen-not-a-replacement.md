# 0008 — A second writing screen, not a replacement

**In force**, amended by [0009](0009-the-surface-goes-inside-wordpress-editor.md): the screen
is no longer a page of its own and `use_block_editor_for_post` is no longer untouched. The
decision below — a second way to write, chosen per post, never the only one — stands.

## Context

The pen reached the block editor first, as three inline formats. Then it was used, and the
friction was the point: marking a phrase cost select, open the overflow chevron, choose.

The ceiling was measured rather than assumed, in WordPress 6.8.3:

- `BlockControls` with `group: 'inline'` does nothing from inside a format's `edit`. No button
  in the DOM, no console error, and the failing render silently took the keyboard shortcuts
  down with it. A format edit has no block edit context to fill that slot from.
- There is no inline typing transform to sit beside. Typing `**bold**`, `_em_`, `` `code` ``
  and `==mark==` into a clean empty paragraph converts none of them.
- `RichTextShortcut` works.

One keystroke is as good as Gutenberg gets, and the plugin is at that ceiling. Below it means
the blog engine's own editor, which types `==x==` into a stroke as the closing `=` lands.

## Decision

A **second** writing screen, reached from a post, never the only one.

`admin.php?page=quireink-pen-editor&post=N`, with "Write in Quire Ink" as a row action on the
posts list and a link in the block editor's post panel. The pattern is the one WordPress
authors already know from page builders: the post has another way to be edited, and choosing it
is a click rather than an installation-wide setting.

Gutenberg is not replaced, not filtered out, not discouraged. `use_block_editor_for_post` is
untouched.

## Consequences

**Nobody who does not click it loses anything.** Every other plugin's editor integration keeps
working, because the editor those plugins integrate with is still there. That is the whole
reason this is a second screen and not a replacement.

**Two copies of the content, one of them authoritative.** Markdown is the source, in post meta;
`post_content` holds the render so that themes, feeds, search and every other plugin read
ordinary HTML. A dual write drifts, so `_quireink_html_hash` catches it and the editor refuses
to silently overwrite work done elsewhere. `inc/store.php` has the detail.

**A post not written here opens anyway.** Its HTML is read into the editor's document by
ProseMirror and comes back as Markdown: `<h2>` becomes `## `, `<strong>` becomes `**`, and a
`<mark data-pen>` becomes `==x==`. Gutenberg's block delimiters are stripped on the way in.

**The engine is 189 KB gzipped**, admin-only and fetched when the screen opens. It is not on
any page a reader waits for.

This does not rule out making it the default one day. It rules out doing that by accident.
