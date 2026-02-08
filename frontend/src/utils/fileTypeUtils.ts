export type FileType = 'vue' | 'js' | 'ts' | 'jsx' | 'tsx'

export const EDITOR_LANGUAGES: Record<FileType, string> = {
  vue: 'vue',
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
}

/**
 * 极简版：正则提取后缀并查找映射
 */
export function getFileType(filePath: string): FileType | null {
  const ext = filePath.match(/\.([a-z]+)$/i)?.[1].toLowerCase()
  if (ext == null || ext === '') {
    return null
  }
  return (ext in EDITOR_LANGUAGES) ? ext as FileType : null
}

/**
 * 复用 getFileType 逻辑
 */
export function getLanguageFromPath(filePath: string): string {
  const type = getFileType(filePath)
  return type ? EDITOR_LANGUAGES[type] : 'plaintext'
}
