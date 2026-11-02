# Agent / 贡献者

用户向说明见 [README.md](./README.md)。CLI 参数见 [.agents/skills/ast-i18n-extractor/SKILL.md](./.agents/skills/ast-i18n-extractor/SKILL.md)（唯一真相）。本文：仓库结构、提取逻辑、维护约定。

## 目录

```
src/
  index.ts              extractJs | extractVue | extractJsx | extractTsx | findExistingI18nKeys
  cli.ts                CLI 入口
  cli/                  args.ts（参数/帮助） discover.ts（文件扫描/忽略） run.ts（编排/写盘）
  checker.ts            valueNeedExtract、属性名过滤
  replacer.ts           按 offset 替换
  find-existing-i18n.ts
  extractors/           js.ts jsx.ts vue-template.ts extractor.ts
  utils/                code-detect console-call template-literal-i18n format-key
                        file-type ignore count sfc text ast-nodes
frontend/src/
  components/           CodeExtractor（示例←test/demo） CodeScanner
  demo/examples.ts      import.meta.glob('../../../test/demo/*') + test/demo-manifest.ts
  i18n/                 index.ts（语言探测 / t / 订阅） locales/{en,zh-CN}.json
  types/                file-system-access.ts（lib.dom 未收录的 FS Access 类型）
test/
  demo/                 集成示例，改此处即同步前端 Example
  demo-manifest.ts      示例清单 + 断言（前端下拉框与 test/test.ts 共用）
  fixtures/text.ts      单测脱敏文案
  console.test.ts       忽略规则
  existing-i18n.test.ts
  cli.test.ts           CLI dry-run / --write / 忽略 / JSON 输出
  test.ts               跑 CLI 校验示例断言并输出 test/output/
```

## 提取链路

AST 遍历 → `valueNeedExtract` 过滤 → 生成 key → `replacer` 写回 → `{ output, extracted, warnings }`

忽略规则实现分散在：`checker.ts`、`code-detect.ts`、`console-call.ts`；Vue/JSX 另跳过整棵 `<svg>`。改规则必改 `test/console.test.ts`。

## 命令（均用 bun）

```bash
bun run type-check    # 改 src 后必过
bun run lint:fix      # 必过
bun run test
bun run build         # lint + type-check + tsup → dist
bun run i18n:frontend # 用工具扫描自身前端，写回 t() 并更新 en.json
bun run i18n:check    # 校验前端 t() key 与 en.json：0 missing / 0 orphan
```

前端：`cd frontend && bun run dev|build`。Windows 勿 `cmd1 && cmd2`，用 `;`。

## 约定

- 禁止 `any`；前端通过 vite alias 引用 `../src/index.ts`，勿重复实现提取
- 文件类型、忽略规则、文案计数只有一份实现（`src/utils/`），CLI 与前端共用
- CLI 参数只在 skill 维护，改参数同步 `src/cli/args.ts` 与 `test/cli.test.ts`
- SFC 解析统一走 `src/utils/sfc.ts`，不要直接引用 `vue-template-compiler` 入口
- **写盘保真**：`extractVue` 用 block 原始内容做局部替换（`src.slice(block.start, block.end)`），不要改回拼接 block 的方案；`parseComponent` 的 `block.content` 对 template/style 做过去缩进，偏移与原文不一致
- **数字变体**：`VueLangExtractor.primeVariants` 把仅末尾数字不同的值合并成 `{0}` 模板；CLI 先扫一遍收值再预置重扫，库 API 不自动预置
- **品牌无关**：工具默认规则不得内置任何公司/产品的品牌名、产品名、技术规格或业务配置；需要过滤时走 `--ignore-value`（项目侧正则）或下游后处理
- **TS 包裹节点**：`as const` / `satisfies` / 非空断言 / 类型断言只包裹表达式，遍历必须深入 `expression`（见 `TS_WRAPPER_TYPES`），否则常量表里的文案会整棵漏抽
- **前端 i18n**：界面文案统一 `t('app.…')`，只改 `frontend/src/i18n/locales/*.json`；品牌名（`AST I18n Extractor`、`GitHub`）、语言名、demo 代码内容不翻译；`i18n/` 目录自身不参与扫描
- 示例/测试文案用 `test/fixtures/text.ts` 脱敏；不提交 `test/output/`、密钥
- **示例即夹具**：`test/demo/` 的文件同时是前端下拉框示例与 CLI 测试输入；增删示例要同步 `test/demo-manifest.ts`（`replaced` / `kept` / `existingKeys` / `expectedMessages`），`test/test.ts` 会逐条断言，别只改文件不加断言
- 发版：根目录 `bun run build` 后发布 `dist`

## 禁止事项（硬约束）

- 禁止在源码、注释、测试、demo、文档、示例、commit 文案中出现**真实公司/产品品牌名、产品名、型号、营销技术规格或业务配置**（例如品牌、型号、分辨率/帧率口号、专有协议名、产品线名称）。
- 需要演示「技术用语过滤」「品牌名过滤」时，一律使用中性占位：`Vendor One`、`Product 2`、`ABC-123`、`1234x567`、`1.5 kg`、`$9.99`。
- 项目专属的品牌/术语词库属于消费方仓库（例如其 skill 目录下的 glossary），通过 `--ignore-value` 传入；**不得复制进本仓库**。
- 「技术术语」指业务/营销/硬件规格术语；编程语言、框架、文件格式、GLSL 关键字等开发术语不受此限。
- 新增/修改示例与测试前先按上述关键词自检；评审发现即视为阻塞。

## Agent

1. 改代码 → `type-check` + `lint:fix` + 相关测试
2. 任务前读 README（API）+ 本文（结构/约定）+ skill（CLI 参数）
