// One command to get your own changes live: stage everything, commit, push.
// Vercel does the rest. Usage:  npm run ship  ("added two recipes")
import { execSync } from 'child_process'

const run = (cmd, quiet = false) =>
  execSync(cmd, { stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' })

const changed = run('git status --porcelain', true).trim()
if (!changed) {
  console.log('\nNothing to ship — no changes since the last push.\n')
  process.exit(0)
}

console.log('\nChanges to ship:')
console.log(changed.split('\n').map(l => '  ' + l).join('\n'))

const message = process.argv.slice(2).join(' ').trim()
  || `Update ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

run('git add -A')
run(`git -c commit.gpgsign=false commit -q -m "${message.replace(/"/g, "'")}"`)
run('git push -q')

console.log(`\n  Shipped: "${message}"`)
console.log('  Vercel is building now — live in about a minute at')
console.log('  https://cooking-companion-iota.vercel.app\n')
