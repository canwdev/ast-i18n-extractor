import type {
  Expression,
  Literal,
  Pattern,
  Super,
  TemplateElement,
} from 'estree'
import type { ReplacementItem } from '../replacer'
import type { WarningItem } from '../types'
import { tsPlugin } from '@sveltejs/acorn-typescript'
import * as acorn from 'acorn'
import jsx from 'acorn-jsx'
import { valueNeedExtract } from '../checker'
import { replaceTemplate } from '../replacer'
import { formatValue } from '../utils/text'

// 扩展 EstreeNode 以包含 start 和 end 以及 JSX 类型
interface Node {
  type: string
  start: number
  end: number
  // eslint-disable-next-line ts/no-explicit-any
  [key: string]: any
}

export function extractJsxLogic(
  jsCode: string,
  replaceValueFn: (key: string) => string,
  generateUniqueKey: (text: string) => string,
) {
  const program: acorn.Program = acorn.Parser.extend(tsPlugin(), jsx()).parse(jsCode, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    locations: true,
  })

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
        return (node.body as Node[]) || []
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
      case 'FunctionDeclaration':
        return [...(node.params as Node[] || []), node.body as Node]
      case 'ExpressionStatement':
        return [node.expression as Node]
      case 'ReturnStatement':
        return node.argument ? [node.argument as Node] : []
      case 'TemplateLiteral':
        return (node.quasis as Node[]) || []
      case 'CallExpression':
        return [node.callee as Node, ...(node.arguments as Node[] || [])]
      case 'ConditionalExpression':
        return [node.test as Node, node.consequent as Node, node.alternate as Node]
      case 'MemberExpression':
        return [node.object as Node, node.property as Node]
      case 'ObjectExpression':
        return (node.properties as Node[]) || []
      case 'ArrayExpression':
        return (node.elements as Node[]) || []
      case 'Property':
        return [node.key as Node, node.value as Node]
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
      case 'VariableDeclaration':
        return node.declarations as Node[]
      case 'VariableDeclarator':
        return [node.id as Node, node.init as Node].filter(Boolean)

      // JSX Support
      case 'JSXElement':
      case 'JSXFragment':
        return [
          node.openingElement || node.openingFragment,
          ...(node.children || []),
          node.closingElement || node.closingFragment,
        ].filter(Boolean)
      case 'JSXExpressionContainer':
        return [node.expression as Node]
      case 'JSXSpreadAttribute':
        return [node.argument as Node]
      case 'JSXOpeningElement':
        return node.attributes as Node[]
      case 'JSXAttribute':
        // Handle value specially in walk to detect Literal values
        return node.value ? [node.value as Node] : []

      default:
        return []
    }
  }

  const walk = (node: Node | null | undefined) => {
    if (!node)
      return

    // 处理 JSXText
    if (node.type === 'JSXText') {
      const value = node.value
      const text = formatValue(value)
      if (!_valueNeedExtractWith(text)) {
        return
      }
      const key = generateUniqueKey(text)
      textMap[key] = text

      const replaceValue = replaceValueFn(key)
      // JSXText needs to be wrapped in {}
      replacements.push([node.start, node.end, `{${replaceValue}}`])
      return
    }

    // 处理 JSXAttribute 的 Literal 值
    if (node.type === 'JSXAttribute' && node.value && node.value.type === 'Literal') {
      const literal = node.value as Literal & { start: number, end: number }
      const value = literal.value as string

      if (typeof value !== 'string')
        return

      const text = formatValue(value)
      if (!_valueNeedExtractWith(text)) {
        return
      }
      const key = generateUniqueKey(text)
      textMap[key] = text

      const replaceValue = replaceValueFn(key)
      // JSXAttribute value needs to be wrapped in {}
      replacements.push([literal.start, literal.end, `{${replaceValue}}`])
      return
    }

    // 处理 Literal 节点（例如数组中的字符串）
    // 注意：JSXAttribute 的 Literal 已经在上面处理了，这里处理其他的 Literal
    const isLiteral = node.type === 'Literal' || (node.type as string) === 'StringLiteral'

    if (isLiteral || node.type === 'TemplateElement') {
      const value = isLiteral ? (node as unknown as Literal).value : (node as unknown as TemplateElement).value.raw

      // Skip if not string
      if (typeof value !== 'string')
        return

      const text = formatValue(value)
      if (!_valueNeedExtractWith(text)) {
        return
      }
      const key = generateUniqueKey(text)
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

        const key = generateUniqueKey(text)
        textMap[key] = text
        const message = '请手动处理模板字符串（包含插值）'
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

  const newTemplate = replaceTemplate(jsCode, replacements)

  return {
    textMap,
    newTemplate,
    warnings,
  }
}
