import type { SFCBlock, SFCDescriptor } from 'vue-template-compiler'
// 直接引用 build 文件：包的入口在能解析到 Vue 3 的 `vue` 时会抛版本不匹配错误。
import { parseComponent } from 'vue-template-compiler/build.js'

export { parseComponent }
export type { SFCBlock, SFCDescriptor }
