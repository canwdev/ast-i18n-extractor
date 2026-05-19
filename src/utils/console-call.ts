import type { CallExpression } from 'estree'

/** 默认跳过的日志对象名（obj.method(...)） */
export const DEFAULT_LOG_OBJECTS = ['console', 'logger'] as const

export type LogObjectName = string

/** 是否为日志类成员调用，如 console.log(...)、logger.warn(...) */
export function isConsoleCall(
  node: { type: string },
  logObjects: readonly LogObjectName[] = DEFAULT_LOG_OBJECTS,
): boolean {
  if (node.type !== 'CallExpression')
    return false

  const { callee } = node as CallExpression
  if (callee.type !== 'MemberExpression' || callee.computed)
    return false

  const { object, property } = callee
  if (object.type !== 'Identifier' || !logObjects.includes(object.name))
    return false

  return property.type === 'Identifier'
}
