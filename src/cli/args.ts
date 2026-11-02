import { parseArgs } from 'node:util'
import { DEFAULT_IGNORE_DESCRIPTION } from './discover'

export interface CliOptions {
  inputs: string[]
  keyPrefix: string
  tPrefix: string | undefined
  write: boolean
  langFile: string | undefined
  warningsFile: string | undefined
  existingKeysFile: string | undefined
  reportFile: string | undefined
  checkLangFile: string | undefined
  numericMerge: boolean
  ignorePatterns: string[]
  ignoreValues: string[]
  defaultIgnore: boolean
  quiet: boolean
  help: boolean
  version: boolean
}

export function buildHelpText(): string {
  return `
ast-i18n-extractor — extract i18n strings from Vue, JS, TS, JSX and TSX

Usage:
  bun src/cli.ts [options] <file-or-directory...>
  bun run cli -- [options] <file-or-directory...>

Options:
  -p, --prefix <prefix>       Key prefix (default: "app"; empty string disables it)
  -t, --t-prefix <prefix>     Replacement call prefix (default: this.$t for JS,
                              $t for TS, t for JSX/TSX)
  -w, --write                 Write replaced source back in place (default: dry run)
  -l, --lang <file>           Merge extracted messages into a JSON file
      --warnings <file>       Write warnings as JSON
      --existing-keys <file>  Write already-used $t()/t() keys as JSON
      --report <file>         Write a JSON report (files, keys, variants, warnings)
      --check <lang.json>     Verify source $t keys against a language file; exit 1 on mismatch
      --no-numeric-merge      Do not merge "Step 1/2/3" into "Step {0}"
      --ignore-value <regex>  Skip values matching regex; repeat or separate with commas.
                              Use it for project-specific brand/product names.
      --ignore <regex>        Skip matching paths; repeat or separate with commas
      --no-default-ignore     Disable default ignores
  -q, --quiet                 Print only the final summary
  -h, --help                  Show this help
  -v, --version               Show version

Default ignores: ${DEFAULT_IGNORE_DESCRIPTION}
Supported files: .vue, .js, .ts, .jsx, .tsx
`.trim()
}

export function parseCliArgs(argv: string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'help': { type: 'boolean', short: 'h', default: false },
      'version': { type: 'boolean', short: 'v', default: false },
      'prefix': { type: 'string', short: 'p', default: 'app' },
      't-prefix': { type: 'string', short: 't' },
      'write': { type: 'boolean', short: 'w', default: false },
      'lang': { type: 'string', short: 'l' },
      'warnings': { type: 'string' },
      'existing-keys': { type: 'string' },
      'report': { type: 'string' },
      'check': { type: 'string' },
      'no-numeric-merge': { type: 'boolean', default: false },
      'ignore-value': { type: 'string', multiple: true, default: [] },
      'ignore': { type: 'string', multiple: true, default: [] },
      'no-default-ignore': { type: 'boolean', default: false },
      'quiet': { type: 'boolean', short: 'q', default: false },
    },
  })

  return {
    inputs: positionals.length > 0 ? positionals : ['.'],
    keyPrefix: values.prefix,
    tPrefix: values['t-prefix'],
    write: values.write,
    langFile: values.lang,
    warningsFile: values.warnings,
    existingKeysFile: values['existing-keys'],
    reportFile: values.report,
    checkLangFile: values.check,
    numericMerge: !values['no-numeric-merge'],
    ignorePatterns: values.ignore,
    ignoreValues: values['ignore-value'],
    defaultIgnore: !values['no-default-ignore'],
    quiet: values.quiet,
    help: values.help,
    version: values.version,
  }
}
