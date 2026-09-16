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

## Markdown is not here yet

Track B. This plugin is the pen first. The engine's `src/md` is 4,513 lines and self-contained,
and bringing it across waits on it being split into its own repository.

## The reading surface is not here and will not be

Type, measure, rail, table of contents, listing: that is the theme's job, it is already
shipped, and duplicating it here would make two products that fight over one page.
