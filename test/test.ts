/**
 * 示例即夹具：把 test/demo/ 下的示例文件复制到临时目录，用真实 CLI 跑一遍抽取，
 * 再按 test/demo-manifest.ts 的断言检查。前端「示例」下拉框加载的是同一批文件，
 * 因此这里通过 = 界面上展示的示例确实被工具正确处理。
 */
import type { DemoCase } from './demo-manifest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEMO_CASES } from './demo-manifest'

const basePath = __dirname
const rootDir = path.resolve(basePath, '..')
const cliPath = path.join(rootDir, 'src', 'cli.ts')
const outputDir = path.join(basePath, 'output')
const KEY_PREFIX = 'app'

let failures = 0

function assert(condition: boolean, message: string) {
  if (condition)
    return
  failures += 1
  console.error(`    ✗ ${message}`)
}

function flattenKeys(tree: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string')
      result[nextKey] = value
    else if (value && typeof value === 'object')
      Object.assign(result, flattenKeys(value as Record<string, unknown>, nextKey))
  }
  return result
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function runDemo(demo: DemoCase): void {
  const sourcePath = path.join(basePath, 'demo', demo.fileName)
  const ext = path.extname(demo.fileName)
  const name = path.basename(demo.fileName, ext)

  assert(fs.existsSync(sourcePath), `${demo.fileName} 不存在`)
  if (!fs.existsSync(sourcePath))
    return

  // 在副本上写回，示例源文件保持原始状态
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-i18n-demo-'))
  const targetPath = path.join(workDir, demo.fileName)
  fs.copyFileSync(sourcePath, targetPath)

  const langPath = path.join(workDir, 'lang.json')
  const warningsPath = path.join(workDir, 'warnings.json')
  const existingPath = path.join(workDir, 'existing.json')

  const { status, stderr } = spawnSync(process.execPath, [
    cliPath,
    targetPath,
    '--prefix',
    KEY_PREFIX,
    '--write',
    '--lang',
    langPath,
    '--warnings',
    warningsPath,
    '--existing-keys',
    existingPath,
  ], { cwd: rootDir, encoding: 'utf8' })

  assert(status === 0, `${demo.fileName} 抽取失败: ${stderr}`)
  if (status !== 0) {
    fs.rmSync(workDir, { recursive: true, force: true })
    return
  }

  const output = fs.readFileSync(targetPath, 'utf8')
  const messages = flattenKeys(readJson<Record<string, unknown>>(langPath))
  const warnings = readJson<{ message: string, value: string }[]>(warningsPath)
  const existingKeys = readJson<string[]>(existingPath)

  assert(warnings.length === 0, `${demo.fileName} 不应产生 warning: ${JSON.stringify(warnings)}`)

  for (const text of demo.replaced)
    assert(!output.includes(text), `${demo.fileName} 中「${text}」应已被替换`)

  for (const snippet of demo.kept)
    assert(output.includes(snippet), `${demo.fileName} 中「${snippet}」应原样保留`)

  for (const key of demo.existingKeys) {
    assert(existingKeys.includes(key), `${demo.fileName} 应识别已有 key ${key}`)
    assert(!Object.hasOwn(messages, key), `${demo.fileName} 不应重复生成已有 key ${key}`)
  }

  for (const [key, value] of Object.entries(demo.expectedMessages ?? {}))
    assert(messages[key] === value, `${demo.fileName} 的 ${key} 应为「${value}」，实际「${messages[key]}」`)

  assert(Object.keys(messages).length > 0, `${demo.fileName} 应至少抽取 1 条文案`)
  for (const [key, value] of Object.entries(messages))
    assert(value.trim().length > 0, `${demo.fileName} 的 key ${key} 值为空`)

  if (!fs.existsSync(outputDir))
    fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, `${name}-out${ext}`), output)
  fs.writeFileSync(path.join(outputDir, `${name}-lang.json`), JSON.stringify(messages, null, 2))
  fs.writeFileSync(path.join(outputDir, `${name}-warnings.json`), JSON.stringify(warnings, null, 2))

  console.log(
    `  ✓ ${demo.fileName}: ${Object.keys(messages).length} 条文案，`
    + `${demo.replaced.length} 处替换断言，${demo.kept.length} 处保留断言，`
    + `${demo.existingKeys.length} 个已有 key`,
  )

  fs.rmSync(workDir, { recursive: true, force: true })
}

function main() {
  console.log(`示例夹具 ${DEMO_CASES.length} 个，快照输出到 ${path.relative(rootDir, outputDir)}`)
  for (const demo of DEMO_CASES)
    runDemo(demo)

  if (failures > 0) {
    console.error(`\n${failures} 项断言失败`)
    process.exitCode = 1
    return
  }
  console.log('\n全部示例断言通过')
}

main()
