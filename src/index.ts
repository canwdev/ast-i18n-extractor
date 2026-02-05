import type { WarningItem } from './types'
import { set as _set } from 'lodash-es'
import { parseComponent } from 'vue-template-compiler'
import { VueLangExtractor } from './extractor'

function formatValue(value: string) {
  // 处理HTML字符串中的  \n  为空格
  return value.replace(/ *\n */g, ' ')
}

export async function extractJs(src: string, keyPrefix: string) {
  const textMap: { [key: string]: string } = {}
  const vueLangEx = new VueLangExtractor(keyPrefix)
  const result = vueLangEx.extractScript(src)
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
  const parsed = parseComponent(src)
  console.log('[extractVue] parse vue OK')
  const newVueTmplArr: string[] = []
  const textMap: { [key: string]: string } = {}

  const vueLangEx = new VueLangExtractor(keyPrefix)
  const warnings: WarningItem[] = []

  if (parsed.template) {
    const result = vueLangEx.extractTemplate(parsed.template.content)

    // console.log('extract template result', result)
    Object.keys(result.textMap).forEach((key) => {
      _set(textMap, key, formatValue(result.textMap[key] ?? ''))
    })

    newVueTmplArr.push(`<template>${result.newTemplate}</template>`)

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }
  }

  const script = parsed.script?.content
  if (script) {
    const result = vueLangEx.extractScript(script)
    // console.log('extract script result', result)

    Object.keys(result.textMap).forEach((key) => {
      _set(textMap, key, formatValue(result.textMap[key] ?? ''))
    })

    // console.log(result.textMap)
    // console.log(result.newTemplate)
    newVueTmplArr.push(`<script>${result.newTemplate}<\/script>`)

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }
  }

  if (parsed.styles) {
    parsed.styles.forEach((style) => {
      const lang = style.lang ? ` lang="${style.lang}"` : ``
      const scoped = style.scoped ? ` scoped` : ``
      newVueTmplArr.push(`<style${lang}${scoped}>${style.content}</style>`)
    })
  }

  const output = newVueTmplArr.join('\n\n')
  const extracted = textMap

  return {
    output,
    extracted,
    warnings,
  }
}
