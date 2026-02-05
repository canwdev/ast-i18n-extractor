# AST i18n Extractor

这是一个基于 AST (抽象语法树) 的自动化国际化 (i18n) 提取工具。它可以自动识别 Vue、JavaScript 和 TypeScript 文件中的中文文案，将其提取为 i18n 键值对，并自动替换源代码中的文本。

## 项目架构

本项目主要由以下几个核心模块组成：

1.  **Parser (解析器)**:
    -   使用 `acorn` 和 `@sveltejs/acorn-typescript` 解析 JavaScript 和 TypeScript 代码为 ESTree 兼容的 AST。
    -   使用 `vue-template-compiler` (Vue 2) 和 `@vue/compiler-core` (Vue 3) 解析 Vue 单文件组件。

2.  **Extractor (提取器)**:
    -   `VueLangExtractor` (`src/extractor.ts`) 是核心类，负责遍历 AST。
    -   识别模板中的文本节点、属性值以及脚本中的字符串字面量。

3.  **Checker (校验器)**:
    -   `src/checker.ts` 负责判断一段文本是否需要提取。
    -   排除规则包括：纯数字、代码变量名（驼峰命名）、URL、HTML 属性（如 `id`, `class`）等。
    -   支持识别包含非 ASCII 字符（如中文）的文本作为提取目标。

4.  **Key Generator (键名生成器)**:
    -   `src/utils/format-key.ts` 负责生成唯一的 i18n key。
    -   使用 `pinyin-pro` 将中文转换为拼音。
    -   使用 `change-case` 将生成的字符串转换为 snake_case (下划线命名)。

5.  **Replacer (替换器)**:
    -   基于 AST 节点的位置信息，对源代码进行精确的字符串替换。

## 工作原理

1.  **读取源码**: 读取 `.vue`, `.js`, `.ts` 文件内容。
2.  **生成 AST**: 根据文件类型调用相应的解析器生成抽象语法树。
3.  **遍历与筛选**: 遍历 AST 节点，查找所有的字符串字面量和模板文本。调用 Checker 判断是否包含可翻译内容（如中文）。
4.  **生成 Key**: 对需要提取的文本，自动生成基于拼音或英文的 Key (例如: `测试` -> `ce_shi`)，并去重处理。
5.  **替换源码**: 将源码中的文本替换为 i18n 调用形式 (例如: `'测试'` -> `t('ce_shi')`)。
6.  **输出结果**:
    -   生成的语言包 JSON 文件 (`key`: `value`)。
    -   替换后的源代码文件。
    -   提取过程中的警告信息（如包含复杂表达式的文本）。

## 测试方法

项目使用 `bun` 作为运行时和测试执行器。

### 运行测试

测试脚本位于 `test/test.ts`，它会处理 `test/demo/` 目录下的示例文件。

```bash
npm test
# 或者
bun run test
```

### 查看结果

测试运行完成后，结果会输出到 `test/output/` 目录：

-   `*-out.vue/js/ts`: 替换后的源代码文件。
-   `*-lang.json`: 提取出的语言包文件。
-   `*-warnings.json`: 提取过程中的警告日志。

你可以通过对比 `test/demo/` 中的源文件和 `test/output/` 中的输出文件来验证提取逻辑的正确性。
