# Gaps

What does not survive the trip, and why. Each of these is a thing a reader of the blog engine
would expect and will not find, written down so it is a known limit rather than a bug report.

## `data-pen` is stripped for authors without `unfiltered_html`

WordPress runs `wp_kses_post` on content saved by a Contributor or Author, and `data-*`
attributes on `<mark>` and `<u>` are not in the default allowed list. The mark survives; the
stroke variant does not, so every mark on that post gets stroke 0 and the page loses the
hand-made look that is the entire point.

The plugin widens `wp_kses_allowed_html` for exactly the three attributes it emits. It does
not widen anything else, and on a multi-author site that is a decision worth knowing about
rather than a detail.

## A dark page is light unless something says otherwise

The ink comes in two sets, measured for white paper and for dark. The engine knows which it
is; a plugin on a stranger's theme does not, because there is no standard signal. WordPress
has no core dark mode.

Standalone, the plugin assumes light. A theme can say otherwise by declaring
`add_theme_support( 'quireink-pen' )` and putting `dark` on an ancestor, which the Quire Ink
theme does. A site without one can use the `quireink_pen_is_dark` filter.

Guessing from `prefers-color-scheme` was considered and rejected: a light theme on a reader's
dark-mode machine would get dark-paper ink on white paper, which is worse than being wrong in
one direction consistently.

## The pen's sounds, its settings and its per-blog inks do not come

The blog engine lets an owner retune the inks. That is 155 knobs of appearance machinery and a
settings store, and none of it is a plugin's business. The plugin ships the engine's default
five inks, and takes the theme's if the theme offers them.

## Typing `==text==` does not become a mark

Measured in WordPress 6.8.3, in a clean empty paragraph, typing the whole string in one go:

```
**bold** and _em_ and `code` and ==mark== end
```

**None of them converted.** All four stayed literal text. Core has no inline Markdown typing
transform for a plugin to sit beside, and `__unstableInputRule` is in the bundle but is not a
plugin-facing API.

So the ceiling inside Gutenberg is a keyboard shortcut, and this plugin is at it:

| Wanted | Available |
|---|---|
| a button in the main toolbar row | no. `BlockControls group="inline"` does not work from a format's edit |
| `==text==` converting as you type | no. No inline input rule |
| one keystroke | **yes**, and that is what ships |

Below one keystroke means the blog engine's own editor, which is a different product decision
and is tracked in the programme's open questions rather than here.

## Markdown is not here yet

Track B. This plugin is the pen first. The engine's `src/md` is 4,513 lines and self-contained,
and bringing it across waits on it being split into its own repository.

## Opening a post built in WordPress loses its layout

Markdown holds words. It does not hold layout, and a WordPress post can be mostly layout.

Measured on a post carrying one of each, 2026-09-17:

| Comes across intact | Becomes |
|---|---|
| headings, bold, italic, links, inline code | themselves |
| lists, quotes, rules, fenced code | themselves |
| **tables** | a Markdown table, header row and all |
| images | `![alt](url)`, but the caption detaches into its own paragraph |
| **two columns** | **two ordinary paragraphs. The layout is gone** |
| a button | a plain link |
| a Custom HTML block | its text content; the element is gone |
| an embed | a bare URL on its own line |

**Reading is safe. Saving is what replaces things**, and the screen says so twice: a notice
naming the blocks by name when it opens, and a confirmation listing them again before the
first save. `inc/survey.php` finds them, and it names them rather than counting them, because
"some formatting may be lost" is a sentence nobody acts on.

A block type absent from `quireink_pen_safe_blocks()` is not necessarily broken; it is not
KNOWN to survive, and for a warning those are the same thing. Adding one means opening a post
that contains it and looking.

## The reading surface is not here and will not be

Type, measure, rail, table of contents, listing: that is the theme's job, it is already
shipped, and duplicating it here would make two products that fight over one page.
