import type { BlockStatement, IfStatement, Statement } from 'estree'

interface Node { type: string, [key: string]: unknown }

function flattenStatement(stmt: Statement): Node[] {
  if (stmt.type === 'BlockStatement') {
    return (stmt as BlockStatement).body as Node[]
  }
  return [stmt as Node]
}

/** IfStatement 需遍历 consequent 与 alternate（else）分支 */
export function getIfStatementChildNodes(node: IfStatement): Node[] {
  const children: Node[] = [node.test as Node]
  children.push(...flattenStatement(node.consequent))
  if (node.alternate) {
    children.push(...flattenStatement(node.alternate))
  }
  return children
}

function asRecord(node: unknown): Record<string, unknown> | null {
  return node !== null && typeof node === 'object' ? node as Record<string, unknown> : null
}

/** Literal / StringLiteral 判断（JS 与 TS AST 通用） */
export function isLiteralNode(node: unknown): boolean {
  const record = asRecord(node)
  return record?.type === 'Literal' || record?.type === 'StringLiteral'
}

/** ".replace(...)" / ".replaceAll(...)" 调用：替换串不是文案 */
export function isReplaceCall(callee: unknown): boolean {
  const record = asRecord(callee)
  if (record?.type !== 'MemberExpression') {
    return false
  }
  const property = asRecord(record.property)
  return property?.type === 'Identifier'
    && (property.name === 'replace' || property.name === 'replaceAll')
}

/** 框架错误构造：error({...}) / createError({...})，参数里的 message 不是页面文案 */
export function isSkippedCallArguments(callee: unknown): boolean {
  const record = asRecord(callee)
  if (record?.type !== 'Identifier') {
    return false
  }
  return record.name === 'error' || record.name === 'createError'
}

/** new Error('...') / new TypeError('...') */
export function isErrorConstructor(callee: unknown): boolean {
  const record = asRecord(callee)
  if (record?.type !== 'Identifier' || typeof record.name !== 'string') {
    return false
  }
  return record.name === 'Error' || record.name.endsWith('Error')
}
