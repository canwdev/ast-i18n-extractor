import { findExistingI18nKeys } from '../src/find-existing-i18n'

function assert(condition: boolean, message: string) {
  if (!condition)
    throw new Error(message)
}

function testFindDollarT() {
  const src = `
    this.$t('app.foo')
    $t('app.bar', [x])
    window.$toast.info($t('app.baz'))
  `
  const keys = findExistingI18nKeys(src)
  assert(keys.length === 3, '应找到 3 个 $t 键')
  assert(keys.includes('app.foo'), '应包含 app.foo')
  assert(keys.includes('app.bar'), '应包含 app.bar')
  assert(keys.includes('app.baz'), '应包含 app.baz')
}

function testFindT() {
  const src = `
    const { t } = useI18n()
    return t('jsx.hello')
  `
  const keys = findExistingI18nKeys(src)
  assert(keys.length === 1, '应找到 1 个 t 键')
  assert(keys[0] === 'jsx.hello', '应包含 jsx.hello')
}

function testDedupeAndSort() {
  const src = `
    $t('app.z_key')
    $t('app.a_key')
    $t('app.z_key')
  `
  const keys = findExistingI18nKeys(src)
  assert(keys.length === 2, '应去重')
  assert(keys[0] === 'app.a_key', '应排序')
  assert(keys[1] === 'app.z_key', '应排序')
}

function testVueTemplate() {
  const src = `<template>
  <span>{{ $t('app.title') }}</span>
  <button :title="$t('app.btn')">x</button>
</template>`
  const keys = findExistingI18nKeys(src)
  assert(keys.includes('app.title'), '模板中的 $t 应识别')
  assert(keys.includes('app.btn'), '绑定中的 $t 应识别')
}

function testIgnorePlainStrings() {
  const src = `
    const msg = '示例文案'
    console.log('debug')
  `
  const keys = findExistingI18nKeys(src)
  assert(keys.length === 0, '普通字符串不应识别为 i18n')
}

function main() {
  testFindDollarT()
  testFindT()
  testDedupeAndSort()
  testVueTemplate()
  testIgnorePlainStrings()
  console.log('existing i18n tests passed')
}

main()
