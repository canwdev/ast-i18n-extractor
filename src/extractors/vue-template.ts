import type { RootNode, SimpleExpressionNode, TemplateChildNode } from '@vue/compiler-core'
import type { ReplacementItem } from '../replacer'
import type { WarningItem } from '../types'
import { NodeTypes } from '@vue/compiler-core'
import { parse } from '@vue/compiler-dom'
import { checkKeyNeedExtract, valueNeedExtract } from '../checker'
import { replaceTemplate } from '../replacer'
import { isSkipSubtreeTag, shouldProcessBindingAsJs } from '../utils/code-detect'
import { formatValue, removeBrackets } from '../utils/text'

export function extractTemplateLogic(
  template: string,
  generateUniqueKey: (text: string) => string,
  extractJs: (code: string, replaceValueFn: (key: string, expressionSources?: string[]) => string, tPrefix?: string) => {
    textMap: { [key: string]: string }
    newTemplate: string
    warnings: WarningItem[]
  },
  tPrefix?: string,
) {
  const ast = parse(template)
  // console.log('template ast', ast)
  const replacements: ReplacementItem[] = []
  let textMap: { [key: string]: string } = {}
  let warnings: WarningItem[] = []
  const prefix = tPrefix || '$t'

  const _valueNeedExtractWith = (value: string) => {
    return valueNeedExtract(value, (warn: WarningItem) => {
      warnings.push(warn)
    })
  }

  const processBindingExpression = (
    value: string,
    loc: { start: { offset: number }, end: { offset: number } },
  ) => {
    if (shouldProcessBindingAsJs(value)) {
      let {
        textMap: _textMap,
        newTemplate: _newTemplate,
        warnings: _warnings,
      } = extractJs(
        `(${value})`,
        (key, expressionSources) => {
          if (expressionSources?.length) {
            return `${prefix}('${key}', [${expressionSources.join(', ')}])`
          }
          return `${prefix}('${key}')`
        },
      )
      _newTemplate = removeBrackets(_newTemplate)
      textMap = { ...textMap, ..._textMap }
      warnings = [...warnings, ..._warnings]
      replacements.push([loc.start.offset, loc.end.offset, _newTemplate])
      return
    }

    const text = formatValue(value)
    if (!_valueNeedExtractWith(text)) {
      return
    }
    const key = generateUniqueKey(text)
    textMap[key] = text
    replacements.push([loc.start.offset, loc.end.offset, `${prefix}('${key}')`])
  }

  // 遍历 AST
  const traverse = (node: RootNode | TemplateChildNode | SimpleExpressionNode) => {
    // console.log('traverse node', node)
    // 节点类型 NodeTypes
    if (node.type === NodeTypes.ELEMENT) {
      // 跳过 svg/code/pre/style 整棵子树
      if (isSkipSubtreeTag(node.tag)) {
        return
      }

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
              `"${prefix}('${key}')"`,
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
              (key, expressionSources) => {
                if (expressionSources?.length) {
                  return `${prefix}('${key}', [${expressionSources.join(', ')}])`
                }
                return `${prefix}('${key}')`
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
            && (prop.name === 'bind' || prop.name === 'on' || prop.name === 'html')
            && prop.exp
            && prop.exp.type === NodeTypes.SIMPLE_EXPRESSION
          ) {
            if (prop.name === 'bind' && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION) {
              const propKey = prop.arg.content
              if (!checkKeyNeedExtract(propKey)) {
                return
              }
            }
            processBindingExpression(prop.exp.content, prop.exp.loc)
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
      replacements.push([node.loc.start.offset, node.loc.end.offset, `{{ ${prefix}('${key}') }}`])
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
