export type FileType = 'vue' | 'js' | 'ts' | 'jsx' | 'tsx'

const FILE_TYPES: readonly FileType[] = ['vue', 'js', 'ts', 'jsx', 'tsx']

export function getFileType(filePath: string): FileType | null {
  const match = /\.([a-z]+)$/i.exec(filePath)
  const ext = match?.[1]?.toLowerCase()
  if (!ext)
    return null
  return FILE_TYPES.includes(ext as FileType) ? ext as FileType : null
}
