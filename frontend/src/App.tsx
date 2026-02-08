import clsx from 'clsx'
import { Code, Scan, Settings, Split } from 'lucide-react'

import { useLocalStorage } from 'react-use'
import { CodeExtractor, Scanner } from './components'

function App() {
  const [activeView, setActiveView] = useLocalStorage<'extractor' | 'scanner'>('ast-i18n-active-view', 'extractor')
  const [keyPrefix, setKeyPrefix] = useLocalStorage<string>('ast-i18n-key-prefix', 'app')
  const [tPrefix, setTPrefix] = useLocalStorage<string>('ast-i18n-t-prefix', '')

  const VIEWS = [
    { id: 'extractor', label: 'Code Extractor', icon: Code },
    { id: 'scanner', label: 'Code Scanner', icon: Scan },
  ] as const

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <header className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg text-indigo-600 dark:text-indigo-400">
          <Split className="w-6 h-6" />
          <span>AST I18n Extractor</span>
        </div>
        <div className="ml-8 flex gap-1">
          {VIEWS.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                activeView === view.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <a href="https://github.com/canwdev/ast-i18n-extractor" target="_blank" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">
            Github
          </a>
        </div>
      </header>

      <div className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-6 bg-gray-50 dark:bg-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Config:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Key Prefix:</label>
          <input
            type="text"
            value={keyPrefix}
            onChange={e => setKeyPrefix(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">$t Prefix:</label>
          <input
            type="text"
            value={tPrefix}
            onChange={e => setTPrefix(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="keep default"
          />
        </div>
      </div>

      {activeView === 'extractor' && (
        <CodeExtractor
          keyPrefix={keyPrefix!}
          tPrefix={tPrefix!}
        />
      )}

      {activeView === 'scanner' && (
        <Scanner
          keyPrefix={keyPrefix!}
          tPrefix={tPrefix!}
        />
      )}
    </div>
  )
}

export default App
