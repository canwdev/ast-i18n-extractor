import type {
  Node as EstreeNode,
  Literal,
  TemplateElement,
} from 'estree'
import type { ReplacementItem } from '../replacer'
import type { GenerateEntry, WarningItem } from '../types'
import type { ReplaceValueFn } from '../utils/template-literal-i18n'
import { tsPlugin } from '@sveltejs/acorn-typescript'
import * as acorn from 'acorn'
import { checkKeyNeedExtract, valueNeedExtract } from '../checker'
import { replaceTemplate } from '../replacer'
import {
  getIfStatementChildNodes,
  isErrorConstructor,
  isLiteralNode,
  isReplaceCall,
  isSkippedCallArguments,
  TS_WRAPPER_TYPES,
} from '../utils/ast-nodes'
import { DEFAULT_LOG_OBJECTS, isConsoleCall } from '../utils/console-call'
import { processTemplateLiteralWithExpressions } from '../utils/template-literal-i18n'
import { formatValue } from '../utils/text'

// 扩展 EstreeNode 以包含 start 和 end
type Node = EstreeNode & { start: number, end: number }

export function extractJsLogic(
  jsCode: string,
  replaceValueFn: ReplaceValueFn,
  generateEntry: GenerateEntry,
  logObjects: readonly string[] = DEFAULT_LOG_OBJECTS,
  ignoreValue?: (value: string) => boolean,
) {
  const program: acorn.Program = acorn.Parser.extend(tsPlugin()).parse(jsCode, {
    sourceType: 'module',
    ecmaVersion: 'latest',
    locations: true,
  })

  const replacements: ReplacementItem[] = []
  const textMap: { [key: string]: string } = {}

  const warnings: Array<WarningItem> = []

  const _valueNeedExtractWith = (value: string) => {
    if (ignoreValue?.(value.trim())) {
      return false
    }
    return valueNeedExtract(value, (warn: WarningItem) => {
      warnings.push(warn)
    })
  }

  // 定义获取子节点的函数 acorn.Node
  const getChildNodes = (node: Node): (Node | null | undefined)[] => {
    // TS 类型包裹节点（`as const` / `satisfies` / 非空断言 / 类型断言）只包裹不改语义，
    // 内部表达式仍需继续遍历，否则 `[{ label: '…' }] as const` 会整棵漏抽
    if (TS_WRAPPER_TYPES.has(node.type)) {
      return [(node as unknown as { expression: Node }).expression]
    }
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
        return getIfStatementChildNodes(node as unknown as import('estree').IfStatement) as unknown as Node[]
      case 'FunctionExpression':
      case 'FunctionDeclaration': // 可选：也支持 FunctionDeclaration
        return [...(node.params as Node[] || []), node.body as Node] // 遍历参数和函数体
      case 'ExpressionStatement':
        return [node.expression as Node] // 遍历表达式
      case 'ReturnStatement':
        return node.argument ? [node.argument as Node] : [] // 遍历返回参数（如果存在）
      case 'TemplateLiteral':
        return (node.quasis as Node[]) || [] // 遍历模板字符串
      case 'CallExpression': {
        if (isConsoleCall(node, logObjects))
          return []
        const callee = node.callee as Node
        // .replace(regex, '替换串')：替换串不是文案，跳过参数；对象本身仍可能含文案
        if (isReplaceCall(callee)) {
          const objectNode = (callee as unknown as { object?: Node }).object
          if (!objectNode) {
            return []
          }
          return isLiteralNode(objectNode) ? [] : [objectNode]
        }
        // error() / createError() 的 message 属框架内部错误串
        if (isSkippedCallArguments(callee)) {
          return [callee]
        }
        return [callee, ...(node.arguments as Node[] || [])] // 遍历函数调用的参数
      }
      case 'ConditionalExpression':
        return [node.test as Node, node.consequent as Node, node.alternate as Node] // 遍历条件表达式的各个部分
      case 'MemberExpression':
        return [node.object as Node, node.property as Node] // 遍历对象和属性
      case 'ObjectExpression':
        return (node.properties as Node[]) || [] // 遍历属性
      case 'ArrayExpression':
        return (node.elements as Node[]) || [] // 遍历元素
      case 'Property': {
        // name/id/class/src/... 等配置键的值不是文案（组件名、锚点 id、图片地址）
        const keyNode = node.key as Node
        const keyName = keyNode.type === 'Identifier'
          ? keyNode.name as string
          : isLiteralNode(keyNode) && typeof (keyNode as unknown as { value?: unknown }).value === 'string'
            ? (keyNode as unknown as { value: string }).value
            : ''
        if (keyName && !checkKeyNeedExtract(keyName)) {
          return []
        }
        return [node.key as Node, node.value as Node]
      }
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
      case 'NewExpression': {
        const callee = node.callee as Node
        // new Error('...') / new TypeError('...')
        if (isErrorConstructor(callee)) {
          return [callee]
        }
        return [callee, ...(node.arguments as Node[] || [])]
      }
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

    // 处理 Literal 节点（例如数组中的字符串）
    const isLiteral = node.type === 'Literal' || (node.type as string) === 'StringLiteral'

    if (isLiteral || node.type === 'TemplateElement') {
      const value = isLiteral ? (node as Literal).value : (node as TemplateElement).value.raw

      const text = formatValue(value)
      if (!_valueNeedExtractWith(text)) {
        return
      }
      const entry = generateEntry(text)
      textMap[entry.key] = entry.text ?? text

      const replaceValue = replaceValueFn(entry.key, entry.params)
      if (isLiteral) {
        replacements.push([node.start, node.end, replaceValue])
      }
      else {
        // 移除模板字符串的引号
        replacements.push([node.start - 1, node.end + 1, replaceValue])
      }
    }
    else if (node.type === 'TemplateLiteral') {
      const templateLiteral = node as unknown as import('estree').TemplateLiteral & { start: number, end: number }
      if (templateLiteral.expressions.length > 0) {
        const processed = processTemplateLiteralWithExpressions(templateLiteral, jsCode, {
          formatValue,
          valueNeedExtract: _valueNeedExtractWith,
          generateEntry,
          replaceValueFn,
          textMap,
          replacements,
        })
        if (!processed) {
          const value = templateLiteral.quasis
            .map((quasi: TemplateElement, index: number) => {
              const raw = quasi.value.raw ?? ''
              if (index >= templateLiteral.quasis.length - 1)
                return raw
              return `${raw}{${index}}`
            })
            .join('')
          warnings.push({
            message: '请手动处理模板字符串（包含插值）',
            value,
          })
        }
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
