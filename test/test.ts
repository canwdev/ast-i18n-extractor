import fs from 'node:fs'
import path from 'node:path'
import { extractJs, extractVue } from '../src/index'

const basePath = __dirname

async function test(inputFilePath: string, keyPrefix = 'i18n_lang') {
  const src = fs.readFileSync(inputFilePath, 'utf-8')

  const name = path.basename(inputFilePath, path.extname(inputFilePath))
  const ext = path.extname(inputFilePath)
  console.log('inputFilePath', inputFilePath)
  console.log('keyPrefix', keyPrefix)

  let result
  if (ext === '.vue') {
    result = await extractVue(src, keyPrefix)
  }
  else if (ext === '.js' || ext === '.ts') {
    result = await extractJs(src, keyPrefix)
  }
  else {
    console.log('unsupported file type', ext)
    return
  }

  const outDir = path.join(basePath, './output')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }
  if (result) {
    fs.writeFileSync(path.join(outDir, `${name}-out${ext}`), result.output)
    fs.writeFileSync(path.join(outDir, `${name}-lang.json`), JSON.stringify(result.extracted, null, 2))
    fs.writeFileSync(path.join(outDir, `${name}-warnings.json`), JSON.stringify(result.warnings, null, 2))
    console.log(`OK, ${result.warnings.length} warnings, file output to ${outDir}`)
    console.log('------')
  }
}

async function main() {
  await test(path.join(basePath, './demo/vue2.vue'))
  await test(path.join(basePath, './demo/demo-js.js'))
  await test(path.join(basePath, './demo/vue3.vue'))
  await test(path.join(basePath, './demo/demo-ts.ts'))
}
main()
