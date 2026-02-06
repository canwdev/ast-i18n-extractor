import Editor from '@monaco-editor/react'
import { extractJs, extractVue } from 'ast-i18n-extractor'
import clsx from 'clsx'
import { AlertTriangle, Code, FileJson, Settings, Split } from 'lucide-react'
import { useState } from 'react'
import { useDebounce, useLocalStorage } from 'react-use'

type FileType = 'vue' | 'js' | 'ts'

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

function App() {
  const [inputCode, setInputCode] = useLocalStorage<string>('ast-i18n-input-code', TEMPLATES.js)
  const [fileType, setFileType] = useLocalStorage<FileType>('ast-i18n-file-type', 'js')
  const [keyPrefix, setKeyPrefix] = useLocalStorage<string>('ast-i18n-key-prefix', 'app')

  const [outputCode, setOutputCode] = useState<string>('')
  const [extractedMap, setExtractedMap] = useState<string>('{}')
  const [warnings, setWarnings] = useState<{ message: string, value: string, key?: string }[]>([])
  const [activeTab, setActiveTab] = useState<'code' | 'json' | 'warnings'>('code')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExtract = async (code: string, type: FileType, prefix: string) => {
    if (!code)
      return
    setIsProcessing(true)
    try {
      let result
      if (type === 'vue') {
        result = await extractVue(code, prefix)
      }
      else {
        result = await extractJs(code, prefix, type)
      }

      setOutputCode(result.output ?? '')
      setExtractedMap(JSON.stringify(result.extracted ?? {}, null, 2))
      setWarnings(result.warnings ?? [])
    }
    catch (error) {
      console.error('Extraction failed:', error)
      // Optionally show error in UI
    }
    finally {
      setIsProcessing(false)
    }
  }

  // Debounce input for extraction
  useDebounce(
    () => {
      void handleExtract(inputCode ?? '', fileType ?? 'js', keyPrefix ?? 'app')
    },
    800,
    [inputCode, fileType, keyPrefix],
  )

  const handleFileTypeChange = (newType: FileType) => {
    setFileType(newType)
    // Update default code when switching type
    setInputCode(TEMPLATES[newType])
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg text-indigo-600 dark:text-indigo-400">
          <Split className="w-6 h-6" />
          <span>AST I18n Extractor</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {/* <a href="https://github.com/your-repo" target="_blank" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">
            GitHub
          </a> */}
        </div>
      </header>

      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-6 bg-gray-50 dark:bg-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Config:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Type:</label>
          <select
            value={fileType}
            onChange={e => handleFileTypeChange(e.target.value as FileType)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="js">JavaScript (.js)</option>
            <option value="ts">TypeScript (.ts)</option>
            <option value="vue">Vue SFC (.vue)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Prefix:</label>
          <input
            type="text"
            value={keyPrefix}
            onChange={e => setKeyPrefix(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {isProcessing && (
          <span className="ml-auto text-sm text-indigo-500 flex items-center gap-1">
            Processing...
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 min-w-0">
          <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 shrink-0 justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4" />
              {' '}
              Input Source
            </span>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={fileType === 'vue' ? 'html' : fileType === 'ts' ? 'typescript' : 'javascript'}
              theme="vs-dark"
              value={inputCode ?? ''}
              onChange={val => setInputCode(val ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-2 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-1">
            <button
              onClick={() => setActiveTab('code')}
              className={clsx(
                'px-3 py-1 text-xs rounded-md flex items-center gap-2 transition-colors',
                activeTab === 'code' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400',
              )}
            >
              <Code className="w-4 h-4" />
              {' '}
              Result Code
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={clsx(
                'px-3 py-1 text-xs rounded-md flex items-center gap-2 transition-colors',
                activeTab === 'json' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400',
              )}
            >
              <FileJson className="w-4 h-4" />
              {' '}
              Extracted JSON
            </button>
            <button
              onClick={() => setActiveTab('warnings')}
              className={clsx(
                'px-3 py-1 text-xs rounded-md flex items-center gap-2 transition-colors',
                activeTab === 'warnings' ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-600 dark:text-orange-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400',
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              {' '}
              Warnings
              {warnings.length > 0 && (
                <span className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs px-1.5 rounded-full">
                  {warnings.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex-1 relative bg-white dark:bg-gray-900">
            <div className={clsx('h-full w-full', activeTab !== 'code' && 'hidden')}>
              <Editor
                height="100%"
                language={fileType === 'vue' ? 'html' : 'javascript'}
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
                        {warnings.map((w, i) => (
                          <li key={i} className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                            <div className="font-medium text-orange-800 dark:text-orange-300">{w.message}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Value:
                              <code className="bg-white dark:bg-gray-800 px-1 rounded">{w.value}</code>
                            </div>
                            {w.key! && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Key:
                                {w.key}
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
    </div>
  )
}

export default App
