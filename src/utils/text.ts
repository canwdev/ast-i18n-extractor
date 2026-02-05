export function formatValue(str: unknown): string {
  let s: string = typeof str === 'string' ? str : ''
  // 首尾字符必须相同
  if (s.charAt(0) === s.charAt(s.length - 1)) {
    // 移除首尾引号 ` | ' | "
    s = s.replace(/^['"`]+|['"`]+$/g, '')
  }
  return s
}

// 移除首尾括号
export function removeBrackets(str: string) {
  return str.replace(/^\(|\)$/g, '')
}
