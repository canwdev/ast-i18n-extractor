import type { FileType } from './CodeExtractor'
import Editor from '@monaco-editor/react'
import { extractJs, extractJsx, extractVue, VueLangExtractor } from 'ast-i18n-extractor'
import clsx from 'clsx'
import { merge } from 'lodash-es'
import { AlertCircle, CheckCircle, FileText, FolderOpen, Save, Scan, XCircle } from 'lucide-react'

import { useState } from 'react'

interface ScanResult {
  filePath: string
  status: 'success' | 'warning' | 'error'
  warnings: { message: string, value: string, key?: string }[]
  error?: string
  extracted: Record<string, string>
  output?: string
}

export interface ScannerProps {
  keyPrefix: string
  tPrefix: string
}

interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile: () => Promise<File>
  createWritable: () => Promise<FileSystemWritableFileStream>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory'
  values: () => AsyncIterable<FileSystemHandle>
  getDirectoryHandle: (name: string) => Promise<FileSystemDirectoryHandle>
  getFileHandle: (name: string) => Promise<FileSystemFileHandle>
}

declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string, accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    showOpenFilePicker?: (options: {
      types?: { description: string, accept: Record<string, string[]> }[]
      multiple?: boolean
    }) => Promise<FileSystemFileHandle[]>
  }
  interface FileSystemWritableFileStream {
    write: (data: string | BufferSource | Blob) => Promise<void>
    close: () => Promise<void>
  }
}

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.vue']

function getFileType(filePath: string): FileType | null {
  const ext = filePath.toLowerCase()
  if (ext.endsWith('.js'))
    return 'js'
  if (ext.endsWith('.ts'))
    return 'ts'
  if (ext.endsWith('.jsx'))
    return 'jsx'
  if (ext.endsWith('.tsx'))
    return 'tsx'
  if (ext.endsWith('.vue'))
    return 'vue'
  return null
}

