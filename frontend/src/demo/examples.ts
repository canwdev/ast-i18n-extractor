import type { FileType } from '../utils/fileTypeUtils'
import { getFileType } from '../utils/fileTypeUtils'

const demoSources = import.meta.glob('../../../test/demo/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const DEMO_FILE_ORDER = [
  'demo-js.js',
  'demo-ts.ts',
  'demo-jsx.jsx',
  'demo-tsx.tsx',
  'vue2.vue',
  'vue3.vue',
] as const

const DEMO_LABELS: Record<string, string> = {
  'demo-js.js': 'JavaScript — demo-js.js',
  'demo-ts.ts': 'TypeScript — demo-ts.ts',
  'demo-jsx.jsx': 'JSX — demo-jsx.jsx',
  'demo-tsx.tsx': 'TSX — demo-tsx.tsx',
  'vue2.vue': 'Vue 2 — vue2.vue',
  'vue3.vue': 'Vue 3 — vue3.vue',
}

export interface DemoExample {
  id: string
  label: string
  fileName: string
  fileType: FileType
  content: string
}

function pathToFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] ?? path
}

function buildExamples(): DemoExample[] {
  const examples: DemoExample[] = []

  for (const [path, content] of Object.entries(demoSources)) {
    const fileName = pathToFileName(path)
    const fileType = getFileType(fileName)
    if (!fileType)
      continue

    examples.push({
      id: fileName.replace(/\.[^.]+$/, ''),
      label: DEMO_LABELS[fileName] ?? fileName,
      fileName,
      fileType,
      content,
    })
  }

  return examples.sort((a, b) => {
    const ai = DEMO_FILE_ORDER.indexOf(a.fileName as (typeof DEMO_FILE_ORDER)[number])
    const bi = DEMO_FILE_ORDER.indexOf(b.fileName as (typeof DEMO_FILE_ORDER)[number])
    const orderA = ai === -1 ? 999 : ai
    const orderB = bi === -1 ? 999 : bi
    return orderA - orderB
  })
}

export const DEMO_EXAMPLES = buildExamples()

export const DEFAULT_DEMO = DEMO_EXAMPLES[0]

export function getDemoById(id: string): DemoExample | undefined {
  return DEMO_EXAMPLES.find(d => d.id === id)
}

export function getDemosByFileType(fileType: FileType): DemoExample[] {
  return DEMO_EXAMPLES.filter(d => d.fileType === fileType)
}
