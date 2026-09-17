/**
 * The writing furniture's stylesheet, cut out of the blog engine's built admin CSS.
 *
 * The toolbar and the bubble bar are styled with Tailwind UTILITIES - `grid h-9 min-w-9
 * rounded-md text-[15px] hover:bg-white dark:hover:bg-neutral-700` - so their appearance does
 * not live in a file that can be copied. It lives in a 668 KB build of the whole admin, of
 * which this screen needs a few hundred rules.
 *
 * So: read the class names out of the two component sources, then keep every rule in the built
 * sheet whose selector mentions one of them. Nothing is retyped and nothing is guessed; when
 * the engine restyles a button, a re-extract picks it up.
 */
import { readFileSync } from 'node:fs'

/** Every class token the two components can put on an element. */
export function usedClasses(sources: string[]): Set<string> {
  const out = new Set<string>()
  for (const src of sources) {
    // Class names live in ordinary string literals here, several to a string. Taking every
    // literal is deliberately generous: a token that is not a class simply never matches a
    // selector, and missing one means a button with no styling and no error.
    for (const m of src.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)) {
      const text = m[1] ?? m[2] ?? m[3] ?? ''
      for (const token of text.split(/\s+/)) {
        if (token && /^[a-z0-9][\w:[\]().,/%#-]*$/i.test(token)) out.add(token)
      }
    }
  }
  return out
}

/** Split a stylesheet into top-level blocks, keeping at-rules whole. */
function blocks(css: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        out.push(css.slice(start, i + 1).trim())
        start = i + 1
      }
    }
  }
  return out.filter(Boolean)
}

const unescape = (s: string) => s.replace(/\\/g, '')

/**
 * Selectors that come across whatever classes are in play: the reset.
 *
 * ⚠️ `[hidden]` IS IN HERE FOR A MEASURED REASON. Tailwind's preflight restores it with
 * `[hidden]:where(:not([hidden="until-found"])){display:none!important}`, because a utility
 * like `.flex` otherwise beats the browser's own `display:none` on the same element. Cut that
 * rule out and the bubble bar sits on screen permanently with `hidden` set on it and every
 * measurement saying it is hidden.
 */
const RESET = /^:root|^html|^\*|\[hidden\]/

/**
 * Selectors the PEN sheet already draws, which this one must not draw a second time.
 *
 * Cutting `.prose` for the reading typography brings the stroke rules with it, because the
 * strokes are `.prose mark[data-pen="N"]` and there are 300 of them carrying 1,932 colours
 * inside SVG data URIs. `quireink-pen.css` is generated from the engine's own emitter and is
 * the one place those belong; a second copy here would be ~500 KB of the same ink, out of step
 * with the first the moment an ink changes.
 */
