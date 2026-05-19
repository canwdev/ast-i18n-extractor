import { parse } from 'acorn'

/** 是否包含典型 JS 运算符/语法（排除纯单词如 Sampletext） */
const CODE_OPERATOR_PATTERN = /[+\-*/%|&<>!]=?|&&|\|\||[?()[\]]|=>/

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

/** 是否像路径/路由，如 /aaa/bbb/ccc/0/{0} */
export function isPathLikeString(value: string): boolean {
  const v = value.trim()
  if (!v.includes('/'))
    return false
  // 绝对路径 /a/b/{0} 或相对路径 a/b/c
  return /^\/[\w/{}.:$-]+$/.test(v)
    || /^[\w.-]+(\/[\w.{}$-]+)+$/.test(v)
}

/** Vue 绑定表达式应走 extractJs 解析（仅提取字面量，不把整段当文案） */
export function shouldProcessBindingAsJs(value: string): boolean {
  const v = value.trim()
  return /^\{|\[/.test(v) || /^['"`]/.test(v) || looksLikeCodeExpression(v)
}
