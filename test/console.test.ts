import { extractJs, extractJsx, extractVue } from '../src/index'

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

async function testConsoleIgnoreInJs() {
  const src = `
    const msg = '应该提取'
    console.log('不应提取')
    console.warn('也不应提取')
    console.error(\`模板也不应提取\`)
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes('应该提取'), '应提取普通字符串')
  assert(!extractedJson.includes('不应提取'), 'console.log 参数不应提取')
  assert(!extractedJson.includes('也不应提取'), 'console.warn 参数不应提取')
  assert(!extractedJson.includes('模板也不应提取'), 'console.error 模板参数不应提取')
  assert(result.output.includes('this.$t('), '输出应将普通字符串替换为 i18n 调用')
}

async function testBracketPropIgnore() {
  const src = `
    const keys = ['[modelValue]', '[inputValue]', '[marks]']
    const label = '用户可见文案'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('[modelValue]'), '[modelValue] 不应提取')
  assert(!extractedJson.includes('[inputValue]'), '[inputValue] 不应提取')
  assert(!extractedJson.includes('[marks]'), '[marks] 不应提取')
  assert(extractedJson.includes('用户可见文案'), '普通文案应提取')
}

async function testCodeExpressionAndSvgIgnore() {
  const src = `
    const a = mOffset + 1
    const b = actionBusy || !hasActiveBackuping
    const c = isSelected(w, true)
    const path = 'M2899,0 L2899,5786 L0,5786 L0,0 L2899,0 Z'
    const label = 'Bandwidth'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('mOffset'), '算术表达式不应提取')
  assert(!extractedJson.includes('isSelected'), '函数调用不应提取')
  assert(!extractedJson.includes('M2899,0'), 'SVG path 不应提取')
  assert(extractedJson.includes('Bandwidth'), '普通英文文案应提取')
}

async function testVueTemplateCodeIgnore() {
  const src = `<template>
  <svg><path d="M4 9l3 3 5-6" /></svg>
  <button :disabled="actionBusy || !hasActiveBackuping">{{ mOffset + 1 }}</button>
  <Comp :selected="isSelected(w, true)" />
  <span title="Bandwidth">可见文本</span>
</template>
<script setup></script>`
  const result = await extractVue(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)
  const output = result.output

  assert(!extractedJson.includes('M4 9l3'), 'SVG path d 不应提取')
  assert(!extractedJson.includes('isSelected'), ':selected 表达式不应整段提取')
  assert(!extractedJson.includes('actionBusy'), ':disabled 表达式不应提取')
  assert(!output.includes('mOffset + 1') || !extractedJson.includes('mOffset'), '插值表达式不应提取')
  assert(extractedJson.includes('可见文本'), '模板文本应提取')
  assert(extractedJson.includes('Bandwidth'), '静态属性文案应提取')
}

async function testPathLikeIgnore() {
  const src = `
    const route = '/aaa/bbb/SD/0/{0}'
    const rel = 'api/v1/users/{0}'
    const label = '用户可见文案'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('/aaa/bbb'), '绝对路径不应提取')
  assert(!extractedJson.includes('api/v1'), '相对路径不应提取')
  assert(extractedJson.includes('用户可见文案'), '普通文案应提取')
}

async function testTemplateLiteralWithInterpolation() {
  const src = `
    const connectingSubtitle = computed(() =>
      selectedNetwork.value ? \`连接至 \${selectedNetwork.value.ssid} 并检测\` : '',
    )
  `
  const result = await extractJs(src, 'app', 'ts')
  const extractedJson = JSON.stringify(result.extracted)
  const output = result.output

  assert(extractedJson.includes('连接至 {0} 并检测'), '应提取为 {0} 占位符文案')
  assert(output.includes("$t('app."), '应使用 $t 替换')
  assert(output.includes('selectedNetwork.value.ssid'), '应保留插值表达式')
  assert(!result.warnings.some(w => w.message.includes('模板字符串')), '不应再产生手动处理警告')
}

async function testConsoleIgnoreInJsx() {
  const src = `
    export function Demo() {
      const label = '页面标题'
      console.info('调试信息')
      return <div>{label}</div>
    }
  `
  const result = await extractJsx(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes('页面标题'), 'JSX 中文案应提取')
  assert(!extractedJson.includes('调试信息'), 'console.info 参数不应提取')
}

async function main() {
  await testConsoleIgnoreInJs()
  await testBracketPropIgnore()
  await testCodeExpressionAndSvgIgnore()
  await testVueTemplateCodeIgnore()
  await testPathLikeIgnore()
  await testTemplateLiteralWithInterpolation()
  await testConsoleIgnoreInJsx()
  console.log('extractor ignore rules tests passed')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
