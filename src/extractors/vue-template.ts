import type { RootNode, SimpleExpressionNode, TemplateChildNode } from '@vue/compiler-core'
import type { ReplacementItem } from '../replacer'
import type { WarningItem } from '../types'
import { NodeTypes } from '@vue/compiler-core'
import { parse } from '@vue/compiler-dom'
import { checkKeyNeedExtract, valueNeedExtract } from '../checker'
import { replaceTemplate } from '../replacer'
import { formatValue, removeBrackets } from '../utils/text'

export function extractTemplateLogic(
  template: string,
  generateUniqueKey: (text: string) => string,
  extractJs: (code: string, replaceValueFn: (key: string) => string) => {
    textMap: { [key: string]: string }
    newTemplate: string
    warnings: WarningItem[]
  },
) {
  const ast = parse(template)
  // console.log('template ast', ast)
  const replacements: ReplacementItem[] = []
  let textMap: { [key: string]: string } = {}
  let warnings: WarningItem[] = []

  const _valueNeedExtractWith = (value: string) => {
    return valueNeedExtract(value, (warn: WarningItem) => {
      warnings.push(warn)
    })
  }

  // 遍历 AST
  const traverse = (node: RootNode | TemplateChildNode | SimpleExpressionNode) => {
    // console.log('traverse node', node)
    // 节点类型 NodeTypes
    if (node.type === NodeTypes.ELEMENT) {
      // Node.ELEMENT 类型 (元素节点)
      // console.log('ELEMENT node', node)

      if (node.props) {
        node.props.forEach((prop) => {
          // console.log('prop', prop)

          if (prop.type === NodeTypes.ATTRIBUTE) {
            // console.log('ATTRIBUTE prop', prop)

            const propKey = prop.name
            if (!checkKeyNeedExtract(propKey)) {
              return
            }
            if (!prop.value) {
              return
            }
            const value = prop.value.content
            const text = formatValue(value)
            if (!_valueNeedExtractWith(text)) {
              return
            }
            const key = generateUniqueKey(text)
            textMap[key] = text
            replacements.push([
              prop.value.loc.start.offset,
              prop.value.loc.end.offset,
              `"$t('${key}')"`,
            ])
            // label -> :label
            replacements.push([
              prop.nameLoc.start.offset,
              prop.nameLoc.end.offset,
              `:${prop.nameLoc.source}`,
            ])
          }
          else if (
            prop.type === NodeTypes.DIRECTIVE
            && prop.name === 'for'
            && prop.forParseResult
          ) {
            // console.log('DIRECTIVE v-for prop', prop)
            const { source } = prop.forParseResult

            if (source.type !== NodeTypes.SIMPLE_EXPRESSION) {
              return
            }

            let {
              textMap: _textMap,
              newTemplate: _newTemplate,
              warnings: _warnings,
            } = extractJs(
              // 给 value 加括号，避免解析错误
              `(${source.content})`,
              (key) => {
                return `$t('${key}')`
              },
            )

            // 移除首尾括号
            _newTemplate = removeBrackets(_newTemplate)

            textMap = {
              ...textMap,
              ..._textMap,
            }
            warnings = [...warnings, ..._warnings]

            replacements.push([source.loc.start.offset, source.loc.end.offset, _newTemplate])
          }
          else if (
            prop.type === NodeTypes.DIRECTIVE
            && (prop.name === 'bind' || prop.name === 'html')
          ) {
            // console.log('DIRECTIVE prop', prop)
            // Node.DIRECTIVE 类型且 name 为 "bind"
            if (prop.arg && prop.arg.type === NodeTypes.SIMPLE_EXPRESSION) {
              // Node.SIMPLE_EXPRESSION 类型 (静态参数)
              const propKey = prop.arg.content
              if (prop.exp && prop.exp.type === NodeTypes.SIMPLE_EXPRESSION) {
                // Node.SIMPLE_EXPRESSION 类型 (静态值)
                const value = prop.exp.content

                if (!checkKeyNeedExtract(propKey)) {
                  return
                }

                // 检测是否以 { 或 [ 开头
                if (/^\{|\[/.test(value)) {
                  // console.warn('检测到对象或数组，需要进一步处理', value)

                  let {
                    textMap: _textMap,
                    newTemplate: _newTemplate,
                    warnings: _warnings,
                  } = extractJs(
                    // 给 value 加括号，避免解析错误
                    `(${value})`,
                    (key) => {
                      return `$t('${key}')`
                    },
                  )

                  // 移除首尾括号
                  _newTemplate = removeBrackets(_newTemplate)

                  textMap = {
                    ...textMap,
                    ..._textMap,
                  }
                  warnings = [...warnings, ..._warnings]

                  replacements.push([
                    prop.exp.loc.start.offset,
                    prop.exp.loc.end.offset,
                    _newTemplate,
                  ])

                  return
                }
                // console.log('prop KV', {propKey, value}, prop)

                const text = formatValue(value)

                if (!_valueNeedExtractWith(text)) {
                  return
                }

                const key = generateUniqueKey(text)
                textMap[key] = text

                replacements.push([
                  prop.exp.loc.start.offset,
                  prop.exp.loc.end.offset,
                  `$t('${key}')`,
                ])
              }
            }
            else if (
              prop.name === 'html'
              && prop.exp
              && prop.exp.type === NodeTypes.SIMPLE_EXPRESSION
            ) {
              // 处理 v-html 内容
              const value = prop.exp.content
              const text = formatValue(value)
              if (!_valueNeedExtractWith(text)) {
                return
              }

              const key = generateUniqueKey(text)
              textMap[key] = text
              replacements.push([
                prop.exp.loc.start.offset,
                prop.exp.loc.end.offset,
                `$t('${key}')`,
              ])
            }
          }
        })
      }
    }
    else if (node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION) {
      let value = ''
      if (node.type === NodeTypes.TEXT) {
        // console.log('TEXT node', node)
        // Node.TEXT 类型 (文本节点)
        value = node.content || ''
      }
      else if (node.type === NodeTypes.INTERPOLATION) {
        // console.log('INTERPOLATION node', node)
        // Node.INTERPOLATION 类型 (插值节点)
        value = node.content.loc.source
      }

      const text = formatValue(value)
      if (!_valueNeedExtractWith(text)) {
        return
      }
      const key = generateUniqueKey(text)
      textMap[key] = text.trim()
      replacements.push([node.loc.start.offset, node.loc.end.offset, `{{ $t('${key}') }}`])
    }
    if ('children' in node) {
      for (const child of node.children) {
        if (typeof child === 'object' && child) {
          traverse(child)
        }
      }
    }
  }

  traverse(ast)

  // 构建新 template
  replacements.sort((a, b) => a[0] - b[0]) // 确保按位置顺序
  const newTemplate = replaceTemplate(template, replacements)

  return { textMap, newTemplate, warnings }
}
