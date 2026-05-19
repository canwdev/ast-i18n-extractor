import type { Expression, Pattern, Super, TemplateElement, TemplateLiteral } from 'estree'
import type { ReplacementItem } from '../replacer'

export type ReplaceValueFn = (key: string, expressionSources?: string[]) => string

/** 将模板字符串静态部分转为 i18n 占位符文案，如 `hello ${x}` → `hello {0}` */
export function buildI18nTextFromTemplateLiteral(quasis: TemplateElement[]): string {
  let result = ''
  for (let i = 0; i < quasis.length; i++) {
    result += quasis[i]?.value.raw ?? ''
    if (i < quasis.length - 1) {
      result += `{${i}}`
    }
  }
  return result
}

export function getExpressionSources(
  source: string,
  expressions: (Expression | Pattern | Super | null)[],
): string[] {
  return expressions.map((exp) => {
    if (exp == null || !('start' in exp) || !('end' in exp))
      return ''
    const { start, end } = exp as { start: number, end: number }
    return source.slice(start, end)
  })
}

export interface ProcessTemplateLiteralOptions {
  formatValue: (value: string) => string
  valueNeedExtract: (value: string) => boolean
  generateUniqueKey: (text: string) => string
  replaceValueFn: ReplaceValueFn
  textMap: Record<string, string>
  replacements: ReplacementItem[]
}

/**
 * 处理含插值的模板字符串：提取为 `{0}` 占位符并替换为 `$t('key', [expr...])`
 * @returns 是否已处理（true 表示已替换或无需提取；false 表示应回退为警告）
 */
export function processTemplateLiteralWithExpressions(
  templateLiteral: TemplateLiteral & { start: number, end: number },
  source: string,
  options: ProcessTemplateLiteralOptions,
): boolean {
  if (templateLiteral.expressions.length === 0) {
    return false
  }

  const value = buildI18nTextFromTemplateLiteral(templateLiteral.quasis)
  const text = options.formatValue(value)
  if (!options.valueNeedExtract(text)) {
    return true
  }

  const expressionSources = getExpressionSources(source, templateLiteral.expressions)
  if (expressionSources.includes('')) {
    return false
  }

  const key = options.generateUniqueKey(text)
  options.textMap[key] = text
  const replaceValue = options.replaceValueFn(key, expressionSources)
  options.replacements.push([templateLiteral.start, templateLiteral.end, replaceValue])
  return true
}
