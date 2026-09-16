# The pairing contract

<!-- GENERATED from pair/contract.json in quireink-wordpress-private. Do not edit.
     Run `bun tools/pair-sync.ts` there. `check:pair` here is red until you do. -->

**contract-sha256:** `02f9e44bffe8ce48a4d85acdcc172aaefbfb0fa9601dc0347d0cc6524283dde4`

Quire Ink ships two things to WordPress: a **theme** that carries the reading surface, and a
**plugin** that carries the pen and the Markdown engine. They are separate downloads, they are
reviewed separately, and:

> Neither one requires the other. Installed together they are better. Installed alone each is
> complete at what it does.

That is a product decision. It is invisible on a machine where both are installed, which is
every developer's machine, so it is guarded rather than remembered:

| Guard | Refuses |
|---|---|
| `check:pair` (here) | this file disagreeing with the hash above |
| `check:standalone` (plugin) | a `var(--…)` with no fallback, or the other product named in a rule |

The block below is the contract itself, byte for byte as the master holds it.

```json
{
  "version": 1,
  "note": "The MASTER copy. Both public repos carry a generated copy and a guard. Edit here, run tools/pair-sync.ts, commit all three.",
  "direction": "The plugin READS. The theme WRITES, or does not. Nothing in either repo requires the other to be installed.",

  "markup": {
    "owner": "quireink",
    "source": "docs/pen.md (ADR 0048)",
    "note": "Not ours to change. The plugin emits exactly what the blog engine's renderer emits, so one stylesheet draws both.",
    "highlight": "<mark data-pen=\"N\" [data-ink=\"green|pink|blue|orange\"]>",
    "underline": "<u data-pen=\"N\" [data-ink=\"yellow|green|pink|blue|orange\"]>",
    "ring": "<mark data-form=\"o\" data-pen=\"N\" [data-ink=\"...\"]>",
    "wrapper_class": "pen",
    "dark_class": "dark",
    "pen_variant_range": [0, 79],
    "seed_hash": "FNV-1a of the marked text; (len <= 28 ? 40 : 0) + (h >>> 0) % 40"
  },

  "ink_is_not_a_palette": {
    "measured": "2026-09-16, demo.quireink.com/pen.css: 0 plain CSS colour values, 1932 URL-encoded colours inside 300 SVG data-URI stamps.",
    "consequence": "A theme CANNOT recolour the strokes by setting a custom property. The colour is stamped into each of the 300 dies. Any design that assumes otherwise is wrong.",
    "and_that_is_correct": "The five inks are measured off a real highlighter box. They are the instrument, not a palette slot. A theme recolouring them would be a theme recolouring a photograph.",
    "why_it_fits_anywhere_anyway": "Every stroke is sized and positioned in em against the text it marks. It follows the host theme's type with no coordination at all. This is why standalone works and why it needed no contract."
  },

  "pairing": {
    "note": "What the two products actually share. Three things, all optional, none of them colour.",
    "dark_page": {
      "signal": "class `dark` on an ancestor of the marked text",
      "written_by": "quireink-wordpress-theme, from its active scheme",
      "read_by": "the ink sheet, which carries a second full set of dies measured for dark paper",
      "if_absent": "the plugin assumes light, and offers the `quireink_pen_is_dark` filter. It does NOT guess from prefers-color-scheme: a light theme on a reader's dark-mode machine would then get dark-paper ink on white paper, which is worse than being wrong in one direction consistently."
    },
    "wrapper_class": {
      "signal": "class `pen` on an ancestor",
      "written_by": "the plugin, via body_class, on any post that carries a mark",
      "read_by": "the ink sheet",
      "if_absent": "no rule matches and marks render as the browser's default <mark>"
    },
    "theme_support": {
      "flag": "quireink-pen",
      "declared_by": "quireink-wordpress-theme",
      "read_by": "quireink-wordpress-plugin",
      "meaning": "This theme sets the dark class itself and scopes the reading surface. The plugin may skip its own scheme handling.",
      "required": false
    }
  },

  "forbidden": {
    "note": "Each of these would turn a pairing into a dependency. Guarded on both sides.",
    "plugin_must_not": [
      "name the theme's slug or any theme-only selector in a rule",
      "read a custom property it does not itself define, without a fallback value",
      "require add_theme_support('quireink-pen') for any feature to work",
      "assume any colour, font or measure exists on the host page"
    ],
    "theme_must_not": [
      "name the plugin's slug or any plugin class in a rule the reading surface depends on",
      "require the plugin for any template to render",
      "ship the pen's ink sheet"
    ]
  }
}
```

## Reading it

**`markup`** is not ours. It belongs to the blog engine, is published in its `docs/pen.md`
under ADR 0048, and is what any Quire Ink's `/pen.css` already draws. The plugin emits exactly
this, so one stylesheet draws a Quire Ink post and a WordPress post identically.

**`variables`** are the pairing, and they run one way. The plugin's sheet reads each through a
fallback, so a page with no theme renders the plugin's own defaults and nothing is wrong. A
Quire Ink theme defines them from its active palette, and the marks follow.

**`theme_support`** lets the plugin step back from work the theme already does. The plugin must
be correct without it: the common case is a theme that has never heard of any of this.

**`forbidden`** is the list that turns a pairing into a dependency. Each entry is a rule a
guard enforces.
