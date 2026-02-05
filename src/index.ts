import type { SFCBlock, SFCDescriptor } from 'vue-template-compiler'
import type { WarningItem } from './types'
import { set as _set } from 'lodash-es'
import { parseComponent } from 'vue-template-compiler'

import { valueNeedExtract } from './checker'
import { VueLangExtractor } from './extractors/extractor'
import { formatI18nKey } from './utils/format-key'

function formatValue(value: string) {
  // 处理HTML字符串中的  \n  为空格
  return value.replace(/ *\n */g, ' ')
}

export async function extractJs(src: string, keyPrefix: string, type: 'js' | 'ts' = 'js') {
  const textMap: { [key: string]: string } = {}
  const vueLangEx = new VueLangExtractor(keyPrefix)
  // 如果是 ts 文件，假设使用 setup 语法，生成的代码不带 this
  const isSetup = type === 'ts'
  const result = vueLangEx.extractScript(src, isSetup)
  Object.keys(result.textMap).forEach((key) => {
    _set(textMap, key, formatValue(result.textMap[key] ?? ''))
  })
  return {
    output: result.newTemplate,
    extracted: textMap,
    warnings: result.warnings,
  }
}

export async function extractVue(src: string, keyPrefix: string) {
  const parsed = parseComponent(src) as SFCDescriptor & { scriptSetup?: SFCBlock }
  console.log('[extractVue] parse vue OK')
  const newVueTmplArr: string[] = []
  const textMap: { [key: string]: string } = {}

  const vueLangEx = new VueLangExtractor(keyPrefix)
  const warnings: WarningItem[] = []

  // Script 处理函数
  const processScript = (scriptBlock: SFCBlock, isSetupBlock: boolean) => {
    const content = scriptBlock.content
    const lang = scriptBlock.lang
    const isTs = lang === 'ts' || lang === 'tsx'
    // 如果是 setup 块，或者用户指定 TS 都是 setup
    const isSetup = isSetupBlock || isTs

    const result = vueLangEx.extractScript(content, isSetup)

    Object.keys(result.textMap).forEach((key) => {
      _set(textMap, key, formatValue(result.textMap[key] ?? ''))
    })

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }

    const langAttr = lang ? ` lang="${lang}"` : ''
    const setupAttr = isSetupBlock ? ' setup' : ''

    return `<script${setupAttr}${langAttr}>${result.newTemplate}</script>`
  }

  // 1. 处理 Script (普通)
  if (parsed.script) {
    newVueTmplArr.push(processScript(parsed.script, false))
  }

  // 2. 处理 Script Setup
  if (parsed.scriptSetup) {
    newVueTmplArr.push(processScript(parsed.scriptSetup, true))
  }

  // 3. 处理 Template (注意顺序，通常 template 在 script 之后或之前，这里统一放到 script 后面或者按原顺序？)
  // 简单的做法是按某种固定顺序，或者看 SFCBlock 的 start/end 排序。
  // 为了简单，我们遵循一般的 Vue SFC 风格：Script -> Template -> Style
  // 但是原代码是先 Template 后 Script。
  // 我们可以先收集所有 block，然后按 start 位置排序。

  const blocks: { start: number, content: string }[] = []

  if (parsed.script) {
    blocks.push({
      start: parsed.script.start!,
      content: processScript(parsed.script, false),
    })
  }

  if (parsed.scriptSetup) {
    blocks.push({
      start: parsed.scriptSetup.start!,
      content: processScript(parsed.scriptSetup, true),
    })
  }

  if (parsed.template) {
    const result = vueLangEx.extractTemplate(parsed.template.content)
    Object.keys(result.textMap).forEach((key) => {
      _set(textMap, key, formatValue(result.textMap[key] ?? ''))
    })
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }
    blocks.push({
      start: parsed.template.start!,
      content: `<template>${result.newTemplate}</template>`,
    })
  }

  if (parsed.styles) {
    parsed.styles.forEach((style: SFCBlock) => {
      const lang = style.lang ? ` lang="${style.lang}"` : ``
      const scoped = style.scoped ? ` scoped` : ``
      blocks.push({
        start: style.start!,
        content: `<style${lang}${scoped}>${style.content}</style>`,
      })
    })
  }

  // 按原文件出现顺序排序
  blocks.sort((a, b) => a.start - b.start)

  const output = blocks.map(b => b.content).join('\n\n')
  const extracted = textMap

  return {
    output,
    extracted,
    warnings,
  }
}

// export common functions
export { formatI18nKey, valueNeedExtract, VueLangExtractor }
