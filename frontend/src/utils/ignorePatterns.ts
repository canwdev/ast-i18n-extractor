export interface ParsedIgnorePatterns {
  patterns: RegExp[]
  invalid: string[]
}

/** 解析逗号/换行分隔的正则，用于匹配文件路径或文件名 */
export function parseIgnorePatterns(input: string): ParsedIgnorePatterns {
  const patterns: RegExp[] = []
  const invalid: string[] = []
  const parts = input.split(/[\n,]/).map(s => s.trim()).filter(Boolean)

  for (const part of parts) {
    try {
      patterns.push(new RegExp(part))
    }
    catch {
      invalid.push(part)
    }
  }

  return { patterns, invalid }
}

export function shouldIgnoreFile(filePath: string, patterns: RegExp[]): boolean {
  if (patterns.length === 0)
    return false

  const normalized = filePath.replace(/\\/g, '/')
  const baseName = normalized.split('/').pop() ?? normalized

  return patterns.some(p => p.test(normalized) || p.test(baseName))
}
