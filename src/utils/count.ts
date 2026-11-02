/** 统计语言包对象中的叶子文案数量 */
export function countExtractedMessages(value: unknown): number {
  if (typeof value === 'string')
    return 1
  if (value === null || typeof value !== 'object')
    return 0
  return Object.values(value as Record<string, unknown>)
    .reduce<number>((total, child) => total + countExtractedMessages(child), 0)
}
