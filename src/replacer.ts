export type ReplacementItem = [number, number, string]

export function replaceTemplate(template: string, replacements: ReplacementItem[]) {
  const sorted = [...replacements].sort((a, b) => a[0] - b[0])
  let newTemplate = ''
  let lastIndex = 0
  for (const [start, end, newText] of sorted) {
    newTemplate += template.slice(lastIndex, start) + newText
    lastIndex = end
  }
  newTemplate += template.slice(lastIndex)
  return newTemplate
}
