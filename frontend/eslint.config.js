import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  markdown: false,
  typescript: {
    tsconfigPath: 'tsconfig.app.json',
  },
  ignores: [
    'node_modules',
    'dist',
    'eslint.config.js',
  ],
  rules: {
    'ts/no-explicit-any': 'error',
    'no-console': 'off',
    'no-debugger': 'off',
    'regexp/no-unused-capturing-group': 'off',
    'unused-imports/no-unused-vars': 'warn',
  },
})