const PEN_OWNED = /\[data-pen|\[data-ink|\[data-form/

/**
 * Split a selector list on its TOP-LEVEL commas.
 *
 * `:is(a, b)` and `:not(x, y)` carry commas that are not list separators, and splitting on
 * every comma turns one rule into two that match nothing.
 */
export function selectorParts(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) { out.push(list.slice(start, i)); start = i + 1 }
  }
  out.push(list.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}

/**
 * Put every rule inside the writing surface, and RAISE ITS SPECIFICITY WHILE DOING SO.
 *
 * Both halves are load-bearing and the second one is why a scope was needed at all.
 *
 * Confinement: this sheet carries Tailwind utilities — `.flex`, `.p-1`, `.rounded-lg`,
 * `.z-40` — and it is linked onto a page full of other people's meta boxes. Names that common
 * belong to whoever wrote them; unscoped, this would restyle a neighbour's markup.
 *
 * Specificity: wp-admin styles ELEMENTS. `p{font-size:13px}` in `common.css` beats the 18px
 * `.prose` hands down to it, because inheritance loses to any declaration at all — the writing
 * rendered at 13px with every rule in this sheet saying 18. And `#poststuff h2{font-size:14px}`
 * in `edit.css` carries an ID, which no class selector can outrank. A scope beginning with an
 * id adds 1-0-0 to every rule here, so `.prose h2` becomes 1-1-1 against that rule's 1-0-1.
 *
 * Measured before: p 13px/19.5, h2 14px. After: p 18px/29.7, h2 24px.
 */
export function scopeSelector(list: string, scope: string): string {
  return selectorParts(list).map((part) => {
    // `:root` and `html` ARE the scope here: there is no document root to speak of inside a
    // box on somebody else's page, and prefixing them would produce a selector matching
    // nothing at all.
    if (part.startsWith(':root')) return scope + part.slice(5)
    if (/^html\b/.test(part)) return scope + part.slice(4)
    return `${scope} ${part}`
  }).join(',')
}

/** Does this selector name any class we use? */
function wanted(selector: string, classes: Set<string>): boolean {
  const plain = unescape(selector)
  for (const cls of classes) {
    const at = plain.indexOf('.' + cls)
    if (at === -1) continue
    // A boundary check, so `.h-9` does not match inside `.h-96`.
    const after = plain[at + cls.length + 1]
    if (after === undefined || /[^\w-]/.test(after)) return true
  }
  return false
}

/**
 * Keep the rules the furniture needs, and the variable declarations everything needs.
 *
 * `:root`, `@property` and `@font-face` come through whole: Tailwind 4 puts its palette and its
 * spacing scale in custom properties, and a rule that reads `var(--color-neutral-700)` with the
 * declaration left behind renders as nothing at all.
 */
/** The rules inside a wrapper that this screen needs, at any depth of nesting. */
function innerWanted(body: string, classes: Set<string>, scope: string): string[] {
  const out: string[] = []
  for (const rule of blocks(body)) {
    if (/^@layer/.test(rule)) {
      const open = rule.indexOf('{')
      out.push(...innerWanted(rule.slice(open + 1, rule.lastIndexOf('}')), classes, scope))
      continue
    }
    if (/^@(media|supports)/.test(rule)) {
      const open = rule.indexOf('{')
      const head = rule.slice(0, open + 1)
      const nested = innerWanted(rule.slice(open + 1, rule.lastIndexOf('}')), classes, scope)
      if (nested.length) out.push(`${head}\n${nested.join('\n')}\n}`)
      continue
    }
    if (/^@(property|font-face|keyframes)/.test(rule)) {
      out.push(rule)
      continue
    }
    const sel = rule.slice(0, rule.indexOf('{'))
    if (PEN_OWNED.test(sel)) continue
    if (RESET.test(sel.trim()) || wanted(sel, classes)) {
      out.push(scope ? scopeSelector(sel, scope) + rule.slice(rule.indexOf('{')) : rule)
    }
  }
  return out
}

export function editorCss(
  adminCss: string,
  classes: Set<string>,
  ownedElsewhere: Set<string> = new Set(),
  scope = '',
): string {
  const keep: string[] = []

  for (const block of blocks(adminCss)) {
    if (/^@keyframes\s+pen-/.test(block)) continue
    // ⚠️ `@supports` IS NOT IN THIS LIST. Its body is ordinary rules and they have to be
    // scoped like every other rule; kept whole they were the one hole in the scope.
    if (/^@(property|font-face|keyframes)/.test(block)) {
      keep.push(block)
      continue
    }
    // ⚠️ TAILWIND 4 PUTS EVERY UTILITY INSIDE `@layer utilities`. Skipping unknown at-rules
    // meant keeping 61 `@property` declarations and almost no actual rules, and the toolbar
    // rendered as bare text with every measurement saying the sheet was fine.
    //
    // The layer is FLATTENED rather than kept: a layer is only meaningful next to the other
    // layers it was ordered against, and none of those are coming. Carried across on its own
    // it would lose to every unlayered rule on the page instead of winning.
    if (/^@layer/.test(block)) {
      const open = block.indexOf('{')
      const body = block.slice(open + 1, block.lastIndexOf('}'))
      keep.push(...innerWanted(body, classes, scope))
      continue
    }
    if (/^@(media|supports)/.test(block)) {
      const open = block.indexOf('{')
      const head = block.slice(0, open + 1)
      const body = block.slice(open + 1, block.lastIndexOf('}'))
      const inner = innerWanted(body, classes, scope)
      if (inner.length) keep.push(`${head}\n${inner.join('\n')}\n}`)
      continue
    }
    if (/^@/.test(block)) continue

    const sel = block.slice(0, block.indexOf('{'))
    if (PEN_OWNED.test(sel)) continue
    if (RESET.test(sel.trim()) || wanted(sel, classes)) {
      keep.push(scope ? scopeSelector(sel, scope) + block.slice(block.indexOf('{')) : block)
    }
  }

  // ── close over the custom properties the kept rules read ────────────────────────────────
  //
  // A rule can survive the cut while the declaration it reads does not, and the result is a
  // rule that silently does nothing: `transition-duration: var(--dur-fast)` with no
  // `--dur-fast` anywhere is not an error, it is an animation that never runs. Two of them
  // were in the first cut, and `check:standalone` in the plugin is what found them.
  //
  // So: collect every property the kept rules READ, drop the ones they also DEFINE, and pull
  // the remaining declarations out of the source sheet into one block.
  const kept = keep.join('\n')
  const read = new Set([...kept.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!))
  for (const m of kept.matchAll(/(--[\w-]+)\s*:/g)) read.delete(m[1]!)
  // ⚠️ AND ANYTHING THE PEN SHEET OWNS. `--ink-h` and `--u-h` are set per stroke by
  // `quireink-pen.css`; declaring them at `:root` here would give a mark with no stroke rule
  // 1.04em where it should fall back to 1.08em. A 4% difference in stroke height, on the one
  // surface this plugin exists for, arriving from a stylesheet about toolbar buttons.
  for (const name of ownedElsewhere) read.delete(name)

  const closing: string[] = []
  for (const name of [...read].sort()) {
    // The FIRST declaration in the source, which is the base one: a later override lives in a
    // media query or a scheme selector this screen is not carrying.
    const found = new RegExp(`\\${name}\\s*:\\s*([^;}]+)`).exec(adminCss)
    if (found) closing.push(`  ${name}: ${found[1]!.trim()};`)
  }

  return closing.length
    ? `${kept}\n/* Declarations the rules above read, carried over so they are not silent. */\n${scope || ':root'} {\n${closing.join('\n')}\n}\n`
    : kept
}

export function buildEditorCss(
  adminCssPath: string, sourcePaths: string[], penCss = '', scope = '',
): string {
  const classes = usedClasses(sourcePaths.map((p) => readFileSync(p, 'utf8')))
  const owned = new Set([...penCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!))
  return editorCss(readFileSync(adminCssPath, 'utf8'), classes, owned, scope)
}
