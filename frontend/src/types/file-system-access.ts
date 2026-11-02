/**
 * File System Access API 类型补充。
 *
 * Chromium 已实现、但 lib.dom 尚未收录 `showOpenFilePicker` 等入口；
 * 这里只声明项目实际用到的成员，避免在 .tsx 内重复声明。
 */

export interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile: () => Promise<File>
  createWritable: () => Promise<FileSystemWritableFileStream>
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory'
  values: () => AsyncIterable<FileSystemHandle>
  getDirectoryHandle: (name: string) => Promise<FileSystemDirectoryHandle>
  getFileHandle: (name: string) => Promise<FileSystemFileHandle>
}

declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: readonly { description: string, accept: Readonly<Record<string, readonly string[]>> }[]
    }) => Promise<FileSystemFileHandle>
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    showOpenFilePicker?: (options: {
      types?: readonly { description: string, accept: Readonly<Record<string, readonly string[]>> }[]
      multiple?: boolean
    }) => Promise<FileSystemFileHandle[]>
  }

  interface FileSystemWritableFileStream {
    write: (data: FileSystemWriteChunkType) => Promise<void>
    close: () => Promise<void>
  }
}
