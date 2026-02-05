import type { RootNode, SimpleExpressionNode, TemplateChildNode } from '@vue/compiler-core'
import type {
  Node as EstreeNode,
  ExportDefaultDeclaration,
  Expression,
  ExpressionStatement,
  Literal,
  ObjectExpression,
  Pattern,
  Super,
  TemplateElement,
} from 'estree'
import type { ReplacementItem } from './replacer'
import type { WarningItem } from './types'

import { tsPlugin } from '@sveltejs/acorn-typescript'
import { NodeTypes } from '@vue/compiler-core'
import { parse } from '@vue/compiler-dom'
import * as acorn from 'acorn'
import { checkKeyNeedExtract, valueNeedExtract } from './checker'
import { replaceTemplate } from './replacer'

import { formatI18nKey } from './utils/format-key'

// 扩展 EstreeNode 以包含 start 和 end
type Node = EstreeNode & { start: number, end: number }

function formatValue(str: unknown): string {
  let s: string = typeof str === 'string' ? str : ''
  // 首尾字符必须相同
  if (s.charAt(0) === s.charAt(s.length - 1)) {
    // 移除首尾引号 ` | ' | "
    s = s.replace(/^['"`]+|['"`]+$/g, '')
  }
  return s
}

// 移除首尾括号
function removeBrackets(str: string) {
  return str.replace(/^\(|\)$/g, '')
}

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
      // console.warn('key duplicate fix!', key, this.extractedKeyValues[key], this.extractedKeyValues)
      console.warn('key duplicate fix!', key)
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
    const program: acorn.Program = acorn.Parser.extend(tsPlugin()).parse(jsCode, {
      sourceType: 'module',
      ecmaVersion: 'latest',
      locations: true,
    })
    // console.log('AST parsed', program)
    // debugger

    const replacements: ReplacementItem[] = []
    const textMap: { [key: string]: string } = {}

    const warnings: Array<WarningItem> = []

    const _valueNeedExtractWith = (value: string) => {
      return valueNeedExtract(value, (warn: WarningItem) => {
        warnings.push(warn)
      })
    }

    // 定义获取子节点的函数 acorn.Node
    const getChildNodes = (node: Node): (Node | null | undefined)[] => {
      switch (node.type) {
        case 'Program':
        case 'BlockStatement':
          return (node.body as Node[]) || [] // 遍历 body 数组
        case 'ForStatement':
        case 'ForOfStatement':
        case 'ForInStatement':
          if (node.body.type === 'BlockStatement') {
            return (node.body.body as Node[]) || []
          }
          return [node.body as Node]
        case 'ArrowFunctionExpression':
          if (node.body.type === 'BlockStatement') {
            return (node.body.body as Node[]) || []
          }
          return [node.body as Node]
        case 'IfStatement':
          if (node.consequent.type === 'BlockStatement') {
            return (node.consequent.body as Node[]) || []
          }
          return [node.consequent as Node]
        case 'FunctionExpression':
        case 'FunctionDeclaration': // 可选：也支持 FunctionDeclaration
          return [...(node.params as Node[] || []), node.body as Node] // 遍历参数和函数体
        case 'ExpressionStatement':
          return [node.expression as Node] // 遍历表达式
        case 'ReturnStatement':
          return node.argument ? [node.argument as Node] : [] // 遍历返回参数（如果存在）
        case 'TemplateLiteral':
          return (node.quasis as Node[]) || [] // 遍历模板字符串
        case 'CallExpression':
          return [node.callee as Node, ...(node.arguments as Node[] || [])] // 遍历函数调用的参数
        case 'ConditionalExpression':
          return [node.test as Node, node.consequent as Node, node.alternate as Node] // 遍历条件表达式的各个部分
        case 'MemberExpression':
          return [node.object as Node, node.property as Node] // 遍历对象和属性
        case 'ObjectExpression':
          return (node.properties as Node[]) || [] // 遍历属性
        case 'ArrayExpression':
          return (node.elements as Node[]) || [] // 遍历元素
        case 'Property':
          return [node.key as Node, node.value as Node] // 遍历键和值
        case 'ExportDefaultDeclaration':
        case 'ExportNamedDeclaration':
          return [node.declaration as Node]
        case 'ClassDeclaration':
        case 'ClassExpression':
          return [node.body as Node]
        case 'ClassBody':
          return node.body as Node[]
        case 'MethodDefinition':
          return [node.key as Node, node.value as Node]
        case 'NewExpression':
          return [node.callee as Node, ...(node.arguments as Node[] || [])]
        case 'SwitchStatement':
          return [node.discriminant as Node, ...(node.cases as Node[] || [])]
        case 'SwitchCase':
          return [node.test as Node, ...(node.consequent as Node[] || [])].filter(Boolean) as Node[]
        case 'WhileStatement':
        case 'DoWhileStatement':
          return [node.test as Node, node.body as Node]
        case 'TryStatement':
          return [node.block as Node, node.handler as Node, node.finalizer as Node].filter(Boolean) as Node[]
        case 'CatchClause':
          return [node.param as Node, node.body as Node].filter(Boolean) as Node[]
        case 'ThrowStatement':
        case 'UnaryExpression':
        case 'UpdateExpression':
        case 'AwaitExpression':
        case 'SpreadElement':
        case 'YieldExpression':
          return [node.argument as Node]
        case 'BinaryExpression':
        case 'LogicalExpression':
        case 'AssignmentExpression':
          return [node.left as Node, node.right as Node]
        case 'TSEnumDeclaration':
          return node.members as Node[]
        case 'TSEnumMember':
          return node.initializer ? [node.initializer as Node] : []
        // 可根据需要添加其他节点类型，例如：
        case 'VariableDeclaration':
          return node.declarations as Node[]
        case 'VariableDeclarator':
          return [node.id as Node, node.init as Node].filter(Boolean)
        default:
          return [] // 默认无子节点
      }
    }
    const walk = (node: Node | null | undefined) => {
      if (!node)
        return
      // console.log('walk node', node)
      // 检查是否为目标节点：Property 且 value 为 Literal
      // if (node.type === 'Property' && node.value.type === 'Literal') {
      //   const propKey = node.key.name
      //   const value = node.value.value
      //   console.log('Property/Literal node', propKey, value, node)
      //
      //   if (!checkKeyNeedExtract(propKey)) {
      //     return
      //   }
      //
      //   if (!valueNeedExtract(value)) {
      //     return
      //   }
      //   replacements.push([node.start, node.end, replaceValue])
      // }

      // 处理 Literal 节点（例如数组中的字符串）
      const isLiteral = node.type === 'Literal' || (node.type as string) === 'StringLiteral'

      if (isLiteral || node.type === 'TemplateElement') {
        const value = isLiteral ? (node as Literal).value : (node as TemplateElement).value.raw
        // console.log('Literal/TemplateElement node', {value}, node)

        const text = formatValue(value)
        if (!_valueNeedExtractWith(text)) {
          return
        }
        const key = this.generateUniqueKey(text)
        textMap[key] = text

        const replaceValue = replaceValueFn(key)
        if (isLiteral) {
          replacements.push([node.start, node.end, replaceValue])
        }
        else {
          // 移除模板字符串的引号
          replacements.push([node.start - 1, node.end + 1, replaceValue])
        }
      }
      else if (node.type === 'TemplateLiteral') {
        // console.log('TemplateLiteral node', node)
        const templateLiteral = node as unknown as import('estree').TemplateLiteral
        if (templateLiteral.expressions.length > 0) {
          // 提取文字
          const value = templateLiteral.quasis
            .map((quasi: TemplateElement, index: number) => {
              if (!quasi.value.raw)
                return ''
              return `${quasi.value.raw}{${index}}`
            })
            .join('')
          const text = formatValue(value)
          if (!_valueNeedExtractWith(text)) {
            return
          }
          const exps = templateLiteral.expressions
            .map((exp: Expression | Pattern | Super | null) => {
              if (exp && exp.type === 'MemberExpression') {
                if (exp.property.type === 'Identifier') {
                  return exp.property.name
                }
                return null
              }
              return null
            })
            .filter((item): item is string => !!item)

          const key = this.generateUniqueKey(text)
          textMap[key] = text
          const message = '请手动处理模板字符串（包含插值）'
          // console.warn(message, { node, exps }, { [key]: value })
          warnings.push({
            message,
            value,
            key,
            exps,
          })
          return
        }
      }

      // 递归遍历子节点
      getChildNodes(node as Node).forEach((child) => {
        if (child)
          walk(child) // 确保子节点存在
      })
    }

    walk(program as unknown as Node)

    // console.log('jsAst replacements', replacements)
    const newTemplate = replaceTemplate(jsCode, replacements)

    // console.log('newTemplate', newTemplate)

    return {
      textMap,
      newTemplate,
      warnings,
    }
  }

  // 提取 template 中的文本内容
  extractTemplate(template: string) {
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
              const key = this.generateUniqueKey(text)
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
              } = this.extractJs(
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
                    } = this.extractJs(
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

                  const key = this.generateUniqueKey(text)
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

                const key = this.generateUniqueKey(text)
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
        const key = this.generateUniqueKey(text)
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

  // 提取 script 中的文本内容
  /**
   * 提取 JS/TS 代码中的文本
   * @param code 代码内容
   * @param isSetup 是否为 Setup API (Vue 3 / Composition API)，如果是则使用 $t('')，否则使用 this.$t('')
   */
  extractScript(code: string, isSetup = false) {
    // console.log(template)
    return this.extractJs(code, (key) => {
      return isSetup ? `$t('${key}')` : `this.$t('${key}')`
    })
  }
}
