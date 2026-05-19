import type { DiffOnMount, Monaco } from '@monaco-editor/react'
import type { FileType } from '../utils/fileTypeUtils'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { extractJs, extractJsx, extractVue, findExistingI18nKeys } from 'ast-i18n-extractor'
import clsx from 'clsx'
import { AlertTriangle, Code, FileJson, List } from 'lucide-react'
import { useState } from 'react'
import { useDebounce, useLocalStorage } from 'react-use'
import {
  DEFAULT_DEMO,
  DEMO_EXAMPLES,
  getDemoById,
  getDemosByFileType,
} from '../demo/examples'
import { EDITOR_LANGUAGES } from '../utils/fileTypeUtils'

export type { FileType } from '../utils/fileTypeUtils'

function countExtractedLeaves(obj: unknown): number {
  if (!obj || typeof obj !== 'object')
    return 0
  return Object.values(obj as Record<string, unknown>).reduce<number>((sum, v) => {
    if (typeof v === 'string')
      return sum + 1
    if (v && typeof v === 'object')
      return sum + countExtractedLeaves(v)
    return sum
  }, 0)
}

export interface CodeExtractorProps {
  keyPrefix: string
  tPrefix: string
}

export function CodeExtractor({
  keyPrefix,
  tPrefix,
}: CodeExtractorProps) {
  const [selectedDemoId, setSelectedDemoId] = useLocalStorage<string>(
    'ast-i18n-demo-id',
    DEFAULT_DEMO?.id ?? 'demo-js',
  )
  const initialDemo = getDemoById(selectedDemoId ?? '') ?? DEFAULT_DEMO
  const [fileType, setFileType] = useLocalStorage<FileType>(
    'ast-i18n-file-type',
    initialDemo?.fileType ?? 'js',
  )
  const [inputCode, setInputCode] = useLocalStorage<string>(
    'ast-i18n-input-code',
    initialDemo?.content ?? '',
  )
  const [outputCode, setOutputCode] = useState<string>('')
  const [extractedMap, setExtractedMap] = useState<string>('{}')
  const [warnings, setWarnings] = useState<{ message: string, value: string, key?: string }[]>([])
  const [activeTab, setActiveTab] = useState<'code' | 'json' | 'warnings' | 'existed'>('code')
  const [existedI18nKeys, setExistedI18nKeys] = useState<string[]>([])
  const [_isProcessing, setIsProcessing] = useState(false)

  const extractedCount = (() => {
    try {
      return countExtractedLeaves(JSON.parse(extractedMap) as unknown)
    }
    catch {
      return 0
    }
  })()

  const applyDemo = (demoId: string) => {
    const demo = getDemoById(demoId)
    if (!demo)
      return
    setSelectedDemoId(demo.id)
    setFileType(demo.fileType)
    setInputCode(demo.content)
  }

  const handleFileTypeChange = (type: FileType) => {
    setFileType(type)
    const current = getDemoById(selectedDemoId ?? '')
    if (current?.fileType === type)
      return
    const fallback = getDemosByFileType(type)[0]
    if (fallback)
      applyDemo(fallback.id)
  }

  const TABS = [
    { id: 'code', label: 'Result Code', icon: Code },
    { id: 'json', label: `Extracted JSON (${extractedCount})`, icon: FileJson },
    { id: 'warnings', label: `Warnings (${warnings.length})`, icon: AlertTriangle },
    { id: 'existed', label: `Existed Keys Before (${existedI18nKeys.length})`, icon: List },
  ] as const

  const editorLanguage = EDITOR_LANGUAGES[fileType ?? 'js']
  const modelPath = `file:///${getDemoById(selectedDemoId ?? '')?.fileName ?? `index.${fileType ?? 'js'}`}`

  const handleDiffMount: DiffOnMount = (diffEditor) => {
    diffEditor.getOriginalEditor().updateOptions({ readOnly: false })
    diffEditor.getModifiedEditor().updateOptions({ readOnly: true })
    diffEditor.getOriginalEditor().onDidChangeModelContent(() => {
      setInputCode(diffEditor.getOriginalEditor().getValue())
    })
  }

  const handleExtract = async (code: string, type: FileType, prefix: string, tPrefixVal?: string) => {
    if (!code)
      return
    setIsProcessing(true)
    try {
      let result
      if (type === 'vue') {
        result = await extractVue(code, prefix, tPrefixVal)
      }
      else if (type === 'jsx' || type === 'tsx') {
        result = await extractJsx(code, prefix, tPrefixVal)
      }
      else {
        result = await extractJs(code, prefix, type, tPrefixVal)
      }

      setOutputCode(result.output ?? '')
      setExtractedMap(JSON.stringify(result.extracted ?? {}, null, 2))
      setWarnings(result.warnings ?? [])
      setExistedI18nKeys(findExistingI18nKeys(code))
    }
    catch (error) {
      console.error('Extraction failed:', error)
    }
    finally {
      setIsProcessing(false)
    }
  }

  useDebounce(
    () => {
      void handleExtract(inputCode ?? '', fileType ?? 'js', keyPrefix, tPrefix)
    },
    800,
    [inputCode, fileType, keyPrefix, tPrefix],
  )

  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2874,
        2686,
      ],
    })

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    })

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2874,
        2686,
      ],
    })
  }

  const diffEditor = (
    <DiffEditor
      key={selectedDemoId}
      height="100%"
      language={editorLanguage}
      theme="vs-dark"
      original={inputCode ?? ''}
      modified={outputCode}
      originalModelPath={modelPath}
      modifiedModelPath={`${modelPath}.out`}
      beforeMount={handleEditorWillMount}
      onMount={handleDiffMount}
      options={{
        renderSideBySide: true,
        readOnly: false,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        folding: true,
        lineNumbersMinChars: 3,
      }}
    />
  )

  const showSidePanel = activeTab !== 'code'

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div className="flex flex-row h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex-1 flex items-center px-2 justify-between min-w-0">
          <span className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4" />
            {' '}
            Source vs Result
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label className="text-sm text-gray-500">Example:</label>
            <select
              value={selectedDemoId}
              onChange={e => applyDemo(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm max-w-[14rem] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEMO_EXAMPLES.map(demo => (
                <option key={demo.id} value={demo.id}>
                  {demo.label}
                </option>
              ))}
            </select>
            <label className="text-sm text-gray-500">Type:</label>
            <select
              value={fileType}
              onChange={e => handleFileTypeChange(e.target.value as FileType)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="js">JavaScript (.js)</option>
              <option value="ts">TypeScript (.ts)</option>
              <option value="jsx">React (.jsx)</option>
              <option value="tsx">React TS (.tsx)</option>
              <option value="vue">Vue SFC (.vue)</option>
            </select>
          </div>
        </div>

        <div
          className="w-px shrink-0 bg-gray-200 dark:bg-gray-700"
          aria-hidden
        />

        <div className="flex-1 flex items-center px-2 min-w-0">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-600/50',
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div
          className={clsx(
            'flex flex-col min-h-0 min-w-0',
            showSidePanel ? 'flex-1 border-r border-gray-200 dark:border-gray-800' : 'flex-1 w-full',
          )}
        >
          <div className="flex-1 relative min-h-0">
            {diffEditor}
          </div>
        </div>

        {showSidePanel && (
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
            <div className={clsx('flex-1 min-h-0', activeTab !== 'json' && 'hidden')}>
              <Editor
                height="100%"
                language="json"
                theme="vs-dark"
                value={extractedMap}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            <div className={clsx('flex-1 min-h-0 overflow-auto', activeTab !== 'warnings' && 'hidden')}>
              <div className="p-4">
                {warnings.length === 0
                  ? (
                      <div className="text-gray-500 text-center mt-10">No warnings</div>
                    )
                  : (
                      <ul className="space-y-3">
                        {warnings.map(w => (
                          <li key={`${w.message}-${w.value}`} className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md flex flex-col gap-1">
                            <div className="font-medium text-orange-800 dark:text-orange-300">{w.message}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex gap-2">
                              Value:
                              <code className="bg-white dark:bg-gray-800 px-1 rounded">{w.value}</code>
                            </div>
                            {w.key && w.key.length > 0 && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                                Key:
                                <code className="bg-white dark:bg-gray-800 px-1 rounded">{w.key}</code>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
              </div>
            </div>
            <div className={clsx('flex-1 min-h-0 overflow-auto', activeTab !== 'existed' && 'hidden')}>
              <div className="p-4">
                {!inputCode?.trim()
                  ? (
                      <div className="text-gray-500 text-center mt-10">Enter code to scan</div>
                    )
                  : existedI18nKeys.length === 0
                    ? (
                        <div className="text-gray-500 text-center mt-10">
                          No existing $t() or t() calls found
                        </div>
                      )
                    : (
                        <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {existedI18nKeys.join('\n')}
                        </pre>
                      )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
