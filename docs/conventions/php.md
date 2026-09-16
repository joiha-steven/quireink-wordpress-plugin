# PHP

## Prefixes

**Everything global is `quireink_`.** Functions, classes, constants, options, post meta,
hooks, script and style handles. A plugin shares one namespace with the theme and every other
plugin, and a collision does not error — it silently takes over.

`check:prefix` reads every `function`, `class`, `define`, `do_action` and `apply_filters` in
`quire-ink-pen/` and fails on one that is not prefixed.

The theme uses the same prefix. That is correct and deliberate: they are one product family,
and the two never define the same symbol because `check:prefix` here and in the theme both run
against a shared reserved list.

## Escaping

**At the point of printing, every time.** Not at the point of reading, not "it was escaped
when it was stored". `esc_attr`, `esc_html`, `esc_url`, `wp_kses_post` — whichever fits the
position it is being printed into.

A `phpcs:ignore` needs a reason on the same line saying what makes it safe.

## File shape

- One concern per file under `inc/`, loaded from the main plugin file, nothing auto-loaded.
- The main plugin file registers hooks and defines constants. No logic.
- 400 lines is the cap, with a warning band from 380. `check:filesize` holds it.
- Guard every file with a direct-access check.

## Hooks this plugin adds

Prefix, then the thing, then the tense:

```php
apply_filters( 'quireink_pen_is_dark', false );
```

A new public hook is a promise. It goes in the readme.txt changelog when it is added.
