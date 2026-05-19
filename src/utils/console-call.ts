import type { CallExpression } from 'estree'

/** 是否为 console.xxx(...) 调用，用于跳过调试日志中的文案提取 */
export function isConsoleCall(node: { type: string }): boolean {
  if (node.type !== 'CallExpression')
    return false

  const { callee } = node as CallExpression
  if (callee.type !== 'MemberExpression' || callee.computed)
    return false

  const { object, property } = callee
  return object.type === 'Identifier'
    && object.name === 'console'
    && property.type === 'Identifier'
}
