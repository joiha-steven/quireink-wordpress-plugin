# 0007 — No settings screen

**In force, revisit** once there is a second thing worth configuring.

## Context

The pen has one genuine question a site might want to answer differently: whether the page is
dark. Everything else the blog engine exposes as a knob is appearance machinery that belongs
to a blog's owner, not to a plugin on somebody else's theme.

A settings page costs an admin menu entry, a capability check, an options row, a nonce, a
sanitiser and a screen to maintain, and it is the single most common place a plugin gets a
security finding in review.

## Decision

No settings screen. Two mechanisms instead:

- `add_theme_support( 'quireink-pen' )` for a theme that knows about the pen.
- the `quireink_pen_is_dark` filter for a site that does not.

## Consequences

Nothing to configure means nothing to get wrong, nothing to sanitise, and one fewer surface in
review. The plugin's entire admin footprint is three toolbar buttons in the editor.

Revisit when a second question appears. One filter is a feature; four filters is a settings
page that has been hidden from the people who need it.
