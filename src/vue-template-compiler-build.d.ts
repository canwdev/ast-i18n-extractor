declare module 'vue-template-compiler/build.js' {
  import type { parseComponent as ParseComponent } from 'vue-template-compiler'

  export const parseComponent: typeof ParseComponent
}
