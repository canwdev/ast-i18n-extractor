import { snakeCase } from 'change-case'
import { pinyin } from 'pinyin-pro'

function containsChinese(text: string) {
  const pattern = /[\u4E00-\u9FA5]/
  return pattern.test(text)
}

export function formatI18nKey(val: number | string, replace: string = '_', limitLength: number = -1): string {
  if (typeof val === 'number') {
    return `n${replace}${val}`
  }
  if (!val) {
    return ''
  }
  let str = String(val)
  // 中文转换拼音
  if (containsChinese(str)) {
    try {
      str = pinyin(str, { toneType: 'none', nonZh: 'consecutive' })
    }
    catch (e) {
      console.warn(e)
    }
  }
  // 移除非字母和数字字符
  str = str.replace(/[^\w\s]+/g, '_')
  // 大驼峰转换 ABCDeFg -> abc_de_fg
  str = snakeCase(str)
  if (limitLength > 0) {
    str = str.slice(0, limitLength)
  }
  // 移除首尾的 "_"
  str = str.replace(new RegExp(`${replace}$|^${replace}`, 'g'), '')
  return str
}
