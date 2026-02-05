import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'test',
  ],
  rules: {
    'ts/no-explicit-any': 'error',
    'no-console': 'off',
    'no-debugger': 'off',
    'regexp/no-unused-capturing-group': 'off',
    'unused-imports/no-unused-vars': 'warn',
  },
})
