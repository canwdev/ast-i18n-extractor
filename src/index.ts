import type { ReplacementItem } from './replacer'
import type { ExtractOptions, WarningItem } from './types'
import type { SFCBlock, SFCDescriptor } from './utils/sfc'

import { set as _set } from 'lodash-es'
import { valueNeedExtract } from './checker'
import { VueLangExtractor } from './extractors/extractor'
import { replaceTemplate } from './replacer'
import { formatI18nKey } from './utils/format-key'
import { parseComponent } from './utils/sfc'

function formatValue(value: string) {
  // 处理HTML字符串中的  \n  为空格
  return value.replace(/ *\n */g, ' ')
}

export async function extractJs(
  src: string,
  keyPrefix: string,
  type: 'js' | 'ts' = 'js',
  tPrefix?: string,
  vueLangEx?: VueLangExtractor,
  options?: ExtractOptions,
) {
  const textMap: { [key: string]: string } = {}
  vueLangEx = vueLangEx || new VueLangExtractor(keyPrefix)
  // 如果是 ts 文件，假设使用 setup 语法，生成的代码不带 this
  const prefix = tPrefix || (type === 'ts' ? '$t' : 'this.$t')
  const result = vueLangEx.extractScript(src, prefix, options?.logObjects)
  Object.keys(result.textMap).forEach((key) => {
    _set(textMap, key, formatValue(result.textMap[key] ?? ''))
  })
  return {
    output: result.newTemplate,
    extracted: textMap,
    warnings: result.warnings,
  }
}

export async function extractVue(
  src: string,
  keyPrefix: string,
  tPrefix: string = '',
  vueLangEx?: VueLangExtractor,
  options?: ExtractOptions,
) {
  const parsed = parseComponent(src) as SFCDescriptor & { scriptSetup?: SFCBlock }
  const textMap: { [key: string]: string } = {}
  const edits: ReplacementItem[] = []
  const warnings: WarningItem[] = []

  vueLangEx = vueLangEx || new VueLangExtractor(keyPrefix)

  const blockRange = (block: SFCBlock): [number, number] => {
    const start = block.start ?? 0
    const end = typeof block.end === 'number' && block.end >= start ? block.end : src.length
    return [start, end]
  }

  const sliceBlock = (block: SFCBlock) => {
    const [start, end] = blockRange(block)
    return src.slice(start, end)
  }

  const collectText = (result: {
    textMap: { [key: string]: string }
    warnings: WarningItem[]
  }) => {
    Object.keys(result.textMap).forEach((key) => {
      _set(textMap, key, formatValue(result.textMap[key] ?? ''))
    })
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }
  }

  // 只替换块内内容：块标签、属性、block 顺序、空行、行尾与文件末尾换行全部保持原样。
  // 注意不能用 parseComponent 的 block.content（template/style 被 deindent 过，偏移与原文不一一对应）。
  const processScript = (scriptBlock: SFCBlock, isSetupBlock: boolean) => {
    const lang = scriptBlock.lang
    const isTs = lang === 'ts' || lang === 'tsx'
    // 如果是 setup 块，或者用户指定 TS 都是 setup
    const isSetup = isSetupBlock || isTs
    const prefix = tPrefix || (isSetup ? '$t' : 'this.$t')

    const result = vueLangEx!.extractScript(sliceBlock(scriptBlock), prefix, options?.logObjects)
    collectText(result)
    const [start, end] = blockRange(scriptBlock)
    edits.push([start, end, result.newTemplate])
  }

  // 1. 处理 Script (普通) / Script Setup
  if (parsed.script) {
    processScript(parsed.script, false)
  }
  if (parsed.scriptSetup) {
    processScript(parsed.scriptSetup, true)
  }

  // 2. 处理 Template
  if (parsed.template) {
    const result = vueLangEx.extractTemplate(sliceBlock(parsed.template), tPrefix, options?.logObjects)
    collectText(result)
    const [start, end] = blockRange(parsed.template)
    edits.push([start, end, result.newTemplate])
  }

  // 3. style / custom block 不改动
  const output = replaceTemplate(src, edits)

  return {
    output,
    extracted: textMap,
    warnings,
  }
}

export async function extractJsx(
  src: string,
  keyPrefix: string,
  tPrefix?: string,
  vueLangEx?: VueLangExtractor,
  options?: ExtractOptions,
) {
  const textMap: { [key: string]: string } = {}
  vueLangEx = vueLangEx || new VueLangExtractor(keyPrefix)
  const prefix = tPrefix || 't'
  const result = vueLangEx.extractJsxScript(src, prefix, options?.logObjects)
  Object.keys(result.textMap).forEach((key) => {
    _set(textMap, key, formatValue(result.textMap[key] ?? ''))
  })
  return {
    output: result.newTemplate,
    extracted: textMap,
    warnings: result.warnings,
  }
}

/** TSX 与 JSX 使用同一套提取逻辑 */
export const extractTsx = extractJsx

// export common functions
export { findExistingI18nKeys } from './find-existing-i18n'
export type { ExtractOptions, WarningItem } from './types'
export { formatI18nKey, valueNeedExtract, VueLangExtractor }
export { DEFAULT_LOG_OBJECTS, isConsoleCall } from './utils/console-call'
export { countExtractedMessages } from './utils/count'
export type { FileType } from './utils/file-type'
export { getFileType } from './utils/file-type'
export type { ParsedIgnorePatterns } from './utils/ignore'
export { parseIgnorePatterns, shouldIgnoreFile } from './utils/ignore'
