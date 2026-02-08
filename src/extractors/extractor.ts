import { formatI18nKey } from '../utils/format-key'
import { extractJsLogic } from './js'
import { extractJsxLogic } from './jsx'
import { extractTemplateLogic } from './vue-template'

export class VueLangExtractor {
  // 已提取的 key，用来防止重复
  private extractedKeyValues: { [key: string]: number }

  // text -> key map
  private extractedTextValues: { [text: string]: string }
  public keyPrefix: string

  constructor(keyPrefix = '') {
    this.keyPrefix = keyPrefix || ''
    this.extractedTextValues = {}
    this.extractedKeyValues = {}
  }

  generateUniqueKey(value: string) {
    if (this.extractedTextValues[value]) {
      return this.extractedTextValues[value]
    }
    let key = formatI18nKey(value, '_', 32)
    if (this.extractedKeyValues[key]) {
      // console.warn('key duplicate fixed', key, this.extractedKeyValues[key], this.extractedKeyValues)
      console.warn('key duplicate fixed', key)
      this.extractedKeyValues[key]!++
      key = `${key}_${this.extractedKeyValues[key]}`
    }
    else {
      // console.log('key set', key)
      this.extractedKeyValues[key] = 1
    }
    key = this.keyPrefix ? `${this.keyPrefix}.${key}` : key

    // console.log('extractedKeyValues', this.extractedKeyValues)
    this.extractedTextValues[value] = key
    return key
  }

  extractJs(jsCode: string, replaceValueFn: (value: string) => string) {
    return extractJsLogic(jsCode, replaceValueFn, this.generateUniqueKey.bind(this))
  }

  extractJsx(jsCode: string, replaceValueFn: (value: string) => string) {
    return extractJsxLogic(jsCode, replaceValueFn, this.generateUniqueKey.bind(this))
  }

  // 提取 template 中的文本内容
  extractTemplate(template: string, tPrefix?: string) {
    return extractTemplateLogic(
      template,
      this.generateUniqueKey.bind(this),
      this.extractJs.bind(this),
      tPrefix,
    )
  }

  // 提取 script 中的文本内容
  /**
   * 提取 JS/TS 代码中的文本
   * @param code 代码内容
   * @param prefix 替换的前缀，默认为 this.$t
   */
  extractScript(code: string, prefix = 'this.$t') {
    // console.log(template)
    return this.extractJs(code, (key) => {
      return `${prefix}('${key}')`
    })
  }

  /**
   * 提取 JSX/TSX 代码中的文本
   * @param code 代码内容
   * @param prefix 替换的前缀，默认为 t
   */
  extractJsxScript(code: string, prefix = 't') {
    return this.extractJsx(code, (key) => {
      return `${prefix}('${key}')`
    })
  }
}
