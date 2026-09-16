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
    const m = /(?:\becho\b|<\?=)(.*)$/.exec(line)
    if (!m) return
    const expr = m[1]!
    // A literal string with no interpolation and no variable is not a hazard.
    if (!/[$]|\w\s*\(/.test(expr)) return
    if (SAFE.test(expr)) return
    problems.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`)
  })
}

console.log(`  scanned ${files.length} PHP file(s) in ${ROOT}/`)
if (problems.length === 0) {
  console.log('✓ check:escape: ok')
} else {
  console.log(`✗ check:escape: ${problems.length} unescaped output(s)`)
  for (const p of problems) console.log(`  · ${p}`)
  process.exit(1)
}
