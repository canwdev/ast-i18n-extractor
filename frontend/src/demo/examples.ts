import type { FileType } from 'ast-i18n-extractor'
import { getFileType } from 'ast-i18n-extractor'
// 示例清单与测试共用一份定义：test/demo/ 下的文件既是界面示例，也是测试夹具
import { DEMO_CASES } from '../../../test/demo-manifest'

const demoSources = import.meta.glob('../../../test/demo/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

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
  const contentByFileName = new Map<string, string>()
  for (const [path, content] of Object.entries(demoSources))
    contentByFileName.set(pathToFileName(path), content)

  const examples: DemoExample[] = []
  for (const demo of DEMO_CASES) {
    const content = contentByFileName.get(demo.fileName)
    const fileType = getFileType(demo.fileName)
    if (content === undefined || !fileType)
      continue

    examples.push({
      id: demo.fileName.replace(/\.[^.]+$/, ''),
      label: demo.label,
      fileName: demo.fileName,
      fileType,
      content,
    })
  }
  return examples
}

export const DEMO_EXAMPLES = buildExamples()

export const DEFAULT_DEMO = DEMO_EXAMPLES[0]

export function getDemoById(id: string): DemoExample | undefined {
  return DEMO_EXAMPLES.find(d => d.id === id)
}

export function getDemosByFileType(fileType: FileType): DemoExample[] {
  return DEMO_EXAMPLES.filter(d => d.fileType === fileType)
}
