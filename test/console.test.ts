import { extractJs, extractJsx, extractVue } from '../src/index'
import { TEXT } from './fixtures/text'

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

async function testConsoleIgnoreInJs() {
  const src = `
    const msg = '${TEXT.toExtract}'
    console.log('${TEXT.skipConsole1}')
    console.warn('${TEXT.skipConsole2}')
    console.error(\`${TEXT.skipConsoleTpl}\`)
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.toExtract), '应提取普通字符串')
  assert(!extractedJson.includes(TEXT.skipConsole1), 'console.log 参数不应提取')
  assert(!extractedJson.includes(TEXT.skipConsole2), 'console.warn 参数不应提取')
  assert(!extractedJson.includes(TEXT.skipConsoleTpl), 'console.error 模板参数不应提取')
  assert(result.output.includes('this.$t('), '输出应将普通字符串替换为 i18n 调用')
}

async function testBracketPropIgnore() {
  const src = `
    const keys = ['[modelValue]', '[inputValue]', '[marks]']
    const label = '${TEXT.visibleLabel}'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('[modelValue]'), '[modelValue] 不应提取')
  assert(!extractedJson.includes('[inputValue]'), '[inputValue] 不应提取')
  assert(!extractedJson.includes('[marks]'), '[marks] 不应提取')
  assert(extractedJson.includes(TEXT.visibleLabel), '普通文案应提取')
}

async function testCodeExpressionAndSvgIgnore() {
  const src = `
    const a = mOffset + 1
    const b = actionBusy || !hasActiveBackuping
    const c = isSelected(w, true)
    const path = 'M2899,0 L2899,5786 L0,5786 L0,0 L2899,0 Z'
    const label = '${TEXT.sampleEn}'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('mOffset'), '算术表达式不应提取')
  assert(!extractedJson.includes('isSelected'), '函数调用不应提取')
  assert(!extractedJson.includes('M2899,0'), 'SVG path 不应提取')
  assert(extractedJson.includes(TEXT.sampleEn), '普通英文文案应提取')
}

async function testVueTemplateCodeIgnore() {
  const src = `<template>
  <svg><path d="M4 9l3 3 5-6" /></svg>
  <button :disabled="actionBusy || !hasActiveBackuping">{{ mOffset + 1 }}</button>
  <Comp :selected="isSelected(w, true)" />
  <component :is="'动态组件名'" is="StaticComp" />
  <span title="${TEXT.sampleEn}">${TEXT.visibleText}</span>
</template>
<script setup></script>`
  const result = await extractVue(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)
  const output = result.output

  assert(!extractedJson.includes('M4 9l3'), 'SVG path d 不应提取')
  assert(!extractedJson.includes('isSelected'), ':selected 表达式不应整段提取')
  assert(!extractedJson.includes('actionBusy'), ':disabled 表达式不应提取')
  assert(!extractedJson.includes('动态组件名'), ':is 绑定值不应提取')
  assert(!extractedJson.includes('StaticComp'), 'is 属性值不应提取')
  assert(!output.includes('mOffset + 1') || !extractedJson.includes('mOffset'), '插值表达式不应提取')
  assert(extractedJson.includes(TEXT.visibleText), '模板文本应提取')
  assert(extractedJson.includes(TEXT.sampleEn), '静态属性文案应提取')
}

async function testIfElseBranchExtraction() {
  const src = `
    if (code === 1) {
      if (filesData.length === 1) {
        window.$toast.info('${TEXT.msgIf}')
      } else {
        window.$toast.info('${TEXT.msgElse}')
      }
    } else {
      window.$toast.success('${TEXT.msgOuterElse}')
    }
  `
  const result = await extractJs(src, 'app', 'ts')
  const extractedJson = JSON.stringify(result.extracted)
  const output = result.output

  assert(extractedJson.includes(TEXT.msgIf), 'if 分支文案应提取')
  assert(extractedJson.includes(TEXT.msgElse), 'else 分支文案应提取')
  assert(extractedJson.includes(TEXT.msgOuterElse), '外层 else 文案应提取')
  assert(output.includes("$t('app."), '应替换为 $t')
  assert(!output.includes(TEXT.msgElse), 'else 分支应完成替换')
  assert(!output.includes(TEXT.msgOuterElse), '外层 else 应完成替换')
}

async function testPathLikeIgnore() {
  const src = `
    const route = '/aaa/bbb/SD/0/{0}'
    const rel = 'api/v1/users/{0}'
    const label = '${TEXT.visibleLabel}'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('/aaa/bbb'), '绝对路径不应提取')
  assert(!extractedJson.includes('api/v1'), '相对路径不应提取')
  assert(extractedJson.includes(TEXT.visibleLabel), '普通文案应提取')
}

async function testTemplateLiteralWithInterpolation() {
  const src = `
    const connectingSubtitle = computed(() =>
      selectedNetwork.value ? \`绑定至 \${selectedNetwork.value.ssid} 并完成检查\` : '',
    )
  `
  const result = await extractJs(src, 'app', 'ts')
  const extractedJson = JSON.stringify(result.extracted)
  const output = result.output

  assert(extractedJson.includes(TEXT.tplI18n), '应提取为 {0} 占位符文案')
  assert(output.includes("$t('app."), '应使用 $t 替换')
  assert(output.includes('selectedNetwork.value.ssid'), '应保留插值表达式')
  assert(!result.warnings.some(w => w.message.includes('模板字符串')), '不应再产生手动处理警告')
}

