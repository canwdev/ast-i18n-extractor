# Agent / 贡献者

用户向说明见 [README.md](./README.md)。本文：仓库结构、提取逻辑、维护约定。

## 目录

```
src/
  index.ts              extractJs | extractVue | extractJsx | findExistingI18nKeys
  checker.ts            valueNeedExtract、属性名过滤
  replacer.ts           按 offset 替换
  find-existing-i18n.ts
  extractors/           js.ts jsx.ts vue-template.ts extractor.ts
  utils/                code-detect console-call template-literal-i18n format-key text
frontend/src/
  components/           CodeExtractor（示例←test/demo） CodeScanner
  demo/examples.ts      import.meta.glob('../../../test/demo/*')
test/
  demo/                 集成示例，改此处即同步前端 Example
  fixtures/text.ts      单测脱敏文案
  console.test.ts       忽略规则
  existing-i18n.test.ts
  test.ts               输出 test/output/
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
```

前端：`cd frontend && bun run dev|build`。Windows 勿 `cmd1 && cmd2`，用 `;`。

## 约定

- 禁止 `any`；前端通过 vite alias 引用 `../src/index.ts`，勿重复实现提取
- 示例/测试文案用 `test/fixtures/text.ts` 脱敏；不提交 `test/output/`、密钥
- 发版：根目录 `bun run build` 后发布 `dist`

## Agent

1. 改代码 → `type-check` + `lint:fix` + 相关测试
2. 任务前读 README（API）+ 本文（结构/约定）
