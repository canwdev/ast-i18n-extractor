import type { WarningItem } from '../types'
import type { CliOptions } from './args'
import type { DiscoveredFile } from './discover'
import * as fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { merge } from 'lodash-es'
import pkg from '../../package.json' with { type: 'json' }
import { VueLangExtractor } from '../extractors/extractor'
import { extractJs, extractJsx, extractVue, findExistingI18nKeys } from '../index'
import { countExtractedMessages } from '../utils/count'
import { buildHelpText, parseCliArgs } from './args'
import { buildIgnorePatterns, discoverFiles } from './discover'

type JsonObject = Record<string, unknown>

interface ProcessedFile {
  file: DiscoveredFile
  source: string
  output: string
  extracted: Record<string, string>
  warnings: WarningItem[]
  existingKeys: string[]
}

interface FileFailure {
  file: DiscoveredFile
  message: string
}

interface WarningOutput extends WarningItem {
  file: string
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function displayPath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/') || '.'
}

function writeJsonFile(filePath: string, value: unknown): string {
  const absolutePath = path.resolve(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`)
  return absolutePath
}

function readExistingJson(filePath: string): { exists: boolean, value: JsonObject } {
  const absolutePath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath))
    return { exists: false, value: {} }

  const text = fs.readFileSync(absolutePath, 'utf8')
  if (text.trim() === '')
    return { exists: true, value: {} }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid JSON in ${filePath}: ${message}`)
  }

  if (!isJsonObject(parsed))
    throw new Error(`Expected a JSON object in ${filePath}`)

  return { exists: true, value: parsed }
}

function collectExtractedValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  if (!isJsonObject(value)) {
    return []
  }
  return Object.values(value).flatMap(child => collectExtractedValues(child))
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!isJsonObject(value)) {
    return prefix ? [prefix] : []
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

function processFiles(
  files: DiscoveredFile[],
  options: CliOptions,
  extractor: VueLangExtractor,
): Promise<{ results: ProcessedFile[], failures: FileFailure[] }> {
  return (async () => {
    const results: ProcessedFile[] = []
    const failures: FileFailure[] = []
    for (const file of files) {
      try {
        results.push(await extractFile(file, options, extractor))
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push({ file, message })
      }
    }
    return { results, failures }
  })()
}

async function extractFile(
  file: DiscoveredFile,
  options: CliOptions,
  extractor: VueLangExtractor,
): Promise<ProcessedFile> {
  const source = fs.readFileSync(file.absolutePath, 'utf8')
  const existingKeys = findExistingI18nKeys(source)

  let result
  if (file.fileType === 'vue') {
    result = await extractVue(source, options.keyPrefix, options.tPrefix, extractor)
  }
  else if (file.fileType === 'jsx' || file.fileType === 'tsx') {
    result = await extractJsx(source, options.keyPrefix, options.tPrefix, extractor)
  }
  else {
    result = await extractJs(source, options.keyPrefix, file.fileType, options.tPrefix, extractor)
  }

  return {
    file,
    source,
    output: result.output,
    extracted: result.extracted,
    warnings: result.warnings,
    existingKeys,
  }
}

function hasChanges(result: ProcessedFile): boolean {
  return countExtractedMessages(result.extracted) > 0 && result.output !== result.source
}

export async function runCli(argv: string[]): Promise<number> {
  let options: CliOptions
  try {
    options = parseCliArgs(argv)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`ERROR ${message}\n`)
    console.error(buildHelpText())
    return 2
  }

  if (options.help) {
    console.log(buildHelpText())
    return 0
  }

  if (options.version) {
    console.log(pkg.version)
    return 0
  }

  let existingLang: JsonObject = {}
  let langFileExists = false
  if (options.langFile) {
    try {
      const existing = readExistingJson(options.langFile)
      existingLang = existing.value
      langFileExists = existing.exists
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`ERROR ${message}`)
      return 1
    }
  }

  const { patterns, invalid } = buildIgnorePatterns(options.ignorePatterns, options.defaultIgnore)
  invalid.forEach(pattern => console.error(`WARN invalid ignore regex: ${pattern}`))

  const discovery = discoverFiles(options.inputs, patterns)
  discovery.errors.forEach(error => console.error(`ERROR ${error}`))

  if (discovery.files.length === 0) {
    console.error('No supported files found.')
    return 1
  }

  const ignoreValuePatterns: RegExp[] = []
  options.ignoreValues.forEach((pattern) => {
    try {
      ignoreValuePatterns.push(new RegExp(pattern))
    }
    catch {
      console.error(`WARN invalid ignore-value regex: ${pattern}`)
    }
  })
  const extractorOptions = { ignoreValuePatterns }

  let extractor = new VueLangExtractor(options.keyPrefix, extractorOptions)
  let scan = await processFiles(discovery.files, options, extractor)
  let results = scan.results
  let failures = scan.failures

  // 数字变体需要先知道全部文案：先扫一遍拿 values，再预置 {0} 模板重扫。
  // 只在确实存在可合并组时做第二遍，避免无谓的重复解析。
  if (options.numericMerge) {
    const values = new Set<string>()
    results.forEach(result => collectExtractedValues(result.extracted).forEach(value => values.add(value)))
    const variantExtractor = new VueLangExtractor(options.keyPrefix, extractorOptions)
    variantExtractor.primeVariants(values)
    if (variantExtractor.hasVariants) {
      extractor = variantExtractor
      scan = await processFiles(discovery.files, options, extractor)
      results = scan.results
      failures = scan.failures
    }
  }

  const existingKeys = new Set<string>()
  results.forEach(result => result.existingKeys.forEach(key => existingKeys.add(key)))

  const extracted: JsonObject = {}
  results.forEach(result => merge(extracted, result.extracted))

  const warnings: WarningOutput[] = results.flatMap(result =>
    result.warnings.map(warning => ({ file: result.file.displayPath, ...warning })),
  )

  const changed = results.filter(hasChanges)
  const written: string[] = []
  if (options.write) {
    changed.forEach((result) => {
      fs.writeFileSync(result.file.absolutePath, result.output)
      written.push(result.file.displayPath)
    })
  }

  let langOutput: string | undefined
  let langUnchanged: string | undefined
  if (options.langFile) {
    const merged = merge({}, existingLang, extracted)
    const changedLang = !langFileExists || JSON.stringify(merged) !== JSON.stringify(existingLang)
    if (changedLang)
      langOutput = writeJsonFile(options.langFile, merged)
    else
      langUnchanged = path.resolve(process.cwd(), options.langFile)
  }

  let warningsOutput: string | undefined
  if (options.warningsFile)
    warningsOutput = writeJsonFile(options.warningsFile, warnings)

  let existingKeysOutput: string | undefined
  if (options.existingKeysFile)
    existingKeysOutput = writeJsonFile(options.existingKeysFile, [...existingKeys].sort())

  const variants = extractor.getVariantEntries()

  let reportOutput: string | undefined
  if (options.reportFile) {
    reportOutput = writeJsonFile(options.reportFile, {
      totals: {
        files: results.length,
        changed: changed.length,
        messages: countExtractedMessages(extracted),
        warnings: warnings.length,
        errors: discovery.errors.length + failures.length,
      },
      files: results.map(result => ({
        file: result.file.displayPath,
        messages: countExtractedMessages(result.extracted),
        warnings: result.warnings.length,
        changed: hasChanges(result),
      })),
      keys: extracted,
      variants,
      warnings,
    })
  }

  let checkFailed = false
  if (options.checkLangFile) {
    try {
      const lang = readExistingJson(options.checkLangFile).value
      const langKeys = new Set(flattenKeys(lang))
      // 只校验源码里已经写好的 $t key；本次新抽的候选由 --write 决定，不应让 check 变红
      const usedKeys = new Set(existingKeys)
      const scope = options.keyPrefix
      const inScope = (key: string) => !scope || key === scope || key.startsWith(`${scope}.`)
      const missing = [...usedKeys].filter(key => inScope(key) && !langKeys.has(key)).sort()
      const orphans = [...langKeys].filter(key => inScope(key) && !usedKeys.has(key)).sort()
      checkFailed = missing.length > 0 || orphans.length > 0
      console.log('')
      console.log(`Check ${options.checkLangFile}: ${missing.length} missing, ${orphans.length} orphan.`)
      missing.forEach(key => console.log(`  MISSING ${key}`))
      orphans.forEach(key => console.log(`  ORPHAN  ${key}`))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`ERROR ${message}`)
      checkFailed = true
    }
  }

  if (!options.quiet) {
    results.forEach((result) => {
      const count = countExtractedMessages(result.extracted)
      if (count === 0 && result.warnings.length === 0)
        return
      console.log(`${result.file.displayPath}: ${count} message(s), ${result.warnings.length} warning(s)`)
    })

    if (warnings.length > 0) {
      console.log('\nWarnings:')
      warnings.forEach(warning => console.log(`  ${warning.file}: ${warning.message}: "${warning.value}"`))
    }
  }

  failures.forEach(failure => console.error(`ERROR ${failure.file.displayPath}: ${failure.message}`))

  const errorCount = discovery.errors.length + failures.length
  console.log('')
  console.log(`Scanned ${discovery.files.length} file(s); ${changed.length} file(s) changed.`)
  console.log(`Extracted ${countExtractedMessages(extracted)} unique message(s); ${warnings.length} warning(s); ${errorCount} error(s).`)

  if (options.write)
    console.log(`Wrote ${written.length} source file(s).`)
  else if (changed.length > 0)
    console.log('Dry run: pass --write to update source files.')

  if (langOutput)
    console.log(`Language JSON: ${displayPath(langOutput)}`)
  else if (langUnchanged)
    console.log(`Language JSON unchanged: ${displayPath(langUnchanged)}`)
  if (warningsOutput)
    console.log(`Warnings JSON: ${displayPath(warningsOutput)}`)
  if (existingKeysOutput)
    console.log(`Existing keys JSON: ${displayPath(existingKeysOutput)}`)
  if (reportOutput)
    console.log(`Report JSON: ${displayPath(reportOutput)}`)
  if (variants.length > 0)
    console.log(`Numeric variants merged: ${variants.length} value(s) in ${new Set(variants.map(v => v.key)).size} key(s).`)

  return errorCount > 0 || checkFailed ? 1 : 0
}
