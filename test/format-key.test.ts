import { formatI18nKey } from '../src/utils/format-key'

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

function main() {
  assert(formatI18nKey('绿色') === 'lv_se', '绿色应转为 lv_se')
  assert(formatI18nKey('旅行') === 'lv_xing', '旅行应含 lv')
  console.log('format-key tests passed')
}

main()
