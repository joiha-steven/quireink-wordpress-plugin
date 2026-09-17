// Every value printed into a page goes through an escaper.
//
// WordPress's own review handbook makes this the first thing a reviewer looks for, and it is
// the one class of defect in a theme that is a security bug rather than a cosmetic one. The
// check is deliberately blunt: it looks for `echo` and `<?=` reaching a variable or a function
// call without an `esc_*`/`wp_kses*`/`_e`/`_x` in the same statement.
//
// Blunt means it can be wrong, so there is an escape hatch and it is a LOUD one: a
// `phpcs:ignore` comment on the line, which has to say why. Two lines carry it today and both
// print markup that was escaped piece by piece a few lines above.
//
// AND THE OTHER DIRECTION, which is the same boundary read backwards: anything written into
// post meta has to be SLASHED. `update_metadata()` calls `wp_unslash()` on the value it is
// given (`wp-includes/meta.php`), so a value already unslashed at the request boundary loses
// one level of backslashes on the way to the database. Markdown is a language made of
// backslashes. Measured: `\## a heading` was stored as `## a heading`, and the next time the
// post was opened that paragraph had turned into a heading. Nothing said so.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'quire-ink-pen'

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name).replaceAll('\\', '/')
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const SAFE = /\b(esc_html|esc_attr|esc_url|esc_js|esc_textarea|wp_kses|wp_kses_post|wp_json_encode|absint|intval|number_format_i18n|__|_e|_x|esc_html__|esc_html_e|esc_attr__|esc_attr_e|esc_html_x|esc_attr_x|the_title|the_permalink|the_content|the_archive_title|the_archive_description|body_class|language_attributes|bloginfo|wp_head|wp_body_open|wp_footer|wp_nav_menu|wp_list_comments|comment_form|get_search_form|get_header|get_footer|get_template_part|wp_link_pages|the_comments_pagination|the_posts_pagination|quireink_)\w*\s*\(/

const files = walk(ROOT).filter((p) => p.endsWith('.php'))
const problems: string[] = []

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (line.includes('phpcs:ignore')) return
    // ⚠️ EVERY `echo` ON THE LINE, NOT THE FIRST ONE. This read `(.*)$` from the first echo,
    // so a line with two of them was judged on the pair together and the second hid behind the
    // first one's escaper. Found by writing exactly that line:
    // `class="<?php echo esc_attr( $c ); ?>"<?php echo $open; ?>`. Each statement is now read
    // on its own, up to its `;` or its `?>`.
    for (const m of line.matchAll(/(?:\becho\b|<\?=)([^;]*)/g)) {
      const expr = m[1]!.split('?>')[0]!
      // A literal string with no interpolation and no variable is not a hazard.
      if (!/[$]|\w\s*\(/.test(expr)) continue
      if (SAFE.test(expr)) continue
      problems.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`)
      return
    }
  })
}

// ── meta writes carry their slashes ───────────────────────────────────────────────────────
//
// The ARGUMENTS are read, not the line: `update_post_meta(` with its value three lines down is
// the shape this repository actually writes, and a line-at-a-time reader called that a fault
// and the comment explaining the rule another one. Two false alarms in the first run, which is
// how a check earns the habit of being ignored.
const CALL = /\b(update_post_meta|add_post_meta|update_metadata|add_metadata)\s*\(/g
const SLASHED = /wp_slash\s*\(|quireink_pen_hash\s*\(/
const unslashed: string[] = []
let metaWrites = 0

/** The text between the parentheses of a call whose `(` is at `open`. */
function argsAt(text: string, open: number): string {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')') { depth--; if (depth === 0) return text.slice(open + 1, i) }
  }
  return ''
}

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(CALL)) {
    const at = m.index!
    // A mention inside a comment is prose about the rule, not a call that breaks it.
    const lineStart = text.lastIndexOf('\n', at) + 1
    const before = text.slice(lineStart, at).trimStart()
    if (before.startsWith('*') || before.startsWith('//') || before.startsWith('/*')) continue
    metaWrites++
    const args = argsAt(text, at + m[0].length - 1)
    // A literal value is not a hazard; anything else is a string on its way from a request
    // into the database with one level of escaping missing.
    const value = args.split(',')[2] ?? ''
    if (SLASHED.test(args) || /^\s*(['"]|\d|true|false)/.test(value)) continue
    unslashed.push(`${file}:${text.slice(0, at).split('\n').length}: ${m[1]}(…${value.trim().slice(0, 60)})`)
  }
}

console.log(`  scanned ${files.length} PHP file(s) in ${ROOT}/, ${metaWrites} meta write(s)`)
if (problems.length === 0 && unslashed.length === 0) {
  console.log('✓ check:escape: ok')
} else {
  if (problems.length) {
    console.log(`✗ check:escape: ${problems.length} unescaped output(s)`)
    for (const p of problems) console.log(`  · ${p}`)
  }
  if (unslashed.length) {
    console.log(`✗ check:escape: ${unslashed.length} meta write(s) with no wp_slash()`)
    for (const p of unslashed) console.log(`  · ${p}`)
  }
  process.exit(1)
}
