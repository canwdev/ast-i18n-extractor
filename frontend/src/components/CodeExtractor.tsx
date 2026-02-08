import type { Monaco } from '@monaco-editor/react'
import type { FileType } from '../utils/fileTypeUtils'
import Editor from '@monaco-editor/react'
import { extractJs, extractJsx, extractVue } from 'ast-i18n-extractor'
import clsx from 'clsx'
import { AlertTriangle, Code, FileJson } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebounce, useLocalStorage } from 'react-use'

export type { FileType } from '../utils/fileTypeUtils'

const TEMPLATES: Record<FileType, string> = {
  js: `// Write your code here
const a = '你好世界'
const b = "Hello World"
`,
  ts: `// Write your code here
interface User {
  name: string;
  role: 'admin' | 'user';
}

const user: User = {
  name: '张三',
  role: 'admin'
};

const title = '用户管理';
`,
  jsx: `// Write your JSX here
function App() {
  return (
    <div title="标题">
      <h1>你好，世界！</h1>
      <p>{'这是一个段落'}</p>
    </div>
  )
}
`,
  tsx: `// Write your TSX here
interface Props {
  name: string;
}

function Welcome({ name }: Props) {
  return (
    <div className="welcome" aria-label="欢迎">
      <h1>欢迎, {name}</h1>
      <button onClick={() => alert('点击了')}>点击我</button>
    </div>
  )
}
`,
  vue: `<template>
  <div>{{ '你好' }}</div>
</template>
<script>
export default {
  data() {
    return {
      msg: '世界'
    }
  }
}
</script>`,
}

const EDITOR_LANGUAGES: Record<FileType, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  vue: 'html',
}

export interface CodeExtractorProps {
  keyPrefix: string
  tPrefix: string
}

export function CodeExtractor({
  keyPrefix,
  tPrefix,
}: CodeExtractorProps) {
  const [fileType, setFileType] = useLocalStorage<FileType>('ast-i18n-file-type', 'js')
  const [inputCode, setInputCode] = useLocalStorage<string>('ast-i18n-input-code', TEMPLATES.js)
  const [outputCode, setOutputCode] = useState<string>('')
  const [extractedMap, setExtractedMap] = useState<string>('{}')
  const [warnings, setWarnings] = useState<{ message: string, value: string, key?: string }[]>([])
  const [activeTab, setActiveTab] = useState<'code' | 'json' | 'warnings'>('code')
  const [_isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setInputCode(TEMPLATES[fileType ?? 'js'])
  }, [fileType, setInputCode])

  const TABS = [
    { id: 'code', label: 'Result Code', icon: Code },
    { id: 'json', label: 'Extracted JSON', icon: FileJson },
    { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
  ] as const

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

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 min-w-0">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 shrink-0 justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4" />
            {' '}
            Input Source
          </span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Type:</label>
            <select
              value={fileType}
              onChange={e => setFileType(e.target.value as FileType)}
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
        <div className="flex-1 relative">
          <Editor
            key={fileType}
            height="100%"
            language={EDITOR_LANGUAGES[fileType ?? 'js']}
            theme="vs-dark"
            defaultPath={`file:///index.${fileType ?? 'js'}`}
            defaultValue={TEMPLATES[fileType ?? 'js']}
            onChange={val => setInputCode(val ?? '')}
            beforeMount={handleEditorWillMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 ">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
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
                {tab.id === 'warnings' && warnings.length > 0 && (
                  <span className={clsx(
                    'text-[10px] px-1.5 rounded-full ml-1',
                    activeTab === tab.id
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'
                      : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
                  )}
                  >
                    {warnings.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 relative bg-white dark:bg-gray-900">
          <div className={clsx('h-full w-full', activeTab !== 'code' && 'hidden')}>
            <Editor
              height="100%"
              language={EDITOR_LANGUAGES[fileType ?? 'js']}
              theme="vs-dark"
              value={outputCode}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
          <div className={clsx('h-full w-full', activeTab !== 'json' && 'hidden')}>
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
          <div className={clsx('h-full w-full', activeTab !== 'warnings' && 'hidden')}>
            <div className="p-4 overflow-auto h-full">
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
        </div>
      </div>
    </div>
  )
}