export function Scanner({ keyPrefix, tPrefix }: ScannerProps) {
  const [jsonFilePath, setJsonFilePath] = useState<string>('')
  const [jsonFileHandle, setJsonFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [existingJson, setExistingJson] = useState<Record<string, string>>({})
  const [folderPath, setFolderPath] = useState<string>('')
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [extractedJson, setExtractedJson] = useState<string>('{}')
  const [activeTab, setActiveTab] = useState<'results' | 'json'>('results')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const selectJsonFile = async () => {
    if (!window.showOpenFilePicker) {
      return
    }
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] },
        }],
        multiple: false,
      })
      setJsonFilePath(fileHandle.name)
      setJsonFileHandle(fileHandle)
      const file = await fileHandle.getFile()
      const content = await file.text()
      try {
        const parsed = JSON.parse(content) as Record<string, string>
        setExistingJson(parsed)
      }
      catch {
        setExistingJson({})
      }
    }
    catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to open JSON file:', err)
      }
    }
  }

  const saveAllChanges = async () => {
    if (!dirHandle || scanResults.length === 0) {
      return
    }
    setIsSaving(true)
    try {
      for (const result of scanResults) {
        if (result.status === 'error') {
          continue
        }
        if (result.output === undefined) {
          continue
        }
        try {
          const parts = result.filePath.split('/')
          let currentDir: FileSystemDirectoryHandle = dirHandle
          for (let i = 0; i < parts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(parts[i])
          }
          const fileName = parts[parts.length - 1]
          const fileHandle = await currentDir.getFileHandle(fileName)
          const writable = await fileHandle.createWritable()
          await writable.write(result.output)
          await writable.close()
        }
        catch (err: unknown) {
          console.error(`Failed to save ${result.filePath}:`, err)
        }
      }
      if (jsonFileHandle) {
        try {
          const currentExtracted = JSON.parse(extractedJson) as Record<string, string>
          const merged = merge({}, existingJson, currentExtracted)
          const writable = await jsonFileHandle.createWritable()
          await writable.write(JSON.stringify(merged, null, 2))
          await writable.close()
          setExistingJson(merged)
        }
        catch (err: unknown) {
          console.error('Failed to save JSON file:', err)
        }
      }
      setToast({ message: 'All changes saved successfully!', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    }
    catch {
      setToast({ message: 'Failed to save changes', type: 'error' })
      setTimeout(() => setToast(null), 3000)
    }
    finally {
      setIsSaving(false)
    }
  }

  const scanDirectory = async (dirHandle: FileSystemDirectoryHandle) => {
    setIsScanning(true)
    setScanResults([])
    setDirHandle(dirHandle)
    const results: ScanResult[] = []
    const allExtracted: Record<string, string> = {}

    const vueLangEx = new VueLangExtractor(keyPrefix)
    const processEntry = async (entry: FileSystemHandle, path: string = '') => {
      if (entry.kind === 'directory') {
        const dirEntry = entry as FileSystemDirectoryHandle
        for await (const child of dirEntry.values()) {
          await processEntry(child, `${path}${entry.name}/`)
        }
      }
      else if (entry.kind === 'file') {
        const fileEntry = entry as FileSystemFileHandle
        const ext = entry.name.toLowerCase()
        const isSupported = SUPPORTED_EXTENSIONS.some(e => ext.endsWith(e))
        if (!isSupported)
          return

        const filePath = `${path}${entry.name}`
        const fileType = getFileType(entry.name)
        if (!fileType)
          return

        try {
          const file = await fileEntry.getFile()
          const content = await file.text()

          let result
          if (fileType === 'vue') {
            result = await extractVue(content, keyPrefix, tPrefix, vueLangEx)
          }
          else if (fileType === 'jsx' || fileType === 'tsx') {
            result = await extractJsx(content, keyPrefix, tPrefix, vueLangEx)
          }
          else {
            result = await extractJs(content, keyPrefix, fileType, tPrefix, vueLangEx)
          }

          const extracted = result.extracted ?? {}
          // 用lodash合并对象，避免覆盖
          merge(allExtracted, extracted)

          results.push({
            filePath,
            status: result.warnings?.length ? 'warning' : 'success',
            warnings: result.warnings ?? [],
            extracted,
            output: result.output,
          })
        }
        catch (err: unknown) {
          results.push({
            filePath,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            warnings: [],
            extracted: {},
          })
        }
      }
    }

    for await (const entry of dirHandle.values()) {
      await processEntry(entry)
    }

    setScanResults(results)
    setExtractedJson(JSON.stringify(allExtracted, null, 2))
    setIsScanning(false)
  }

  const selectFolder = () => {
    if (!window.showDirectoryPicker) {
      return
    }
    window.showDirectoryPicker()
      .then(async (dirHandle) => {
        setFolderPath(dirHandle.name)
        await scanDirectory(dirHandle)
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to select folder:', err)
        }
      })
  }

  const rescanFolder = async () => {
    if (!dirHandle)
      return
    await scanDirectory(dirHandle)
  }

  const getStatusIcon = (status: ScanResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const successCount = scanResults.filter(r => r.status === 'success').length
  const warningCount = scanResults.filter(r => r.status === 'warning').length
  const errorCount = scanResults.filter(r => r.status === 'error').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={selectFolder}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-4 h-4" />
            {folderPath
              ? (
                  <>
                    Scan:
                    {' '}
                    {folderPath}
                  </>
                )
              : (
                  'Select Folder to Scan'
                )}
          </button>

          <button
            onClick={() => { void selectJsonFile() }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            {jsonFilePath
              ? (
                  <>
                    JSON:
                    {' '}
                    {jsonFilePath}
                  </>
                )
              : (
                  'Open JSON File'
                )}
          </button>

          <button
            onClick={() => { void rescanFolder() }}
            disabled={!dirHandle || isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scan className="w-4 h-4" />
            Rescan Folder
          </button>

          <button
            onClick={() => { void saveAllChanges() }}
            disabled={isScanning || isSaving || scanResults.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>

          {isScanning && (
            <span className="flex items-center gap-2 text-sm text-indigo-500">
              <Scan className="w-4 h-4 animate-spin" />
              Scanning...
            </span>
          )}
        </div>

        {scanResults.length > 0 && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {successCount}
              {' '}
              success
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              {warningCount}
              {' '}
              warnings
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-500" />
              {errorCount}
              {' '}
              errors
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('results')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2',
                activeTab === 'results'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-600/50',
              )}
            >
              Scan Results
              {scanResults.length > 0 && (
                <span className={clsx(
                  'text-[10px] px-1.5 rounded-full ml-1',
                  activeTab === 'results'
                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
                )}
                >
                  {scanResults.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2',
                activeTab === 'json'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-600/50',
              )}
            >
              Extracted JSON
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-white dark:bg-gray-900 overflow-y-auto">
          {activeTab === 'results' && (
            <div className="p-4">
              {scanResults.length === 0
                ? (
                    <div className="text-gray-500 text-center mt-10">
                      Select a folder to start scanning
                    </div>
                  )
                : (
                    <ul className="space-y-2">
                      {scanResults.map(result => (
                        <li
                          key={result.filePath}
                          className={clsx(
                            'p-3 rounded-md border',
                            result.status === 'success' && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
                            result.status === 'warning' && 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
                            result.status === 'error' && 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <code className="text-sm font-mono">{result.filePath}</code>
                            <span className="text-xs text-gray-500 ml-auto">
                              {Object.keys(result.extracted).length}
                              {' '}
                              keys extracted
                            </span>
                          </div>
                          {result.warnings.length > 0 && (
                            <div className="mt-2 pl-6 space-y-1">
                              {result.warnings.map((w, index) => (
                                <div key={index} className="text-xs text-orange-700 dark:text-orange-400">
                                  ⚠️
                                  {' '}
                                  {w.message}
                                  : "
                                  {w.value}
                                  "
                                </div>
                              ))}
                            </div>
                          )}
                          {result.error !== undefined && result.error.length > 0 && (
                            <div className="mt-2 pl-6 text-xs text-red-700 dark:text-red-400">
                              ❌
                              {' '}
                              {result.error}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="h-full">
              <Editor
                height="100%"
                language="json"
                theme="vs-dark"
                value={extractedJson}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={clsx(
          'fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg text-white text-sm font-medium transition-all duration-300 transform',
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500',
        )}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
