import { parseComponent } from 'vue-template-compiler'
import { VueLangExtractor } from '../src/extractor'
import _set from 'lodash-es/set'

const formatValue = (value: string) => {
  // 处理HTML字符串中的  \n  为空格
  return value.replace(/ *\n */g, ' ')
}

export const extractVue = async (src: string, keyPrefix: string) => {
  try {
    const parsed = parseComponent(src)
    console.log('[extractVue] parse vue OK')
    const newVueTmplArr: string[] = []
    let textMap: { [key: string]: string } = {}

    const vueLangEx = new VueLangExtractor(keyPrefix)
    const warnings: any[] = []

    if (parsed.template) {
      const result = vueLangEx.extractTemplate(parsed.template.content)

      // console.log('extract template result', result)
      Object.keys(result.textMap).forEach((key) => {
        _set(textMap, key, formatValue(result.textMap[key]))
      })

      newVueTmplArr.push(`<template>${result.newTemplate}</template>`)

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings)
      }
    }

    try {
      let script = parsed.script?.content || parsed.scriptSetup?.content
      if (script) {
        const result = vueLangEx.extractScript(script)
        // console.log('extract script result', result)

        Object.keys(result.textMap).forEach((key) => {
          _set(textMap, key, formatValue(result.textMap[key]))
        })

        // console.log(result.textMap)
        // console.log(result.newTemplate)
        newVueTmplArr.push(`<script>${result.newTemplate}<\/script>`)

        if (result.warnings.length > 0) {
          warnings.push(...result.warnings)
        }
      }
    } catch (e) {
      console.error('[extractVue] extract script error', e)
    }

    if (parsed.styles) {
      parsed.styles.forEach((style) => {
        const lang = style.lang ? ` lang="${style.lang}"` : ``
        const scoped = style.scoped ? ` scoped` : ``
        newVueTmplArr.push(`<style${lang}${scoped}>${style.content}</style>`)
      })
    }

    const output = newVueTmplArr.join('\n\n')
    const extracted = JSON.stringify(textMap, null, 2)

    return {
      output,
      extracted,
      warnings
    }
  } catch (e: any) {
    console.error('[extractVue] parse error', e)
  }
}