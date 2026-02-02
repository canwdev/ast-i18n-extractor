
import fs from 'node:fs'
import path from 'node:path'
import { extractVue } from '../src'

const main = async () => {
  const basePath = __dirname
  const inputFilePath = path.join(basePath, './demo/vue2.vue')
  const keyPrefix = 'test_page'
  const src = fs.readFileSync(inputFilePath, 'utf-8')

  console.log('inputFilePath', inputFilePath)
  console.log('keyPrefix', keyPrefix)

  const result = await extractVue(src, keyPrefix)
  const outDir = path.join(basePath, './output')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }
  if (result) {
    fs.writeFileSync(path.join(outDir, './vue2.vue'), result.output)
    fs.writeFileSync(path.join(outDir, './vue2-lang.json'), result.extracted)
    fs.writeFileSync(path.join(outDir, './vue2-warnings.json'), JSON.stringify(result.warnings, null, 2))
    console.log(`OK, ${result.warnings.length} warnings, file output to ${outDir}`)
  }
}
main()