async function testLoggerIgnore() {
  const src = `
    const msg = '${TEXT.toExtract}'
    logger.log('${TEXT.skipConsole1}')
    logger.debug('${TEXT.skipConsole2}')
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.toExtract), '普通文案应提取')
  assert(!extractedJson.includes(TEXT.skipConsole1), 'logger.log 参数不应提取')
  assert(!extractedJson.includes(TEXT.skipConsole2), 'logger.debug 参数不应提取')
}

async function testCustomLogObjects() {
  const src = `
    const msg = '${TEXT.toExtract}'
    diag.trace('${TEXT.skipConsole1}')
    console.log('${TEXT.skipConsole2}')
  `
  const result = await extractJs(src, 'app', 'js', undefined, undefined, {
    logObjects: ['diag'],
  })
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.toExtract), '普通文案应提取')
  assert(!extractedJson.includes(TEXT.skipConsole1), '自定义 diag 应跳过')
  assert(extractedJson.includes(TEXT.skipConsole2), '未列入 logObjects 的 console 应提取')
}

async function testDateTimeFormatIgnore() {
  const src = `
    const fmt = 'YYYY-MM-DD HH:mm:ss'
    const label = '${TEXT.visibleLabel}'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('YYYY-MM-DD'), '时间格式串不应提取')
  assert(extractedJson.includes(TEXT.visibleLabel), '普通文案应提取')
}

async function testVueSvgSubtreeIgnore() {
  const src = `<template>
  <div>${TEXT.visibleText}</div>
  <svg viewBox="0 0 30 30">
    <title>形状备份</title>
    <g id="页面-1">
      <text>不应提取的文案</text>
    </g>
  </svg>
</template>
<script setup></script>`
  const result = await extractVue(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.visibleText), 'svg 外文案应提取')
  assert(!extractedJson.includes('形状备份'), 'svg 内 title 不应提取')
  assert(!extractedJson.includes('不应提取的文案'), 'svg 子元素文本不应提取')
  assert(!extractedJson.includes('页面-1'), 'svg 内 id 文案不应提取')
}

async function testTechnicalStringIgnore() {
  const src = `
    const color = '#ff5500'
    const gradient = 'linear-gradient(90deg, #D2FAFF 0%, #97C9EA 50%, #669BD7 100%)'
    const radial = 'radial-gradient(circle, #fff 0%, #000 100%)'
    const ver = 'v1.2.3'
    const loc = 'zh-CN'
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const mime = 'image/png'
    const ext = '.json'
    const re = '/^\\\\d+$/'
    const i18nKey = 'app.home.title'
    const label = '${TEXT.visibleLabel}'
  `
  const result = await extractJs(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('#ff5500'), '颜色不应提取')
  assert(!extractedJson.includes('linear-gradient'), 'linear-gradient 不应提取')
  assert(!extractedJson.includes('radial-gradient'), 'radial-gradient 不应提取')
  assert(!extractedJson.includes('#D2FAFF'), 'gradient 内颜色不应提取')
  assert(!extractedJson.includes('v1.2.3'), '版本号不应提取')
  assert(!extractedJson.includes('zh-CN'), 'locale 不应提取')
  assert(!extractedJson.includes('550e8400'), 'UUID 不应提取')
  assert(!extractedJson.includes('image/png'), 'MIME 不应提取')
  assert(!extractedJson.includes('app.home'), 'i18n key 不应提取')
  assert(extractedJson.includes(TEXT.visibleLabel), '普通文案应提取')
}

async function testVueCodePreSubtreeIgnore() {
  const src = `<template>
  <p>${TEXT.visibleText}</p>
  <code>代码块内文案</code>
  <pre>预格式化文案</pre>
  <style>.x { content: '样式内文案'; }</style>
</template>
<script setup></script>`
  const result = await extractVue(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.visibleText), '普通节点应提取')
  assert(!extractedJson.includes('代码块内文案'), 'code 子树不应提取')
  assert(!extractedJson.includes('预格式化文案'), 'pre 子树不应提取')
  assert(!extractedJson.includes('样式内文案'), 'style 子树不应提取')
}

async function testVueAriaAndSlotAttrsIgnore() {
  const src = `<template>
  <div role="button" aria-hidden="true" aria-label="可翻译标签">${TEXT.visibleText}</div>
  <template slot="header">插槽名区域</template>
</template>
<script setup></script>`
  const result = await extractVue(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(!extractedJson.includes('button'), 'role 值不应提取')
  assert(!extractedJson.includes('true'), 'aria-hidden 值不应提取')
  assert(extractedJson.includes('可翻译标签'), 'aria-label 应提取')
  assert(extractedJson.includes(TEXT.visibleText), '文本节点应提取')
}

async function testConsoleIgnoreInJsx() {
  const src = `
    export function Demo() {
      const label = '${TEXT.pageTitle}'
      console.info('${TEXT.debugInfo}')
      return <div>{label}</div>
    }
  `
  const result = await extractJsx(src, 'app')
  const extractedJson = JSON.stringify(result.extracted)

  assert(extractedJson.includes(TEXT.pageTitle), 'JSX 中文案应提取')
  assert(!extractedJson.includes(TEXT.debugInfo), 'console.info 参数不应提取')
}

async function main() {
  await testConsoleIgnoreInJs()
  await testBracketPropIgnore()
  await testCodeExpressionAndSvgIgnore()
  await testVueTemplateCodeIgnore()
  await testIfElseBranchExtraction()
  await testPathLikeIgnore()
  await testTemplateLiteralWithInterpolation()
  await testLoggerIgnore()
  await testCustomLogObjects()
  await testDateTimeFormatIgnore()
  await testVueSvgSubtreeIgnore()
  await testTechnicalStringIgnore()
  await testVueCodePreSubtreeIgnore()
  await testVueAriaAndSlotAttrsIgnore()
  await testConsoleIgnoreInJsx()
  console.log('extractor ignore rules tests passed')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
