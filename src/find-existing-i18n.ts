/** 匹配 this.$t('key')、$t('key')、t('key') 等已存在的 i18n 调用 */
const I18N_CALL_PATTERNS: RegExp[] = [
  /(?:this\.)?\$t\s*\(\s*['"]([^'"]+)['"]/g,
  /(?<![\w$.])\bt\s*\(\s*['"]([^'"]+)['"]/g,
]

/**
 * 从源码中查找已提取的 i18n 键（$t / t 调用），去重后按字母序返回
 */
export function findExistingI18nKeys(source: string): string[] {
  const keys = new Set<string>()

  for (const pattern of I18N_CALL_PATTERNS) {
    pattern.lastIndex = 0
    let match = pattern.exec(source)
    while (match !== null) {
      const key = match[1]
      if (key)
        keys.add(key)
      match = pattern.exec(source)
    }
  }

  return [...keys].sort()
}
