import type { FileType } from 'ast-i18n-extractor'
import { getFileType } from 'ast-i18n-extractor'

export const EDITOR_LANGUAGES: Record<FileType, string> = {
  vue: 'html',
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
}

/**
 * 复用 getFileType 逻辑
 */
export function getLanguageFromPath(filePath: string): string {
  const type = getFileType(filePath)
  return type ? EDITOR_LANGUAGES[type] : 'plaintext'
}
