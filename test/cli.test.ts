import type { SpawnSyncReturns } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '..')
const cliPath = path.join(rootDir, 'src', 'cli.ts')

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

function runCli(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    encoding: 'utf8',
  })
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function testCli() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-i18n-cli-'))
  const sourceDir = path.join(workDir, 'src')
  const langFile = path.join(workDir, 'out', 'lang.json')
  const warningsFile = path.join(workDir, 'out', 'warnings.json')
  const existingKeysFile = path.join(workDir, 'out', 'existing-keys.json')

  fs.mkdirSync(sourceDir, { recursive: true })
  fs.mkdirSync(path.join(sourceDir, 'node_modules'), { recursive: true })

  const pagePath = path.join(sourceDir, 'page.ts')
  const ignoredTestPath = path.join(sourceDir, 'skip.test.ts')
  const ignoredDependencyPath = path.join(sourceDir, 'node_modules', 'dep.ts')
  const originalPage = `export const title = '页面标题文案'\nconst label = $t('existing.key')\n`
  const ignoredSource = `export const title = '不应提取'\n`

  fs.writeFileSync(pagePath, originalPage)
  fs.writeFileSync(ignoredTestPath, ignoredSource)
  fs.writeFileSync(ignoredDependencyPath, ignoredSource)

  const args = [
    sourceDir,
    '--prefix',
    'app',
    '--lang',
    langFile,
    '--warnings',
    warningsFile,
    '--existing-keys',
    existingKeysFile,
  ]

  const dryRun = runCli(args)
  assert(dryRun.status === 0, `dry run 应成功退出: ${dryRun.stderr}`)
  assert(fs.readFileSync(pagePath, 'utf8') === originalPage, 'dry run 不应修改源文件')
  assert(dryRun.stdout.includes('1 file(s) changed'), 'dry run 应报告 1 个变更文件')
  assert(fs.readFileSync(ignoredTestPath, 'utf8') === ignoredSource, '默认应忽略 .test. 文件')
  assert(fs.readFileSync(ignoredDependencyPath, 'utf8') === ignoredSource, '默认应忽略 node_modules')

  const lang = readJson(langFile) as { app: Record<string, string> }
  assert(lang.app.ye_mian_biao_ti_wen_an === '页面标题文案', '语言包应包含提取文案')
  const warnings = readJson(warningsFile)
  assert(Array.isArray(warnings) && warnings.length === 0, 'warnings 应为空数组')
  const existingKeys = readJson(existingKeysFile) as string[]
  assert(existingKeys.includes('existing.key'), '应导出已有 i18n key')

  const writeRun = runCli([...args, '--write'])
  assert(writeRun.status === 0, `写入模式应成功退出: ${writeRun.stderr}`)
  const writtenPage = fs.readFileSync(pagePath, 'utf8')
  assert(writtenPage.includes(`$t('app.ye_mian_biao_ti_wen_an')`), '写入模式应替换文案')
  assert(writtenPage.includes(`$t('existing.key')`), '已有 i18n 调用应保留')

  const secondRun = runCli(args)
  assert(secondRun.status === 0, `重复运行应成功退出: ${secondRun.stderr}`)
  assert(secondRun.stdout.includes('0 file(s) changed'), '重复运行不应再次修改文件')

  fs.rmSync(workDir, { recursive: true, force: true })
}

testCli()
console.log('cli tests passed')

function testFidelityAndRules() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-i18n-rules-'))
  const vuePath = path.join(workDir, 'Page.vue')
  const langFile = path.join(workDir, 'lang.json')
  const reportFile = path.join(workDir, 'report.json')

  const source = `<template>
  <div>
    <p>Step 1</p>
    <p>Step 2</p>
    <p>Step 3</p>
    <p>Option 1</p>
    <p>Option 2</p>
    <p>3 Items</p>
    <p>2 Items</p>
    <p>1234x567</p>
    <p>ABC-123</p>
    <p>XYZ-42</p>
    <p>1.5 kg</p>
    <p>Vendor One</p>
  </div>
</template>

<script>
export default {
  name: 'DemoPage',
  computed: {
    text() {
      return 'Vendor Two'.replace(/^x/, 'Fallback text ')
    },
  },
  methods: {
    run() {
      return error({ message: 'Page not found' })
    },
  },
}
</script>
`
  // CRLF + 末尾换行：写盘后必须原样保留
  fs.writeFileSync(vuePath, source.replace(/\n/g, '\r\n'))

  const args = [
    workDir,
    '--prefix',
    'page',
    '--lang',
    langFile,
    '--report',
    reportFile,
    '--ignore-value',
    '^Vendor ',
  ]
  const run = runCli([...args, '--write'])
  assert(run.status === 0, `extract 应成功: ${run.stderr}`)

  const written = fs.readFileSync(vuePath, 'utf8')
  assert(written.includes('\r\n  <div>\r\n'), 'template 缩进应保持原样')
  assert(written.endsWith('\r\n'), '文件末尾换行应保留')
  assert(!written.includes('\r\n<div>'), 'template 不应被 deindent')
  assert(written.includes("$t('page.step', [1])"), 'Step 1 应合并为插值调用')
  assert(written.includes("$t('page.step', [3])"), 'Step 3 应合并为插值调用')
  assert(written.includes("$t('page.option', [2])"), 'Option 应合并为插值调用')
  assert(written.includes("$t('page.items', [3])"), '3 Items 应合并为插值调用')
  assert(written.includes("$t('page.items', [2])"), '2 Items 应合并为插值调用')
  assert(written.includes('<p>1234x567</p>'), '纯技术用语应写死')
  assert(written.includes('<p>ABC-123</p>'), '纯技术用语应写死')
  assert(written.includes('<p>XYZ-42</p>'), '纯技术用语应写死')
  assert(written.includes('<p>1.5 kg</p>'), '纯技术用语应写死')
  assert(written.includes("<p>Vendor One</p>"), '--ignore-value 命中的值应写死')
  assert(written.includes("name: 'DemoPage'"), '组件 name 不应被抽取')
  assert(written.includes("'Fallback text '"), 'replace 第二参数不应被抽取')
  assert(written.includes('Page not found'), 'error() 参数不应被抽取')

  const lang = readJson(langFile) as { page: Record<string, string> }
  assert(lang.page.step === 'Step {0}', '数字变体语言包应为 {0} 模板')
  assert(lang.page.option === 'Option {0}', 'Option 应为 {0} 模板')
  assert(lang.page.items === '{0} Items', 'Items 应为 {0} 模板')
  assert(!('n_3_items' in lang.page), '数字变体不应再拆成独立 key')
  assert(!Object.keys(lang.page).some(key => key.includes('1234')), '纯技术用语不应进语言包')

  const report = readJson(reportFile) as { variants: unknown[] }
  assert(Array.isArray(report.variants) && report.variants.length > 0, 'report 应包含数字变体')

  const secondRun = runCli(args)
  assert(secondRun.status === 0, `重复运行应成功: ${secondRun.stderr}`)
  assert(secondRun.stdout.includes('0 file(s) changed'), '重复运行不应再次修改文件')

  const check = runCli([workDir, '--prefix', 'page', '--check', langFile])
  assert(check.status === 0, `check 应通过: ${check.stderr}`)
  assert(check.stdout.includes('0 missing, 0 orphan'), 'check 应报告 0 missing / 0 orphan')

  fs.rmSync(workDir, { recursive: true, force: true })
}

testFidelityAndRules()
console.log('fidelity & rules tests passed')
