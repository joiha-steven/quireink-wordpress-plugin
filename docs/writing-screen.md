# The writing screen

Where the Quire Ink editor sits inside WordPress, and every WordPress thing holding it there.
[ADR 0009](decisions/0009-the-surface-goes-inside-wordpress-editor.md) is why it is built this
way; this is what it leans on.

## The shape of it

```
wp-admin/post.php?post=N&action=edit&quireink=1
└── <form id="post">                              WordPress
    ├── #titlediv #title                          WordPress — restyled, not replaced
    ├── #post-body-content                        WordPress
    │   └── #quireink-pen-paper                   the plugin, at edit_form_after_title
    │       ├── .quireink-pen-warning             what this post stands to lose
    │       ├── [data-quireink-tools]             the engine's button strip
    │       ├── [data-quireink-sheet]             the engine's editor, .prose inside
    │       ├── textarea#content  name=content    WHAT WORDPRESS SAVES
    │       ├── input name=quireink_pen_markdown  the source, for post meta
    │       └── the nonce
    └── #submitdiv                                WordPress — Publish, plus the way out
```

Nothing in the right-hand column is this plugin's, and that is the design. The plugin writes
**one field** and WordPress does everything else with it.

## The seams — five WordPress facts, and what breaks if one moves

| What | Where | If it changes |
|---|---|---|
| `use_block_editor_for_post` returning false draws the classic screen | `inc/compose.php` | The block editor opens and the paper never renders — the surface is simply not there |
| `edit_form_after_title` fires **before** the `post_type_supports( …, 'editor' )` branch | `wp-admin/edit-form-advanced.php` | The paper prints in the wrong place, or under an editor box that came back |
| `_wp_translate_postdata` maps `content` → `post_content` | `wp-admin/includes/post.php` | Saves stop carrying the writing. Silent: the post saves, the words do not |
| `autosave.js` reads `$('#content').val()` | `wp-includes/js/autosave.js` | Autosave stores stale text, and WordPress's own "you have unsaved changes" stops noticing |
| core's `.hide-if-js` hides the fallback textarea | `wp-admin/css/common.css` | Both the paper and a raw HTML textarea show at once |

All five were read out of WordPress 6.8 rather than remembered. Re-read them when the pinned
version in `dev/docker-compose.yml` moves.

## Which editor opens

`quireink_pen_composing()`, in priority order:

1. `?quireink=1` or `?quireink=0` — the author just asked, for this page load.
2. The post has a Markdown source — it was written here, so it opens here.
3. Otherwise WordPress's editor.

There is no option, no per-site setting and nothing stored but the post's own content. Rule 2
makes the choice stick; rule 1 is the way out of it, and **"Use the block editor" in the
Publish box** is rule 1 as a link, on every screen this takes over.

## Making it read like Quire Ink, against wp-admin

Cutting `.prose` in was not enough, and the gap was not a matter of taste: measured against the
same markup with the same two sheets and no wp-admin, **25 of 25 elements differed**.

| | live, before | isolated | why |
|---|---:|---:|---|
| paragraph | 13px / 19.5 | 18px / 29.7 | `p{font-size:13px}` in `common.css` |
| a mark's own geometry | -1.56px | -2.16px | a stroke is sized in `em`, so the ink shrank with the text |
| heading | 14px | 24px | `#poststuff h2{font-size:14px}` in `edit.css` |
| heading indent | 12px | 0 | `#poststuff h2{padding:8px 12px}` |

Two mechanisms fix it and they are not interchangeable:

**The generated sheet is scoped to `#quireink-pen-paper`.** An id in the scope puts every rule
in it at 1-x-x, which is what it takes to outrank `#poststuff h2`. The scope also confines a
sheet full of names like `.flex` and `.p-1` to the one box they belong in.

> ⚠️ The first cut of that scope was `:is(#quireink-pen-paper, body.quireink-pen-composing)`,
> so the title outside the paper could take the reading face. `:is()` takes the **highest**
> specificity of its arguments, so Tailwind's preflight — `*{margin:0;padding:0;border:0}` —
> became a 1-0-0 rule matching every element on the page, tied with
> `#wpcontent{margin-left:160px}`, and won on source order. The whole admin slid left under the
> menu. Only the TOKENS go out to the body now, because a custom property does nothing until
> something reads it.

**`screen.css` restores inheritance.** Specificity cannot help with `p{font-size:13px}`:
`.prose` sets the size on the surface and the paragraphs inherit it, and inheritance loses to
any declaration at all. So a short block says `font-size: inherit` and friends on the elements
wp-admin declares — values are never restated, and it is pitched at **1-0-1**: above wp-admin's
bare elements, below every rule in the generated sheet, so the engine still decides what a
heading or a quote looks like.

After both: **0 of 25**.

## Two more the same shape, found by looking at it

The id in the scope is a loaded gun pointed at anything the pen sheet says, because
`quireink-pen.css` speaks in attributes and attributes lose to an id however many of them there
are. Both of these were invisible: nothing failed, the strokes were simply wrong.

| | what won | what it did |
|---|---|---|
| `.prose mark{--ink-stroke:…}` in the cut, 1-1-1 | over `mark[data-ink=green][data-pen="71"]`, 0-3-1 | **every ink drew the default yellow.** Green, pink, blue and orange all `#d5f856` |
| Tailwind's `*{margin:0;padding:0}`, 1-0-0 | over `mark[data-pen="71"]{padding:0 .3em 0 .15em}`, 0-2-1 | the overhang that makes a stroke run past its word — padding 0 against 2.7px, margin 0 against −1.98px |

So the cut carries no `mark`, no `u`, no `[data-pen]` and no universal reset at all. The pen
sheet is the only sheet on a published page, so it is complete on its own; the furniture's
preflight is written out by hand in `screen.css` for the three elements that need it.
`check:contract` refuses a pen selector in the editor sheet.

Measured against the published page, which carries only the pen sheet, both are now equal.

## What the field holds

`#content` is filled from the document, not typed into, so it has to be refreshed. When:

- **two seconds after the last edit.** Not 400ms: the blog engine measured that and took it
  out, because 400ms is shorter than the pause between two sentences and the serialize landed
  inside every one of them — 126ms frozen on an 18k-word draft carrying 2,159 marks.
- **on `before-autosave`**, which is the only hook early enough to beat autosave's own read.
- **on submit**, in the capture phase, so Publish never sends text one keystroke old.

The HTML written there comes from the **reader's** renderer (`engine.toHtml`), not from the
editor's own serializer, so the writing surface and the published page cannot drift by being
serialised two different ways.

## With JavaScript off

`#content` is a real textarea holding the post's real HTML, printed by the server. Core hides
it the moment `<body>` gets its `js` class. A browser that never runs the script gets a plain
HTML editor and a working Publish button — not a blank page.
