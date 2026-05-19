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
