import type { ExtractorOptions, GeneratedEntry } from '../types'
import { hasNaturalWord } from '../utils/code-detect'
import { formatI18nKey } from '../utils/format-key'
import { extractJsLogic } from './js'
import { extractJsxLogic } from './jsx'
import { extractTemplateLogic } from './vue-template'

/** 末尾（允许尾部非数字字符）的最后一个整数；用于识别 Step 1/2/3、Option 1/2/3、3 Items/2 Items 这类数字变体 */
function splitNumericVariant(value: string) {
  const match = /(\d+)(\D*)$/.exec(value)
  if (!match || match.index === undefined) {
    return null
  }
  return {
    prefix: value.slice(0, match.index),
    number: match[1] ?? '',
    suffix: match[2] ?? '',
  }
}

interface NumericVariantGroup {
  template: string
  numbers: Set<string>
  values: Array<{ value: string, number: string }>
}

export class VueLangExtractor {
  // 已使用的 key 后缀（含 _2、_3），避免不同文案撞名
  private usedKeys: Set<string>

  // text -> key map
  private extractedTextValues: { [text: string]: string }
  // 数字变体：具体文案 -> 最终 entry（key / {0} 模板 / 参数）
  private variantEntries: Map<string, GeneratedEntry>
  private ignoreValuePatterns: RegExp[]
  public keyPrefix: string

  constructor(keyPrefix = '', options: ExtractorOptions = {}) {
    this.keyPrefix = keyPrefix || ''
    this.ignoreValuePatterns = options.ignoreValuePatterns ?? []
    this.extractedTextValues = {}
    this.usedKeys = new Set()
    this.variantEntries = new Map()
  }

  private allocKey(base: string) {
    const slug = formatI18nKey(base, '_', 32)
    let key = slug
    let index = 1
    while (this.usedKeys.has(key)) {
      index++
      key = `${slug}_${index}`
    }
    this.usedKeys.add(key)
    return this.keyPrefix ? `${this.keyPrefix}.${key}` : key
  }

  /** 生成 key；命中数字变体组时同时返回 {0} 模板与调用点参数 */
  generateEntry(value: string): GeneratedEntry {
    const variant = this.variantEntries.get(value)
    if (variant) {
      return variant
    }
    if (this.extractedTextValues[value]) {
      return { key: this.extractedTextValues[value] }
    }
    const key = this.allocKey(value)
    this.extractedTextValues[value] = key
    return { key }
  }

  generateUniqueKey(value: string) {
    return this.generateEntry(value).key
  }

  shouldIgnoreValue(value: string) {
    return this.ignoreValuePatterns.some(pattern => pattern.test(value))
  }

  /**
   * 预扫描后调用：把「只有末尾数字不同」的一组文案合并成 `{0}` 插值 key。
   * 只处理纯 ASCII 且非技术术语的文案（技术术语在 valueNeedExtract 阶段已被跳过）。
   */
  primeVariants(values: Iterable<string>) {
    this.variantEntries.clear()

    const groups = new Map<string, NumericVariantGroup>()
    for (const value of values) {
      if (!value || !/\d/.test(value)) {
        continue
      }
      const variant = splitNumericVariant(value)
      if (!variant) {
        continue
      }
      const { prefix, number, suffix } = variant
      // 数字必须是独立 token（Step 1 / 3 Items），不能是 v2.0、A.1 这类版本/规格的一部分
      if (prefix && /[A-Z0-9]$/i.test(prefix)) {
        continue
      }
      const template = `${prefix}{0}${suffix}`
      if (!hasNaturalWord(template)) {
        continue
      }
      let group = groups.get(template)
      if (!group) {
        group = { template, numbers: new Set(), values: [] }
        groups.set(template, group)
      }
      group.numbers.add(number)
      group.values.push({ value, number })
    }

    for (const group of groups.values()) {
      // 只有一个数字时没有合并价值，交给普通 key 生成
      if (group.numbers.size < 2) {
        continue
      }
      const key = this.allocKey(group.template.replace('{0}', ' '))
      for (const { value, number } of group.values) {
        this.variantEntries.set(value, { key, text: group.template, params: [number] })
      }
    }
  }

  get hasVariants() {
    return this.variantEntries.size > 0
  }

  /** 供 --report 使用 */
  getVariantEntries() {
    return [...this.variantEntries.entries()].map(([value, entry]) => ({
      value,
      key: entry.key,
      text: entry.text ?? '',
      params: entry.params ?? [],
    }))
  }

  extractJs(
    jsCode: string,
    replaceValueFn: (key: string, expressionSources?: string[]) => string,
    logObjects?: readonly string[],
  ) {
    return extractJsLogic(
      jsCode,
      replaceValueFn,
      this.generateEntry.bind(this),
      logObjects,
      this.shouldIgnoreValue.bind(this),
    )
  }

  extractJsx(
    jsCode: string,
    replaceValueFn: (key: string, expressionSources?: string[]) => string,
    logObjects?: readonly string[],
  ) {
    return extractJsxLogic(
      jsCode,
      replaceValueFn,
      this.generateEntry.bind(this),
      logObjects,
      this.shouldIgnoreValue.bind(this),
    )
  }

  // 提取 template 中的文本内容
  extractTemplate(template: string, tPrefix?: string, logObjects?: readonly string[]) {
    const extractJsForTemplate = (
      code: string,
      replaceValueFn: (key: string, expressionSources?: string[]) => string,
    ) => this.extractJs(code, replaceValueFn, logObjects)

    return extractTemplateLogic(
      template,
      this.generateEntry.bind(this),
      extractJsForTemplate,
      tPrefix,
      this.shouldIgnoreValue.bind(this),
    )
  }

  // 提取 script 中的文本内容
  /**
   * 提取 JS/TS 代码中的文本
   * @param code 代码内容
   * @param prefix 替换的前缀，默认为 this.$t
   */
  extractScript(code: string, prefix = 'this.$t', logObjects?: readonly string[]) {
    return this.extractJs(code, (key, expressionSources) => {
      if (expressionSources?.length) {
        return `${prefix}('${key}', [${expressionSources.join(', ')}])`
      }
      return `${prefix}('${key}')`
    }, logObjects)
  }

  /**
   * 提取 JSX/TSX 代码中的文本
   * @param code 代码内容
   * @param prefix 替换的前缀，默认为 t
   */
  extractJsxScript(code: string, prefix = 't', logObjects?: readonly string[]) {
    return this.extractJsx(code, (key, expressionSources) => {
      if (expressionSources?.length) {
        return `${prefix}('${key}', [${expressionSources.join(', ')}])`
      }
      return `${prefix}('${key}')`
    }, logObjects)
  }
}
