import { parse } from 'acorn'

/** 是否包含典型 JS 运算符/语法（排除纯单词如 Sampletext） */
const CODE_OPERATOR_PATTERN = /[+\-*/%|&<>!]=?|&&|\|\||[?()[\]]|=>/

const SKIP_SUBTREE_TAGS = new Set(['svg', 'code', 'pre', 'style'])

/** 是否像 JS 表达式（如 mOffset + 1、isSelected(w, true)） */
export function looksLikeCodeExpression(value: string): boolean {
  const v = value.trim()
  if (!CODE_OPERATOR_PATTERN.test(v))
    return false
  try {
    parse(`(${v})`, { ecmaVersion: 2020 })
    return true
  }
  catch {
    return false
  }
}

/** 是否像 SVG path 的 d 属性值 */
export function isSvgPathData(value: string): boolean {
  const v = value.trim()
  if (!/^M/i.test(v))
    return false
  return /^[MLHVCSQTAZ0-9\s,.+-]+$/i.test(v)
}

/** 是否为日期/时间格式占位串，如 YYYY-MM-DD HH:mm:ss */
export function isDateTimeFormatPattern(value: string): boolean {
  const v = value.trim()
  if (!/YYYY|YY|MM|DD|HH|mm|ss|SSS/.test(v))
    return false
  if (!/^[YMDHdhmsS:\-./\s]+$/.test(v))
    return false
  return /YYYY|YY/.test(v) || (/MM/.test(v) && /DD/.test(v))
}

/** 是否跳过整棵子树（不扫描子节点文案） */
export function isSkipSubtreeTag(tag: string): boolean {
  return SKIP_SUBTREE_TAGS.has(tag.toLowerCase())
}

/** @deprecated 使用 isSkipSubtreeTag */
export function isSvgElementTag(tag: string): boolean {
  return tag.toLowerCase() === 'svg'
}

/** 是否像 CSS 颜色/尺寸/函数值 */
export function isCssLikeValue(value: string): boolean {
  const v = value.trim()
  if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(v))
    return true
  if (/^(?:rgb|rgba|hsl|hsla|calc|var)\(/i.test(v))
    return true
  if (/^-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|pc|in|cm|mm|s|ms)$/i.test(v))
    return true
  return false
}

/** 是否像语义化版本号 */
export function isVersionString(value: string): boolean {
  return /^v?\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]*)?$/i.test(value.trim())
}

/** 是否像 locale，如 zh-CN、en_US（不含单独 en） */
export function isLocaleCode(value: string): boolean {
  return /^[a-z]{2}[-_][A-Za-z]{2,4}$/.test(value.trim())
}

/** 是否像 UUID 或长 hex 哈希 */
export function isUuidOrHash(value: string): boolean {
  const v = value.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))
    return true
  return /^[0-9a-f]{32,}$/i.test(v)
}

/** 是否像 MIME 或文件扩展名 */
export function isMimeOrExtension(value: string): boolean {
  const v = value.trim()
  if (/^[\w.-]+\/[\w.+-]+$/.test(v))
    return true
  return /^\.[a-z0-9]+$/i.test(v)
}

/** 是否像正则字面量字符串，如 /^\\d+$/ */
export function isRegexLiteralString(value: string): boolean {
  const v = value.trim()
  if (!v.startsWith('/') || v.length < 3)
    return false
  const lastSlash = v.lastIndexOf('/')
  if (lastSlash <= 0)
    return false
  return /^[dgimsuvy]*$/.test(v.slice(lastSlash + 1))
}

/** 是否像 i18n key（app.home.title） */
export function isI18nKeyLike(value: string): boolean {
  const v = value.trim()
  if (v.includes(' ') || !v.includes('.'))
    return false
  return /^[\w-]+(?:\.[\w-]+)+$/.test(v)
}

/** 是否像路径/路由，如 /aaa/bbb/ccc/0/{0} */
export function isPathLikeString(value: string): boolean {
  const v = value.trim()
  if (!v.includes('/'))
    return false
  return /^\/[\w/{}.:$-]+$/.test(v)
    || /^[\w.-]+(\/[\w.{}$-]+)+$/.test(v)
}

/** Vue 绑定表达式应走 extractJs 解析（仅提取字面量，不把整段当文案） */
export function shouldProcessBindingAsJs(value: string): boolean {
  const v = value.trim()
  return /^\{|\[/.test(v) || /^['"`]/.test(v) || looksLikeCodeExpression(v)
}
