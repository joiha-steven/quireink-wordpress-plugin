# 0009 — The writing surface goes inside WordPress's own editing screen

**In force.** Amends [0008](0008-a-second-writing-screen-not-a-replacement.md) on two points:
the URL, and `use_block_editor_for_post`.

## Context

0008 built the second writing screen as a page of its own: `admin.php?page=…`, rendered by
hand, with its own Save button and its own REST route. It worked, and it was proved end to end.

Then it was looked at as a writer rather than as a build, and what it could not do was the
whole of finishing a piece:

| The screen had | The screen did not have |
|---|---|
| the writing surface | Publish, Save draft, Schedule |
| the pen | the title (read only), the slug |
| a Save that wrote `post_content` | a revision — **none was written** |
| a way back to WordPress | categories, tags, excerpt, featured image |
| | autosave, the post lock, Preview, Trash |
| | every other plugin's meta box |

Rebuilding that list is rebuilding WordPress, and rebuilding it worse: a Publish button written
here is a Publish button that has to learn scheduling, pending review, private posts, sticky,
capabilities and the eight `post_status` values, and it has to go on learning them at every
WordPress release. A revision not written is work an author cannot get back.

## Decision

Keep WordPress's screen. Replace one box inside it.

`post.php` still draws the form. `remove_post_type_support( $type, 'editor' )` takes the
TinyMCE box away and `edit_form_after_title` puts the paper in its place, over a
`<textarea name="content">` the editor keeps filled. WordPress reads that field exactly as it
has since 2003, which is why everything around it goes on working with no cooperation from
this plugin: the save, the revision, the lock, the autosave, the redirect, the notices.

The Markdown source rides up beside it in a hidden field and is stored from `save_post`, after
WordPress has written the content — so the hash is taken from what is actually in the post
rather than from what was sent.

**`use_block_editor_for_post` is now filtered**, which 0008 said it would not be. The filter
returns false only for a post whose author asked for Quire Ink — `?quireink=1`, or a post that
already has a Markdown source — and the Publish box carries **"Use the block editor"** on every
one of those screens. A choice that can be reversed in one click from the screen it was made on
is not a replacement.

## Consequences

**The gap list from 0008 closes without a line of code.** Publish, schedule, revisions, the
lock, autosave, the title, taxonomies, the featured image and other plugins' meta boxes are
WordPress's, on WordPress's screen.

**The editor no longer refuses a foreign edit; it opens the newer text.** 0008 returned HTTP
409 and asked. There is nothing to refuse now: if `post_content` no longer hashes to what this
plugin wrote, the screen opens from `post_content` — the version the author can see and the
newer one — says so in a notice, and leaves the stale Markdown in place. The REST route and the
409 are gone.

**A screen with no JavaScript is a plain textarea holding the post's HTML**, printed by the
server and hidden by core's `hide-if-js` once the script arrives. The old screen was a blank
page in that case.

**The classic screen is the host, so the block editor's furniture is not there.** No block
inserter, no block-level settings, and a post opened here shows Gutenberg's delimiters only in
the no-JavaScript fallback. That is the trade: the block editor is one click away in the
Publish box.

**Two screens became one.** `inc/screen.php` and `inc/rest.php` are deleted.
